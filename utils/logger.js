// utils/logger.js
const LOG_LEVELS = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'INFO'];

const formatLog = (level, message, meta = {}) => {
  return JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...meta });
};

exports.error = (msg, meta) => { if (CURRENT_LEVEL >= 0) console.error(formatLog('ERROR', msg, meta)); };
exports.warn = (msg, meta) => { if (CURRENT_LEVEL >= 1) console.warn(formatLog('WARN', msg, meta)); };
exports.info = (msg, meta) => { if (CURRENT_LEVEL >= 2) console.log(formatLog('INFO', msg, meta)); };
exports.debug = (msg, meta) => { if (CURRENT_LEVEL >= 3) console.log(formatLog('DEBUG', msg, meta)); };
