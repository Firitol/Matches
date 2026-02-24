const mongoose = require("mongoose");

const AnalyticsSchema = new mongoose.Schema({
  event: String,
  userId: String,
  timestamp: Date,
  metadata: Object
});

module.exports = mongoose.model("Analytics", AnalyticsSchema);