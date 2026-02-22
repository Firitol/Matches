require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

/* ======================
   ENV
====================== */
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

/* ======================
   MIDDLEWARE
====================== */
app.use(helmet());
app.use(compression());
app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://ethiomatch-frontend.onrender.com",
    ],
    credentials: true,
  })
);

/* ======================
   SOCKET.IO SETUP
====================== */
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://ethiomatch-frontend.onrender.com",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("🔥 User connected:", socket.id);

  socket.on("join_room", (room) => {
    socket.join(room);
  });

  socket.on("send_message", (data) => {
    io.to(data.room).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

/* ======================
   ROUTES
====================== */
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "EthioMatch API + Socket running 🚀" });
});

/* ======================
   DATABASE
====================== */
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error(err));
}

/* ======================
   START SERVER
====================== */
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});