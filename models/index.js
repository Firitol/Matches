// models/index.js - SIMPLIFIED
const User = require('./User');
const Match = require('./Match');
const Message = require('./Message');

// Optional models - wrap in try/catch to prevent crashes
let Subscription, MessageToken, Payment;

try {
  Subscription = require('./Subscription');
} catch (e) {
  console.log('⚠️ Subscription model not loaded:', e.message);
}

try {
  MessageToken = require('./MessageToken');
} catch (e) {
  console.log('⚠️ MessageToken model not loaded:', e.message);
}

try {
  Payment = require('./Payment');
  console.log('✅ Payment model loaded in index.js');
} catch (e) {
  console.log('❌ Payment model failed to load:', e.message);
  // Create a dummy export to prevent crashes
  Payment = { associate: () => {} };
}

const { sequelize } = require('../lib/database');

// Basic associations (only for required models)
User.hasMany(Match, { foreignKey: 'user1Id', as: 'matchesAsUser1' });
User.hasMany(Match, { foreignKey: 'user2Id', as: 'matchesAsUser2' });
Match.belongsTo(User, { foreignKey: 'user1Id', as: 'user1' });
Match.belongsTo(User, { foreignKey: 'user2Id', as: 'user2' });

User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

Match.hasMany(Message, { foreignKey: 'matchId', as: 'messages' });
Message.belongsTo(Match, { foreignKey: 'matchId', as: 'match' });

// Optional associations
if (Subscription && User.hasOne) {
  User.hasOne(Subscription, { foreignKey: 'userId', as: 'subscription' });
  Subscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });
}

if (MessageToken && User.hasOne) {
  User.hasOne(MessageToken, { foreignKey: 'userId', as: 'messageTokens' });
  MessageToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });
}

if (Payment && User.hasMany) {
  User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' });
  Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
}

module.exports = {
  User,
  Match,
  Message,
  Subscription,
  MessageToken,
  Payment,
  sequelize
};
