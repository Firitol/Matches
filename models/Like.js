// models/Like.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const Like = sequelize.define('Like', {
  fromUserId: { type: DataTypes.UUID, allowNull: false },
  toUserId: { type: DataTypes.UUID, allowNull: false },
  type: { type: DataTypes.ENUM('like', 'dislike'), defaultValue: 'like' },
}, {});

module.exports = Like;
