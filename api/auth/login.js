// api/auth/login.js
const { getSession, requireGuest } = require('../../lib/auth');
const { generateCsrfToken, verifyCsrfToken } = require('../../lib/csrf');
const { getCollection } = require('../../lib/mongodb');
const bcrypt = require('bcryptjs');
const { renderView, renderHeader, renderFooter } = require('../index');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', req.headers.accept?.includes('application/json') 
    ? 'application/json' 
    : 'text/html; charset=utf-8');
  
  // GET: Show login form
  if (req.method === 'GET') {
    return requireGuest(async (req, res, session) => {
      const header = await renderHeader({ user: null });
      const footer = await renderFooter();
      const content = await renderView('login', {
        title: 'Login',
        csrfToken: generateCsrfToken()
      });
      
      res.end(header + content + footer);
    })(req, res);
  }
  
  // POST: Handle login
  if (req.method === 'POST') {
    const { username, password } = req.body || {};
    
    // Validate CSRF
    if (!verifyCsrfToken(req)) {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(403).json({ error: 'CSRF token invalid' });
      }
      res.statusCode = 403;
      return res.end('CSRF token invalid');
    }
    
    if (!username || !password) {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      const header = await renderHeader({ user: null });
      const footer = await renderFooter();
      const content = await renderView('login', {
        title: 'Login',
        csrfToken: generateCsrfToken(),
        error: ['Username and password are required']
      });
      return res.end(header + content + footer);
    }
    
    try {
      const User = await getCollection('users');
      
      // Find user (case-insensitive username or email)
      const user = await User.findOne({
        $or: [
          { username: { $regex: new RegExp(`^${username}$`, 'i') }},
          { email: { $regex: new RegExp(`^${username}$`, 'i') }}
        ]
      });
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        if (req.headers.accept?.includes('application/json')) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        const header = await renderHeader({ user: null });
        const footer = await renderFooter();
        const content = await renderView('login', {
          title: 'Login',
          csrfToken: generateCsrfToken(),
          error: ['Invalid username or password']
        });
        return res.end(header + content + footer);
      }
      
      if (!user.isActive) {
        if (req.headers.accept?.includes('application/json')) {
          return res.status(403).json({ error: 'Account is deactivated' });
        }
        const header = await renderHeader({ user: null });
        const footer = await renderFooter();
        const content = await renderView('login', {
          title: 'Login',
          csrfToken: generateCsrfToken(),
          error: ['Account is deactivated']
        });
        return res.end(header + content + footer);
      }
      
      // Create session
      const session = await getSession(req, res);
      session.userId = user._id.toString();
      session.username = user.username;
      session.isLoggedIn = true;
      await session.save();
      
      // Update last active
      await User.updateOne(
        { _id: user._id },
        { $set: { lastActive: new Date() } }
      );
      
      if (req.headers.accept?.includes('application/json')) {
        return res.status(200).json({ 
          success: true, 
          message: 'Login successful',
          user: { id: user._id, username: user.username, email: user.email }
        });
      }
      
      // Redirect to dashboard
      res.setHeader('Location', '/dashboard');
      res.statusCode = 302;
      res.end();
      
    } catch (error) {
      console.error('Login error:', error);
      
      if (req.headers.accept?.includes('application/json')) {
        return res.status(500).json({ error: 'Login failed' });
      }
      
      const header = await renderHeader({ user: null });
      const footer = await renderFooter();
      const content = await renderView('login', {
        title: 'Login',
        csrfToken: generateCsrfToken(),
        error: ['Login failed. Please try again.']
      });
      res.end(header + content + footer);
    }
  }
  
  res.statusCode = 405;
  res.end('Method Not Allowed');
};
