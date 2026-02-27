// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username must be at most 30 characters']
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
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [18, 'You must be 18 or older'],
    max: [100, 'Age must be 100 or less'],
    validate: {
      validator: function(v) {
        return typeof v === 'number' && !isNaN(v) && v >= 18 && v <= 100;
      },
      message: 'Age must be a number between 18 and 100 (you entered: {VALUE})'
    }
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['Male', 'Female', 'Other']
  },
  lookingFor: {
    type: String,
    required: [true, 'Looking for is required'],
    enum: ['Male', 'Female', 'Both']
  },
  location: {
    type: String,
    default: 'Ethiopia',
    maxlength: 100
  },
  bio: {
    type: String,
    maxlength: 500,
    default: 'Looking for a serious relationship.'
  },
  interests: [String],
  profileImage: {
    type: String,
    default: '/images/default-avatar.png'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  reportedBy: [{
    userId: mongoose.Schema.Types.ObjectId,
    reason: String,
    date: { type: Date, default: Date.now }
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('✅ Password hashed for user:', this.username);
    next();
  } catch (error) {
    console.error('❌ Password hash error:', error.message);
    next(error);
  }
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
