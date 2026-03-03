// models/Match.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../lib/database');
const User = require('./User');

const Match = sequelize.define('Match', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user1Id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: User, key: 'id' }
  },
  user2Id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: User, key: 'id' }
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'blocked'),
    defaultValue: 'pending'
  },
  likedBy: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: []
  }
}, {
  tableName: 'matches',
  timestamps: true,
  indexes: [{ unique: true, fields: ['user1Id', 'user2Id'] }]
});
// Message association
const Message = require('./Message');
Match.hasMany(Message, { 
  foreignKey: 'matchId', 
  as: 'messages' 
});

module.exports = Match;
// Associations
User.hasMany(Match, { foreignKey: 'user1Id', as: 'matchesAsUser1' });
User.hasMany(Match, { foreignKey: 'user2Id', as: 'matchesAsUser2' });
Match.belongsTo(User, { foreignKey: 'user1Id', as: 'user1' });
Match.belongsTo(User, { foreignKey: 'user2Id', as: 'user2' });

module.exports = Match;
