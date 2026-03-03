// utils/userCheck.js
const { Op } = require('sequelize');
const { User } = require('../models');

/**
 * Check if a user exists by username, email, or ID
 * @param {Object} criteria - Search criteria
 * @param {string} [criteria.username] - Username to check
 * @param {string} [criteria.email] - Email to check
 * @param {string} [criteria.id] - User ID to check
 * @param {boolean} [criteria.onlyActive=true] - Only check active users
 * @returns {Promise<Object>} - { exists: boolean, user: User|null }
 */
const checkUserExists = async ({ username, email, id, onlyActive = true } = {}) => {
  try {
    // Build where clause
    const where = {};
    
    if (id) {
      where.id = id;
    } else if (username || email) {
      where[Op.or] = [];
      if (username) {
        where[Op.or].push({ username: { [Op.iLike]: username.trim() } });
      }
      if (email) {
        where[Op.or].push({ email: { [Op.iLike]: email.toLowerCase().trim() } });
      }
    } else {
      // No criteria provided
      return { exists: false, user: null, error: 'No search criteria provided' };
    }
    
    // Add active filter if requested
    if (onlyActive) {
      where.isActive = true;
    }
    
    // Query database
    const user = await User.findOne({
      where,
      attributes: ['id', 'username', 'email', 'isActive', 'isVerified', 'createdAt']
    });
    
    return {
      exists: !!user,
      user: user ? user.toJSON() : null,
      error: null
    };
    
  } catch (error) {
    console.error('User check error:', error.message);
    return {
      exists: false,
      user: null,
      error: error.message
    };
  }
};

/**
 * Quick boolean check (faster, no user data returned)
 * @param {string} usernameOrEmail - Username or email to check
 * @returns {Promise<boolean>}
 */
const isUserTaken = async (usernameOrEmail) => {
  try {
    const count = await User.count({
      where: {
        [Op.or]: [
          { username: { [Op.iLike]: usernameOrEmail.trim() } },
          { email: { [Op.iLike]: usernameOrEmail.toLowerCase().trim() } }
        ],
        isActive: true
      }
    });
    return count > 0;
  } catch (error) {
    console.error('isUserTaken error:', error.message);
    return false;
  }
};

module.exports = {
  checkUserExists,
  isUserTaken
};
