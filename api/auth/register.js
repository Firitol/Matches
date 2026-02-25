// api/auth/register.js
const { getSession, requireGuest } = require('../../lib/auth');
const { generateCsrfToken, verifyCsrfToken } = require('../../lib/csrf');
const { getCollection } = require('../../lib/mongodb');
const bcrypt = require('bcryptjs');
const { renderView, renderHeader, renderFooter } = require('../index');
const constants = require('../../utils/constants');
const { sanitizeInput } = require('../../utils/helpers');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', req.headers.accept?.includes('application/json') 
    ? 'application/json' 
    : 'text/html; charset=utf-8');
  
  // GET: Show registration form
  if (req.method === 'GET') {
    return requireGuest(async (req, res, session) => {
      const header = await renderHeader({ user: null });
      const footer = await renderFooter();
      const content = await renderView('register', {
        title: 'Join EthioMatch',
        csrfToken: generateCsrfToken()
      });
      
      res.end(header + content + footer);
    })(req, res);
  }
  
  // POST: Handle registration
  if (req.method === 'POST') {
    // Parse body (Vercel provides parsed body for application/json and application/x-www-form-urlencoded)
    const { username, email, password, age, gender, lookingFor, location, interests } = req.body || {};
    
    // Validate CSRF
    if (!verifyCsrfToken(req)) {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(403).json({ error: 'CSRF token invalid' });
      }
      res.statusCode = 403;
      return res.end('CSRF token invalid');
    }
    
    // Validate input
    const errors = [];
    
    if (!username || username.length < 3) errors.push('Username must be at least 3 characters');
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.push('Valid email is required');
    if (!password || password.length < 8) errors.push('Password must be at least 8 characters');
    if (!age || age < 18) errors.push('You must be 18 or older');
    if (!['Male', 'Female', 'Other'].includes(gender)) errors.push('Invalid gender');
    if (!['Male', 'Female', 'Both'].includes(lookingFor)) errors.push('Invalid preference');
    
    if (errors.length > 0) {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(400).json({ errors });
      }
      // Re-render form with errors
      const header = await renderHeader({ user: null });
      const footer = await renderFooter();
      const content = await renderView('register', {
        title: 'Join EthioMatch',
        csrfToken: generateCsrfToken(),
        error: errors,
        formData: { username, email, age, gender, lookingFor, location, interests }
      });
      return res.end(header + content + footer);
    }
    
    try {
      const User = await getCollection('users');
      
      // Check for existing user
      const existing = await User.findOne({
        $or: [{ username }, { email: email.toLowerCase() }]
      });
      
      if (existing) {
        if (req.headers.accept?.includes('application/json')) {
          return res.status(400).json({ error: 'Username or email already exists' });
        }
        const header = await renderHeader({ user: null });
        const footer = await renderFooter();
        const content = await renderView('register', {
          title: 'Join EthioMatch',
          csrfToken: generateCsrfToken(),
          error: ['Username or email already exists'],
          formData: { username, email, age, gender, lookingFor, location, interests }
        });
        return res.end(header + content + footer);
      }
      
      // Create user
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const result = await User.insertOne({
        username: sanitizeInput(username),
        email: email.toLowerCase(),
        password: hashedPassword,
        age: parseInt(age),
        gender,
        lookingFor,
        location: sanitizeInput(location) || 'Ethiopia',
        bio: 'Looking for a serious relationship.',
        interests: interests ? interests.split(',').map(i => sanitizeInput(i.trim())).filter(Boolean) : [],
        profileImage: '/images/default-avatar.png',
        isActive: true,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActive: new Date()
      });
      
      // Auto-login after registration
      const session = await getSession(req, res);
      session.userId = result.insertedId.toString();
      session.username = username;
      session.isLoggedIn = true;
      await session.save();
      
      if (req.headers.accept?.includes('application/json')) {
        return res.status(201).json({ 
          success: true, 
          message: 'Account created successfully',
          user: { id: result.insertedId, username, email }
        });
      }
      
      // Redirect to dashboard
      res.setHeader('Location', '/dashboard');
      res.statusCode = 302;
      res.end();
      
    } catch (error) {
      console.error('Registration error:', error);
      
      if (req.headers.accept?.includes('application/json')) {
        return res.status(500).json({ error: 'Registration failed' });
      }
      
      const header = await renderHeader({ user: null });
      const footer = await renderFooter();
      const content = await renderView('register', {
        title: 'Join EthioMatch',
        csrfToken: generateCsrfToken(),
        error: ['Registration failed. Please try again.'],
        formData: { username, email, age, gender, lookingFor, location, interests }
      });
      res.end(header + content + footer);
    }
  }
  
  // Method not allowed
  res.statusCode = 405;
  res.end('Method Not Allowed');
};
