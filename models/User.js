// models/User.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../lib/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    validate: { len: [3, 30], isAlphanumeric: true }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { len: [8, 100] }
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { isInt: true, min: 18, max: 100 }
  },
  gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other'),
    allowNull: false
  },
  lookingFor: {
    type: DataTypes.ENUM('Male', 'Female', 'Both'),
    allowNull: false
  },
  location: {
    type: DataTypes.STRING(100),
    defaultValue: 'Ethiopia'
  },
  bio: {
    type: DataTypes.TEXT,
    defaultValue: 'Looking for a serious relationship.'
  },
  interests: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  profileImage: {
    type: DataTypes.STRING,
    defaultValue: '/images/default-avatar.png'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lastActive: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  timestamps: true,
  // ✅ Hash password BEFORE saving to database
  hooks: {
    beforeSave: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        console.log('🔐 Password hashed for user:', user.username);
      }
    }
  }
});

// ✅ Instance method to compare password
User.prototype.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// models/User.js - Add this method
User.prototype.updateLastActive = async function() {
  this.lastActive = new Date();
  return this.save().catch(() => {}); // Non-blocking
};
// models/User.js - ADD THIS AT THE BOTTOM

// Message association
const Message = require('./Message');
User.hasMany(Message, { 
  foreignKey: 'senderId', 
  as: 'sentMessages' 
});

module.exports = User;
module.exports = User;
