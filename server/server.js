const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cors({ origin: "http://localhost:5174", credentials: true }));

// Upload directory setup
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const mimeType = allowedTypes.test(file.mimetype);
  const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  if (mimeType && extName) cb(null, true);
  else cb(new Error("Only .jpg, .png, or .pdf files are allowed!"));
};
const upload = multer({ storage, fileFilter });

app.use('/uploads', express.static(uploadDir));

// In-memory storage
const users = {};
const messages = []; // store all messages
const typingUsers = {};
const rooms = ["General", "Tech", "Random"]; // default rooms

const io = new Server(server, {
  cors: { origin: "http://localhost:5174", methods: ["GET","POST"], credentials: true }
});

io.on('connection', (socket) => {
  console.log("🟢 Client connected:", socket.id);

  // User joins
  socket.on('user_join', (username) => {
    users[socket.id] = { username, id: socket.id, room: "General" };
    socket.join("General");
    socket.emit('room_list', rooms);
    io.emit('user_list', Object.values(users));
    io.emit('user_joined', { username, id: socket.id });
  });

  // Join room
  socket.on('join_room', (roomName) => {
    const user = users[socket.id];
    if (!user) return;
    const oldRoom = user.room;
    socket.leave(oldRoom);
    socket.join(roomName);
    user.room = roomName;
    socket.emit('room_joined', roomName);
    io.to(roomName).emit('room_notification', `${user.username} joined ${roomName}`);
  });

  // Send message
  socket.on('send_message', (data) => {
    const user = users[socket.id];
    if (!user) return;

    const msg = {
      id: Date.now(),
      sender: user.username,
      senderId: socket.id,
      message: data.message,
      room: user.room,
      timestamp: new Date().toISOString(),
      reactions: {},
      readBy: [user.username],
    };
    messages.push(msg);
    io.to(user.room).emit('receive_message', msg);
    socket.emit('message_delivered', msg.id); // delivery ack
  });

  // Mark message as read
  socket.on('message_read', (messageId) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;
    const user = users[socket.id];
    if (!user) return;
    if (!msg.readBy.includes(user.username)) msg.readBy.push(user.username);
    io.to(msg.room || socket.id).emit('update_read', { messageId, readBy: msg.readBy });
  });

  // Private message
  socket.on('private_message', ({ to, message }) => {
    const msgData = {
      id: Date.now(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true,
      reactions: {},
      readBy: [],
    };
    socket.to(to).emit('private_message', msgData);
    socket.emit('private_message', msgData);
    socket.emit('message_delivered', msgData.id);
  });

  // Typing
  socket.on('typing', (isTyping) => {
    const user = users[socket.id];
    if (!user) return;
    if (isTyping) typingUsers[socket.id] = user.username;
    else delete typingUsers[socket.id];
    io.to(user.room).emit('typing_users', Object.values(typingUsers));
  });

  // Add reaction
  socket.on('add_reaction', ({ messageId, reaction }) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;
    msg.reactions[reaction] = msg.reactions[reaction] || 0;
    msg.reactions[reaction]++;
    const user = users[socket.id];
    if (user.room) io.to(user.room).emit('update_reaction', { messageId, reactions: msg.reactions });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      io.emit('user_left', { username: user.username, id: socket.id });
    }
    delete users[socket.id];
    delete typingUsers[socket.id];
    io.emit('user_list', Object.values(users));
  });
});

// File upload
app.post('/upload', upload.single('file'), (req,res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded!' });
  const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
  const sender = req.body.sender;
  const to = req.body.to;
  const fileData = {
    id: Date.now(),
    sender,
    fileUrl,
    timestamp: new Date().toISOString(),
    isFile: true,
    isPrivate: !!to,
    reactions: {},
    readBy: [],
  };
  if (to) io.to(to).emit('file_shared', fileData);
  else io.emit('file_shared', fileData);
  res.status(200).json({ message: 'File uploaded successfully', fileUrl });
});

// API routes
app.get('/api/messages', (req,res) => res.json(messages));
app.get('/api/users', (req,res) => res.json(Object.values(users)));
// Get messages with pagination
app.get('/api/messages/:room/:page', (req,res)=>{
  const { room, page } = req.params;
  const pageSize = 20;
  const roomMessages = messages.filter(m => m.room === room);
  const paginated = roomMessages.slice(-pageSize*(parseInt(page)), -pageSize*(parseInt(page)-1) || undefined);
  res.json(paginated);
});



const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
