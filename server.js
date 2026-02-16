// server.js (Render-ready for EthioMatch)

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");

const app = express();

/* ======================
   MIDDLEWARE
====================== */
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: "*", // Change to your frontend URL in production
}));
app.use(express.json());

/* ======================
   ENV VARIABLES
====================== */
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 EthioMatch server running on port ${PORT}`);
});
/* ======================
   HEALTH CHECK (IMPORTANT FOR RENDER)
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
   SAMPLE API ROUTE (Matches / Users)
   You can replace later with real routes
====================== */
app.get("/api/users", (req, res) => {
  res.json({
    message: "Users endpoint working",
    users: [],
  });
});

/* ======================
   DATABASE CONNECTION (MongoDB Atlas)
====================== */
if (MONGO_URI) {
  mongoose
    .connect(mongodb+srv://firitol:<firitol>@cluster0.wd9xtjy.mongodb.net/?appName=Cluster0)
    .then(() => {
      console.log("✅ MongoDB connected successfully");
    })
    .catch((err) => {
      console.error("❌ MongoDB connection error:", err.message);
    });
} else {
  console.warn("⚠️ MONGO_URI not found. Running without database.");
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
