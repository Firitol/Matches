// models/Message.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../lib/database');
const User = require('./User');
const Match = require('./Match');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  matchId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Match,
      key: 'id'
    }
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 1000] // Max 1000 characters
    }
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'messages',
  timestamps: true,
  indexes: [
    { fields: ['matchId'] },
    { fields: ['senderId'] },
    { fields: ['createdAt'] }
  ]
});

// Associations
Message.belongsTo(Match, { foreignKey: 'matchId', as: 'match' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Match.hasMany(Message, { foreignKey: 'matchId', as: 'messages' });
User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });

module.exports = Message;
