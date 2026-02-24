const express = require("express");
const Message = require("../models/Message");
const Analytics = require("../models/Analytics");

const router = express.Router();

/**
 * Get flagged messages
 */
router.get("/flagged-messages", async (req, res) => {
  try {
    const flagged = await Message.find({ flagged: true })
      .sort({ createdAt: -1 });

    res.json(flagged);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch flagged messages" });
  }
});

/**
 * Get analytics summary
 */
router.get("/analytics-summary", async (req, res) => {
  try {
    const totalMessages = await Message.countDocuments();
    const totalEvents = await Analytics.countDocuments();

    res.json({
      totalMessages,
      totalEvents,
    });
  } catch (err) {
    res.status(500).json({ error: "Analytics fetch failed" });
  }
});

module.exports = router;