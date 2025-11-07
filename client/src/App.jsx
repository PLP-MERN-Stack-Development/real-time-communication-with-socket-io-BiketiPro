import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";

const socket = io("http://localhost:5000", { withCredentials: true });

function App() {
  const [username, setUsername] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [privateMode, setPrivateMode] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState("General");

  // Request notification permission on login
  useEffect(() => {
    if (Notification.permission !== "granted") Notification.requestPermission();
  }, []);

  useEffect(() => {
    socket.on("connect", () => console.log("Connected:", socket.id));

    socket.on("receive_message", handleNewMessage);
    socket.on("private_message", handleNewMessage);
    socket.on("file_shared", handleNewMessage);
    socket.on("typing_users", setTypingUsers);
    socket.on("user_list", setOnlineUsers);
    socket.on("room_list", (roomList) => setRooms(roomList));
    socket.on("room_joined", (room) => setCurrentRoom(room));

    socket.on("update_reaction", ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    });

    socket.on("update_read", ({ messageId, readBy }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, readBy } : m))
      );
    });

    // Reset selected user if they disconnect
    socket.on("user_left", (user) => {
      if (selectedUser && selectedUser.id === user.id) {
        setSelectedUser(null);
        setPrivateMode(false);
      }
    });

    return () => socket.off();
  }, [selectedUser]);

  const handleNewMessage = (msg) => {
    setMessages((prev) => [...prev, msg]);
    if (msg.sender !== username) {
      // Browser notification
      if (Notification.permission === "granted") {
        new Notification(msg.isPrivate ? `Private: ${msg.sender}` : `${msg.sender}`, {
          body: msg.message || "Sent a file",
        });
      }
    }
  };

  const handleJoin = () => {
    if (!username.trim()) return;
    socket.emit("user_join", username);
    setIsLoggedIn(true);
  };

  const handleTyping = (e) => {
    const val = e.target.value;
    setMessage(val);
    socket.emit("typing", val.length > 0);
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    // File upload
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sender", username);
      if (privateMode && selectedUser) formData.append("to", selectedUser.id);

      try {
        await axios.post("http://localhost:5000/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (p) =>
            setUploadProgress(Math.round((p.loaded * 100) / p.total)),
        });
        setUploadMessage("✅ File uploaded successfully");
      } catch (err) {
        setUploadMessage(err.response?.data?.error || "❌ Upload failed");
      } finally {
        setFile(null);
        setUploadProgress(0);
      }
      return;
    }

    // Text message
    if (message.trim()) {
      if (privateMode && selectedUser)
        socket.emit("private_message", { to: selectedUser.id, message });
      else socket.emit("send_message", { message });
      setMessage("");
    }
  };

  const addReaction = (messageId, reaction) => {
    socket.emit("add_reaction", { messageId, reaction });
  };

  const switchRoom = (room) => {
    socket.emit("join_room", room);
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      {!isLoggedIn ? (
        <div>
          <h2>Join the Chat</h2>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username..."
          />
          <button onClick={handleJoin}>Join</button>
        </div>
      ) : (
        <div>
          <h2>💬 Chat Room - {currentRoom}</h2>

          {/* Room Selection */}
          <div>
            <strong>Rooms:</strong>{" "}
            {rooms.map((room) => (
              <button
                key={room}
                onClick={() => switchRoom(room)}
                style={{
                  margin: "0 5px",
                  fontWeight: currentRoom === room ? "bold" : "normal",
                }}
              >
                {room}
              </button>
            ))}
          </div>

          {/* Online Users */}
          <strong>Online Users:</strong>
          <ul>
            {onlineUsers.map((u) => (
              <li
                key={u.id}
                style={{
                  cursor: "pointer",
                  fontWeight: selectedUser?.id === u.id ? "bold" : "normal",
                }}
                onClick={() => {
                  setSelectedUser(u);
                  setPrivateMode(true);
                }}
              >
                {u.username} {selectedUser?.id === u.id ? "(Selected)" : ""}
              </li>
            ))}
          </ul>

          {/* Private Chat Toggle */}
          <div style={{ marginBottom: 10 }}>
            <label>
              <input
                type="checkbox"
                checked={privateMode}
                onChange={() => setPrivateMode(!privateMode)}
                disabled={!selectedUser}
              />{" "}
              Private Chat Mode
            </label>
            <div style={{ fontSize: "0.9rem", color: "#555", marginTop: 5 }}>
              {privateMode && selectedUser
                ? `Private chatting with ${selectedUser.username}`
                : `Currently in ${currentRoom}`}
            </div>
          </div>

          {/* Chat Messages */}
          <div
            style={{
              border: "1px solid #ccc",
              borderRadius: 8,
              padding: 10,
              height: 300,
              overflowY: "auto",
              marginBottom: 10,
              backgroundColor: "#121212",
              color: "#f5f5f5",
            }}
          >
            {messages
              .filter((msg) => msg.room === currentRoom || msg.isPrivate)
              .map((msg, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 10,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: msg.isPrivate
                      ? "rgba(0, 150, 136, 0.15)"
                      : msg.sender === username
                      ? "rgba(76, 175, 80, 0.15)"
                      : "rgba(33, 150, 243, 0.15)",
                    alignSelf:
                      msg.sender === username ? "flex-end" : "flex-start",
                  }}
                >
                  <strong style={{ color: "#4fc3f7" }}>{msg.sender}</strong>{" "}
                  <span style={{ color: "#aaa", fontSize: "0.8rem" }}>
                    {msg.timestamp
                      ? new Date(msg.timestamp).toLocaleTimeString()
                      : ""}
                  </span>
                  <div style={{ marginTop: 4 }}>
                    {msg.isFile ? (
                      msg.fileUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                        <img
                          src={msg.fileUrl}
                          alt="shared"
                          style={{
                            width: "120px",
                            borderRadius: 6,
                            marginTop: 5,
                          }}
                        />
                      ) : (
                        <a
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: "#ffca28",
                            textDecoration: "underline",
                          }}
                        >
                          📎 Download File
                        </a>
                      )
                    ) : (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "6px 10px",
                          borderRadius: 6,
                          backgroundColor: msg.isPrivate
                            ? "#004d40"
                            : msg.sender === username
                            ? "#1b5e20"
                            : "#0d47a1",
                          color: "#fff",
                          maxWidth: "80%",
                          wordWrap: "break-word",
                        }}
                      >
                        {msg.isPrivate ? "(Private) " : ""}
                        {msg.message}
                      </span>
                    )}
                  </div>

                  {/* Reactions */}
                  <div style={{ marginTop: 4 }}>
                    {["👍", "❤️", "😂"].map((r) => (
                      <button
                        key={r}
                        onClick={() => addReaction(msg.id, r)}
                        style={{ marginRight: 5 }}
                      >
                        {r} {msg.reactions[r] || ""}
                      </button>
                    ))}
                  </div>

                  {/* Read Receipts */}
                  <div style={{ fontSize: "0.7rem", color: "#aaa" }}>
                    Read by: {msg.readBy.join(", ")}
                  </div>
                </div>
              ))}
          </div>

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <p style={{ fontStyle: "italic", color: "#888" }}>
              {typingUsers.join(", ")} typing...
            </p>
          )}

          {/* Message Input */}
          <form onSubmit={sendMessage}>
            <input
              type="text"
              value={message}
              onChange={handleTyping}
              placeholder="Type a message..."
              style={{ width: "70%" }}
            />
            <button type="submit">Send</button>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              style={{ marginLeft: 5 }}
            />

            {uploadProgress > 0 && (
              <div style={{ width: "100%", background: "#eee", marginTop: 5 }}>
                <div
                  style={{
                    width: `${uploadProgress}%`,
                    height: 8,
                    background: "#4caf50",
                    transition: "width 0.3s",
                  }}
                ></div>
              </div>
            )}
            {uploadMessage && <p>{uploadMessage}</p>}
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
