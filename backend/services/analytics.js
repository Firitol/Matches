const Analytics = require("../models/Analytics");

async function trackAnalytics(event, userId, metadata = {}) {
  try {
    await Analytics.create({
      event,
      userId,
      timestamp: new Date(),
      metadata,
    });
  } catch (err) {
    console.error("Analytics error:", err.message);
  }
}

module.exports = trackAnalytics;