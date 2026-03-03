// models/Match.js - NO Message associations here
const { DataTypes } = require('sequelize');
const { sequelize } = require('../lib/database');

const Match = sequelize.define('Match', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user1Id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user1Id'
  },
  user2Id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user2Id'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending'
  },
  likedBy: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: [],
    field: 'likedBy'
  }
}, {
  tableName: 'matches',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

// ✅ NO Message associations here - prevents circular dependency

module.exports = Match;
