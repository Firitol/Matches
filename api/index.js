// api/index.js - Main entry point for page rendering
const { renderToString } = require('ejs');
const { readFile } = require('fs').promises;
const { join } = require('path');
const { getSession, requireAuth, requireGuest } = require('../lib/auth');
const { generateCsrfToken } = require('../lib/csrf');
const { getCollection } = require('../lib/mongodb');
const { formatDate, getAvatarEmoji, truncateText } = require('../utils/helpers');
const constants = require('../utils/constants');

// Helper to render EJS views
async function renderView(viewName, data = {}) {
  const viewPath = join(process.cwd(), 'views', `${viewName}.ejs`);
  const template = await readFile(viewPath, 'utf8');
  
  return renderToString(template, {
    ...data,
    formatDate,
    getAvatarEmoji,
    truncateText,
    formatRelativeTime: (date) => {
      if (!date) return '';
      const diff = Date.now() - new Date(date).getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      return formatDate(date);
    },
    constants,
    // Safe defaults for partials
    user: data.user || null,
    success: data.success || [],
    error: data.error || [],
    warning: data.warning || [],
    csrfToken: data.csrfToken || generateCsrfToken()
  });
}

// Render header partial
async function renderHeader(data = {}) {
  const template = await readFile(join(process.cwd(), 'views', 'partials', 'header.ejs'), 'utf8');
  return renderToString(template, {
    ...data,
    user: data.user || null,
    success: data.success || [],
    error: data.error || [],
    warning: data.warning || []
  });
}

// Render footer partial
async function renderFooter(data = {}) {
  const template = await readFile(join(process.cwd(), 'views', 'partials', 'footer.ejs'), 'utf8');
  return renderToString(template, {
    ...data,
    currentYear: new Date().getFullYear()
  });
}

// Main handler
module.exports = async (req, res) => {
  const session = await getSession(req, res);
  const url = new URL(req.url, `https://${req.headers.host}`);
  const pathname = url.pathname;
  
  // Set common headers
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  try {
    // Home page
    if (pathname === '/' || pathname === '/index') {
      if (session.isLoggedIn) {
        res.setHeader('Location', '/dashboard');
        res.statusCode = 302;
        res.end();
        return;
      }
      
      const header = await renderHeader({ user: null });
      const footer = await renderFooter();
      const content = await renderView('index', { 
        title: 'Welcome',
        tagline: constants.APP_TAGLINE
      });
      
      res.end(header + content + footer);
      return;
    }
    
    // Login page
    if (pathname === '/login' && req.method === 'GET') {
      if (session.isLoggedIn) {
        res.setHeader('Location', '/dashboard');
        res.statusCode = 302;
        res.end();
        return;
      }
      
      const header = await renderHeader({ user: null });
      const footer = await renderFooter();
      const content = await renderView('login', { 
        title: 'Login',
        csrfToken: generateCsrfToken()
      });
      
      res.end(header + content + footer);
      return;
    }
    
    // Register page
    if (pathname === '/register' && req.method === 'GET') {
      if (session.isLoggedIn) {
        res.setHeader('Location', '/dashboard');
        res.statusCode = 302;
        res.end();
        return;
      }
      
      const header = await renderHeader({ user: null });
      const footer = await renderFooter();
      const content = await renderView('register', { 
        title: 'Join EthioMatch',
        csrfToken: generateCsrfToken()
      });
      
      res.end(header + content + footer);
      return;
    }
    
    // Dashboard (requires auth)
    if (pathname === '/dashboard') {
      if (!session.isLoggedIn) {
        res.setHeader('Location', '/login');
        res.statusCode = 302;
        res.end();
        return;
      }
      
      const User = await getCollection('users');
      const Match = await getCollection('matches');
      
      const user = await User.findOne({ _id: session.userId });
      if (!user) {
        // Session invalid, clear it
        const newSession = await getSession(req, res);
        await newSession.destroy();
        res.setHeader('Location', '/login');
        res.statusCode = 302;
        res.end();
        return;
      }
      
      // Get potential matches (simplified query)
      const matchedIds = await Match.distinct('user2', { 
        user1: session.userId 
      });
      
      const potentialMatches = await User.find({
        _id: { $nin: [...matchedIds, session.userId] },
        gender: user.lookingFor,
        isActive: true
      }).limit(10).toArray();
      
      const matchCount = await Match.countDocuments({
        $or: [{ user1: session.userId }, { user2: session.userId }],
        status: 'accepted'
      });
      
      const header = await renderHeader({ user });
      const footer = await renderFooter();
      const content = await renderView('dashboard', {
        title: 'Dashboard',
        user,
        potentialMatches,
        matchCount,
        csrfToken: generateCsrfToken()
      });
      
      res.end(header + content + footer);
      return;
    }
    
    // 404 for unmatched routes
    const header = await renderHeader({ user: session.isLoggedIn ? await (await getCollection('users')).findOne({ _id: session.userId }) : null });
    const footer = await renderFooter();
    const content = await renderView('error', {
      title: 'Page Not Found',
      message: 'The page you are looking for does not exist.',
      error: { status: 404 }
    });
    
    res.statusCode = 404;
    res.end(header + content + footer);
    
  } catch (error) {
    console.error('Route handler error:', error);
    
    // Try to render error page
    try {
      const header = await renderHeader({ user: null });
      const footer = await renderFooter();
      const content = await renderView('error', {
        title: 'Error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message,
        error: process.env.NODE_ENV === 'production' ? {} : { status: 500 }
      });
      
      res.statusCode = 500;
      res.end(header + content + footer);
    } catch {
      // Fallback if even error page fails
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Internal Server Error');
    }
  }
};
