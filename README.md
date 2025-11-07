# Real-Time Chat Application

A full-featured **real-time chat application** built with **React, Socket.io, Express, and Node.js**, supporting:

- Multiple chat rooms
- Private messaging
- File/image sharing
- "User is typing" indicators
- Message reactions
- Read receipts
- Message pagination
- Real-time notifications

---

## Table of Contents

- [Demo](#demo)
- [Features](#features)
- [Technologies](#technologies)
- [Setup Instructions](#setup-instructions)
- [Running the Project](#running-the-project)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Future Enhancements](#future-enhancements)
- [License](#license)

---

## Demo

![Chat Demo](demo-screenshot.png)  
*(Replace with your own screenshot or GIF)*

---

## Features

### Core Features

- Join the chat with a **username**
- Multiple **chat rooms** (`General`, `Tech`, `Random`)
- **Global chat** or **private messaging** between users
- **File upload** (images, PDFs) with preview for images
- **Typing indicator** for active users
- **Message reactions** (like, love, etc.)
- **Read receipts** for messages
- Real-time updates of **online users**

### Performance & UX

- Message **pagination** to load older messages
- Delivery acknowledgment for messages
- Responsive UI for **desktop and mobile**
- Dark-themed chat messages

---

## Technologies

- **Frontend:** React, Axios
- **Backend:** Node.js, Express
- **Real-Time Communication:** Socket.io
- **File Uploads:** Multer
- **Storage:** In-memory storage (users, messages)
- **Others:** CORS, dotenv

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository_url>
cd <repository_folder>
2. Install dependencies
Backend:
bash
Copy code
cd backend
npm install
Frontend:
bash
Copy code
cd ../frontend
npm install
3. Environment Variables
Create a .env file in the backend:

env
Copy code
PORT=5000
(You can add other environment variables if needed)

4. Run the servers
Backend:
bash
Copy code
cd backend
npm run dev
Frontend:
bash
Copy code
cd frontend
npm start
Frontend runs on http://localhost:5174 (Vite default)

Backend runs on http://localhost:5000

Running the Project
Open the frontend URL in your browser: http://localhost:5174

Enter a username to join the chat.

Select a chat room or click on a user to start private messaging.

Type a message or upload a file to share in the room or privately.

Project Structure
bash
Copy code
root/
├─ backend/
│  ├─ server.js
│  ├─ uploads/          # Uploaded files
│  ├─ package.json
│  └─ .env
├─ frontend/
│  ├─ src/
│  │  ├─ App.jsx
│  │  └─ index.jsx
│  ├─ package.json
│  └─ ...
├─ README.md
API Endpoints
GET /api/messages → Get all messages

GET /api/users → Get all online users

GET /api/messages/:room/:page → Get paginated messages for a room

POST /upload → Upload a file (file, sender, to)

Socket.io Events:

user_join → Join the chat with username

join_room → Switch to a chat room

send_message → Send a message to the room

private_message → Send a private message

typing → Broadcast typing status

add_reaction → Add reaction to a message

message_read → Mark message as read

disconnect → Handle user disconnect

Future Enhancements
Persist messages in MongoDB or MySQL

User authentication with JWT

Browser notifications for new messages

Search functionality for messages

Emojis support

Video/audio chat integration