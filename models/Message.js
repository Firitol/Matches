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

module.exports = Message;
