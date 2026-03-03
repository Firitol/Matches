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
    defaultValue: 0,
    validate: { min: 0 }
  },
  tokensUsed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'tokensUsed',
    validate: { min: 0 }
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
  updatedAt: 'updatedAt',
  hooks: {
    beforeSave: async (token) => {
      // Auto-refill tokens daily for free users
      const subscription = await sequelize.models.Subscription.findOne({
        where: { userId: token.userId }
      });
      
      const now = new Date();
      const lastRefill = new Date(token.lastRefill);
      const hoursSinceRefill = (now - lastRefill) / (1000 * 60 * 60);
      
      if (hoursSinceRefill >= 24) {
        const maxTokens = subscription?.planType === 'premium' || subscription?.planType === 'vip' ? 999 : 5;
        token.tokens = maxTokens;
        token.tokensUsed = 0;
        token.lastRefill = now;
      }
    }
  }
});

module.exports = MessageToken;
