// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: 1000
  },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

messageSchema.index({ matchId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
