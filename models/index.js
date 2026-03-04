// models/index.js - SIMPLIFIED
const User = require('./User');
const Match = require('./Match');
const Message = require('./Message');

const { sequelize } = require('../lib/database');

// Core associations
User.hasMany(Match, { foreignKey: 'user1Id', as: 'user1Matches' });
User.hasMany(Match, { foreignKey: 'user2Id', as: 'user2Matches' });
Match.belongsTo(User, { foreignKey: 'user1Id', as: 'user1' });
Match.belongsTo(User, { foreignKey: 'user2Id', as: 'user2' });

User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

Match.hasMany(Message, { foreignKey: 'matchId', as: 'messages' });
Message.belongsTo(Match, { foreignKey: 'matchId', as: 'match' });

module.exports = {
  User: User,
  Match: Match,
  Message: Message,
  sequelize: sequelize
};
