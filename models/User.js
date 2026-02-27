// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false
  },
age: {
  type: Number,
  required: [true, 'Age is required'],
  min: [18, 'You must be 18 or older'],
  max: [100, 'Please enter a valid age'],
  validate: {
    validator: function(v) {
      return !isNaN(v) && v >= 18 && v <= 100;
    },
    message: 'Age must be between 18 and 100'
  }
},
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['Male', 'Female', 'Other']
  },
  lookingFor: {
    type: String,
    required: [true, 'Please specify what you are looking for'],
    enum: ['Male', 'Female', 'Both']
  },
  bio: {
    type: String,
    maxlength: 500,
    default: 'Looking for a serious relationship.'
  },
  location: {
    type: String,
    default: 'Ethiopia'
  },
  profileImage: {
    type: String,
    default: '/images/default-avatar.png'
  },
  interests: [String],
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastActive: { type: Date, default: Date.now },
  reportedBy: [{
    userId: mongoose.Schema.Types.ObjectId,
    reason: String,
    date: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update last active
userSchema.methods.updateLastActive = async function() {
  this.lastActive = Date.now();
  return this.save().catch(() => {});
};

module.exports = mongoose.model('User', userSchema);
