// utils/logger.js

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'INFO'];

/**
 * Format log message with timestamp
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 * @returns {string} Formatted log
 */
const formatLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logObj = {
    timestamp,
    level,
    message,
    ...meta
  };
  
  return JSON.stringify(logObj);
};

/**
 * Log error message
 * @param {string} message - Error message
 * @param {Object} meta - Additional metadata
 */
exports.error = (message, meta = {}) => {
  if (CURRENT_LEVEL >= LOG_LEVELS.ERROR) {
    console.error(formatLog('ERROR', message, meta));
  }
};

/**
 * Log warning message
 * @param {string} message - Warning message
 * @param {Object} meta - Additional metadata
 */
exports.warn = (message, meta = {}) => {
  if (CURRENT_LEVEL >= LOG_LEVELS.WARN) {
    console.warn(formatLog('WARN', message, meta));
  }
};

/**
 * Log info message
 * @param {string} message - Info message
 * @param {Object} meta - Additional metadata
 */
exports.info = (message, meta = {}) => {
  if (CURRENT_LEVEL >= LOG_LEVELS.INFO) {
    console.log(formatLog('INFO', message, meta));
  }
};

/**
 * Log debug message
 * @param {string} message - Debug message
 * @param {Object} meta - Additional metadata
 */
exports.debug = (message, meta = {}) => {
  if (CURRENT_LEVEL >= LOG_LEVELS.DEBUG) {
    console.log(formatLog('DEBUG', message, meta));
  }
};

/**
 * Log HTTP request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} duration - Request duration in ms
 */
exports.httpRequest = (req, res, duration) => {
  this.info('HTTP Request', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
};

/**
 * Log database operation
 * @param {string} operation - DB operation type
 * @param {string} collection - Collection name
 * @param {number} duration - Operation duration in ms
 */
exports.dbOperation = (operation, collection, duration) => {
  this.debug('Database Operation', {
    operation,
    collection,
    duration: `${duration}ms`
  });
};

/**
 * Log authentication event
 * @param {string} event - Auth event type
 * @param {string} userId - User ID
 * @param {Object} meta - Additional metadata
 */
exports.authEvent = (event, userId, meta = {}) => {
  this.info('Authentication Event', {
    event,
    userId,
    ...meta
  });
};

/**
 * Log security event
 * @param {string} event - Security event type
 * @param {Object} meta - Additional metadata
 */
exports.securityEvent = (event, meta = {}) => {
  this.warn('Security Event', {
    event,
    ...meta
  });
};
