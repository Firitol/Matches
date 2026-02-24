const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    room: { type: String, default: "global" },
    senderId: { type: String, required: true },
    receiverId: { type: String, default: null },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);