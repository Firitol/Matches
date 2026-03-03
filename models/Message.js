// models/Message.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../lib/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  matchId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'matchId'
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'senderId'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 1000]
    }
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'isRead'
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'readAt'
  }
}, {
  tableName: 'messages',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

// ✅ IMPORTANT: Define associations INSIDE the Message model file
// This ensures associations are loaded when Message is required

const setupAssociations = () => {
  const User = require('./User');
  const Match = require('./Match');
  
  Message.belongsTo(User, { 
    foreignKey: 'senderId', 
    as: 'sender',
    constraints: false
  });
  
  Message.belongsTo(Match, { 
    foreignKey: 'matchId', 
    as: 'match',
    constraints: false
  });
  
  User.hasMany(Message, { 
    foreignKey: 'senderId', 
    as: 'sentMessages' 
  });
  
  Match.hasMany(Message, { 
    foreignKey: 'matchId', 
    as: 'messages' 
  });
};

// Setup associations immediately
setupAssociations();

module.exports = Message;
