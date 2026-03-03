// models/index.js
const User = require('./User');
const Match = require('./Match');
const Message = require('./Message');
const Subscription = require('./Subscription');
const MessageToken = require('./MessageToken');
const Payment = require('./Payment');

// User ↔ Match associations
User.hasMany(Match, { foreignKey: 'user1Id', as: 'matchesAsUser1' });
User.hasMany(Match, { foreignKey: 'user2Id', as: 'matchesAsUser2' });
Match.belongsTo(User, { foreignKey: 'user1Id', as: 'user1' });
Match.belongsTo(User, { foreignKey: 'user2Id', as: 'user2' });

// User ↔ Message associations
User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// Match ↔ Message associations
Match.hasMany(Message, { foreignKey: 'matchId', as: 'messages' });
Message.belongsTo(Match, { foreignKey: 'matchId', as: 'match' });

// User ↔ Subscription associations
User.hasOne(Subscription, { foreignKey: 'userId', as: 'subscription' });
Subscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User ↔ MessageToken associations
User.hasOne(MessageToken, { foreignKey: 'userId', as: 'messageTokens' });
MessageToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User ↔ Payment associations
User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  User,
  Match,
  Message,
  Subscription,
  MessageToken,
  Payment,
  sequelize: require('../lib/database').sequelize
};
