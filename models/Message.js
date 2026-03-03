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
    allowNull: true, // Allow null for media-only messages
    validate: {
      len: [0, 1000]
    }
  },
  mediaType: {
    type: DataTypes.STRING,
    defaultValue: 'text',
    field: 'mediaType',
    validate: {
      isIn: [['text', 'image', 'video']]
    }
  },
  mediaUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'mediaUrl'
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

// NO ASSOCIATIONS HERE - handled in models/index.js

module.exports = Message;
