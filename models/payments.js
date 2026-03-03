// models/Payment.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../lib/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'userId'
  },
  stripePaymentIntentId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'stripePaymentIntentId'
  },
  stripeCheckoutSessionId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'stripeCheckoutSessionId'
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 0 }
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'USD'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'completed', 'failed', 'refunded']]
    }
  },
  paymentType: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'paymentType',
    validate: {
      isIn: [['subscription', 'tokens']]
    }
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: 'payments',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = Payment;
