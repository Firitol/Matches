// models/MessageToken.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../lib/database');

const MessageToken = sequelize.define('MessageToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'userId'
  },
  tokens: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  tokensUsed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'tokensUsed'
  },
  lastRefill: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
    field: 'lastRefill'
  }
}, {
  tableName: 'messageTokens',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = MessageToken;
