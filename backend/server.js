// backend/server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");
const Message = require("./models/Message");

const app = express();
const server = http.createServer(app);

/* ======================
   Middleware
====================== */
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use("/api/auth", authRoutes);

/* ======================
   MongoDB
====================== */
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ethiomatch")
  .then(() => console.log("✅ MongoDB connected"))
  .catch(console.error);

/* ======================
   Socket.IO
====================== */
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET","POST"], credentials: true }
});

// Track online users
const onlineUsers = new Map();

// JWT middleware for sockets
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Authentication error"));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch {
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.user.id);
  onlineUsers.set(socket.user.id, socket.id);

  // Broadcast online users
  io.emit("user_online", Array.from(onlineUsers.keys()));

  // Join global chat
  socket.join("global");

  // Typing indicator
  socket.on("typing", () => {
    socket.to("global").emit("user_typing", socket.user.id);
  });

  // Sending message
  socket.on("send_message", async (data) => {
    const savedMessage = await Message.create({
      room: "global",
      senderId: socket.user.id,
      message: data.message,
    });
    io.to("global").emit("receive_message", savedMessage);
  });

  // Mark read
  socket.on("mark_read", async (messageId) => {
    await Message.findByIdAndUpdate(messageId, { read: true });
    io.emit("message_read", messageId);
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.user.id);
    onlineUsers.delete(socket.user.id);
    io.emit("user_offline", Array.from(onlineUsers.keys()));
  });
});

/* ======================
   Health route
====================== */
app.get("/", (req, res) => res.json({ status: "ok", message: "EthioMatch API Live 🚀" }));

/* ======================
   Start server
====================== */
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => console.log(`🚀 Backend running on port ${PORT}`));