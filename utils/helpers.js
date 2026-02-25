// utils/helpers.js

/**
 * Format date to readable string
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
exports.formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format date to relative time (e.g., "2 hours ago")
 * @param {Date} date - Date object
 * @returns {string} Relative time string
 */
exports.formatRelativeTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now - then) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return this.formatDate(date);
};

/**
 * Sanitize user input to prevent XSS
 * @param {string} str - Input string
 * @returns {string} Sanitized string
 */
exports.sanitizeInput = (str) => {
  if (!str || typeof str !== 'string') return '';
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
};

/**
 * Generate random username if needed
 * @param {string} base - Base name
 * @returns {string} Random username
 */
exports.generateUsername = (base = 'user') => {
  const randomNum = Math.floor(Math.random() * 10000);
  return `${base}${randomNum}`;
};

/**
 * Calculate age from birth date
 * @param {Date} birthDate - Birth date
 * @returns {number} Age in years
 */
exports.calculateAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Check if user is online (active in last 10 minutes)
 * @param {Date} lastActive - Last active timestamp
 * @returns {boolean} Is online
 */
exports.isOnline = (lastActive) => {
  if (!lastActive) return false;
  
  const now = new Date();
  const last = new Date(lastActive);
  const diffInMinutes = (now - last) / (1000 * 60);
  
  return diffInMinutes < 10;
};

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
exports.truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Validate Ethiopian phone number format
 * @param {string} phone - Phone number
 * @returns {boolean} Is valid
 */
exports.isValidEthiopianPhone = (phone) => {
  if (!phone) return false;
  
  // Remove spaces and dashes
  const cleaned = phone.replace(/[\s-]/g, '');
  
  // Ethiopian phone formats: +251XXXXXXXXX or 09XXXXXXXX
  const regex = /^(\+251|0)[9][0-9]{8}$/;
  return regex.test(cleaned);
};

/**
 * Get avatar emoji based on gender
 * @param {string} gender - User gender
 * @returns {string} Emoji
 */
exports.getAvatarEmoji = (gender) => {
  switch (gender) {
    case 'Male': return '👨';
    case 'Female': return '👩';
    default: return '👤';
  }
};

/**
 * Calculate compatibility score (simple version)
 * @param {Object} user1 - First user
 * @param {Object} user2 - Second user
 * @returns {number} Score 0-100
 */
exports.calculateCompatibility = (user1, user2) => {
  let score = 50; // Base score
  
  // Age difference (closer = higher score)
  const ageDiff = Math.abs(user1.age - user2.age);
  if (ageDiff <= 3) score += 20;
  else if (ageDiff <= 5) score += 10;
  else if (ageDiff <= 10) score += 5;
  
  // Same location
  if (user1.location === user2.location) score += 15;
  
  // Shared interests
  if (user1.interests && user2.interests) {
    const shared = user1.interests.filter(i => user2.interests.includes(i));
    score += Math.min(shared.length * 5, 15);
  }
  
  return Math.min(score, 100);
};

/**
 * Sleep utility for rate limiting
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise}
 */
exports.sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Parse pagination query params
 * @param {Object} query - Request query object
 * @returns {Object} Pagination options
 */
exports.parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
};
