const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  age: { type: Number, required: true, min: 18 }, // Enforce 18+
  gender: { type: String, required: true },
  lookingFor: { type: String, required: true },
  bio: { type: String, default: "Looking for a serious relationship." }
});

module.exports = mongoose.model('User', userSchema);