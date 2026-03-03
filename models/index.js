// models/index.js
const User = require('./User');
const Match = require('./Match');
const Message = require('./Message');
const Subscription = require('./Subscription');
const MessageToken = require('./MessageToken');
const Payment = require('./Payment');

// User ↔ Match
User.hasMany(Match, { foreignKey: 'user1Id', as: 'matchesAsUser1' });
User.hasMany(Match, { foreignKey: 'user2Id', as: 'matchesAsUser2' });
Match.belongsTo(User, { foreignKey: 'user1Id', as: 'user1' });
Match.belongsTo(User, { foreignKey: 'user2Id', as: 'user2' });

// User ↔ Message
User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// Match ↔ Message
Match.hasMany(Message, { foreignKey: 'matchId', as: 'messages' });
Message.belongsTo(Match, { foreignKey: 'matchId', as: 'match' });

// User ↔ Subscription
User.hasOne(Subscription, { foreignKey: 'userId', as: 'subscription' });
Subscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User ↔ MessageToken
User.hasOne(MessageToken, { foreignKey: 'userId', as: 'messageTokens' });
MessageToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User ↔ Payment
User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  User: User,
  Match: Match,
  Message: Message,
  Subscription: Subscription,
  MessageToken: MessageToken,
  Payment: Payment,
  sequelize: require('../lib/database').sequelize
};
