// models/Subscription.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../lib/database');

const Subscription = sequelize.define('Subscription', {
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
  planType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'free',
    field: 'planType',
    validate: {
      isIn: [['free', 'basic', 'premium', 'vip']]
    }
  },
  stripeSubscriptionId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'stripeSubscriptionId'
  },
  stripeCustomerId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'stripeCustomerId'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'active',
    field: 'status'
  },
  currentPeriodStart: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'currentPeriodStart'
  },
  currentPeriodEnd: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'currentPeriodEnd'
  },
  cancelAtPeriodEnd: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'cancelAtPeriodEnd'
  },
  canceledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'canceledAt'
  }
}, {
  tableName: 'subscriptions',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = Subscription;
