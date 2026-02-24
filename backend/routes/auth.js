// backend/routes/auth.js
const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

// Dummy users for demo
const users = [{ id: "1", username: "user1", password: "1234" }];

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token, userId: user.id });
});

module.exports = router;