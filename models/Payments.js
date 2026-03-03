// models/Payment.js - MINIMAL VERSION
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
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending'
  },
  paymentType: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'paymentType'
  }
}, {
  tableName: 'payments',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

// Add debug log to verify it loads
console.log('✅ Payment model loaded');

module.exports = Payment;
