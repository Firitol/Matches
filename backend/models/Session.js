const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema({
  userId: String,
  deviceId: String,
  sessionData: Object
});

module.exports = mongoose.model("Session", SessionSchema);