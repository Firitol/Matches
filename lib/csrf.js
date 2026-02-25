// lib/csrf.js
const csrf = require('csrf');
const tokens = new csrf();

// Secret must be at least 32 characters
const secret = process.env.CSRF_SECRET || 'fallback_secret_must_be_replaced_in_production_32chars';

export function generateCsrfToken(sessionSecret) {
  return tokens.create(secret);
}

export function verifyCsrfToken(req) {
  const token = req.body?._csrf || req.headers['x-csrf-token'];
  const secret = process.env.CSRF_SECRET;
  
  if (!token || !secret) return false;
  
  try {
    return tokens.verify(secret, token);
  } catch {
    return false;
  }
}

export function csrfMiddleware(handler) {
  return async (req, res) => {
    // Skip CSRF for GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return handler(req, res);
    }
    
    // Verify CSRF token for state-changing requests
    if (!verifyCsrfToken(req)) {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(403).json({ error: 'CSRF token invalid' });
      }
      res.statusCode = 403;
      res.setHeader('Content-Type', 'text/html');
      res.end('<h1>403 - CSRF Token Invalid</h1>');
      return;
    }
    
    return handler(req, res);
  };
}
