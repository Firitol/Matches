// server.js (FINAL FIXED - Render Stable)

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");

const app = express();

/* ======================
   ENV VARIABLES (FIXED ERROR HERE)
====================== */
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || null;

/* ======================
   MIDDLEWARE
====================== */
app.use(helmet());
app.use(compression());
app.use(cors({ origin: "*" }));
app.use(express.json());

/* ======================
   HEALTH ROUTES (RENDER NEEDS THIS)
====================== */
app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "EthioMatch API is running 🚀",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    uptime: process.uptime(),
  });
});

/* ======================
   SAMPLE API ROUTES
====================== */
app.get("/api/users", (req, res) => {
  res.json({
    success: true,
    message: "Users endpoint working",
    data: [],
  });
});

app.get("/api/matches", (req, res) => {
  res.json({
    success: true,
    message: "Matches endpoint working",
    matches: [],
  });
});

/* ======================
   DATABASE CONNECTION (SAFE)
====================== */
if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log("✅ MongoDB connected successfully");
    })
    .catch((err) => {
      console.error("❌ MongoDB connection failed:", err.message);
    });
} else {
  console.log("⚠️ No MONGO_URI provided. Running without database.");
}

/* ======================
   404 HANDLER
====================== */
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

/* ======================
   GLOBAL ERROR HANDLER
====================== */
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.stack);
  res.status(500).json({
    error: "Internal Server Error",
  });
});

/* ======================
   START SERVER (CRITICAL FOR RENDER)
====================== */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 EthioMatch server running on port ${PORT}`);
});