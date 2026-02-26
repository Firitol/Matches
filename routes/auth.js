// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireLogin, requireGuest } = require('../middleware/auth');
const { registerValidation, loginValidation, validate } = require('../middleware/validation');

// Register GET
router.get('/register', requireGuest, (req, res) => {
  res.render('register', { title: 'Join EthioMatch' });
});

// Register POST
router.post('/register', requireGuest, registerValidation, validate, async (req, res) => {
  try {
    const { username, email, password, age, gender, lookingFor, location, interests } = req.body;
    
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      req.flash('error', 'Username or email already exists');
      return res.redirect('/register');
    }
    
    const user = new User({
      username, email, password, age, gender, lookingFor,
      location: location || 'Ethiopia',
      interests: interests ? interests.split(',').map(i => i.trim()).filter(Boolean) : []
    });
    
    await user.save();
    req.flash('success', 'Account created! Please login.');
    res.redirect('/login');
  } catch (error) {
    console.error('Register error:', error.message);
    req.flash('error', 'Registration failed');
    res.redirect('/register');
  }
});

// Login GET
router.get('/login', requireGuest, (req, res) => {
  res.render('login', { title: 'Login' });
});

// Login POST
router.post('/login', requireGuest, loginValidation, validate, async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ $or: [{ username }, { email: username }] }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/login');
    }
    
    if (!user.isActive) {
      req.flash('error', 'Account deactivated');
      return res.redirect('/login');
    }
    
    req.session.userId = user._id.toString();
    req.session.username = user.username;
    await user.updateLastActive();
    
    req.flash('success', `Welcome back, ${user.username}!`);
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error.message);
    req.flash('error', 'Login failed');
    res.redirect('/login');
  }
});

// Logout
router.get('/logout', requireLogin, (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
