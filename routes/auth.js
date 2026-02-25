const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireGuest, requireLogin } = require('../middleware/auth');
const { registerValidation, loginValidation, validate } = require('../middleware/validation');

// Register Page
router.get('/register', requireGuest, (req, res) => {
  res.render('register', { 
    title: 'Join EthioMatch',
    csrfToken: req.csrfToken()
  });
});

// Register Submit
router.post('/register', requireGuest, registerValidation, validate, async (req, res) => {
  try {
    const { username, email, password, age, gender, lookingFor, location, interests } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      req.flash('error', 'Username or email already exists');
      return res.redirect('/register');
    }
    
    // Create user
    const user = new User({
      username,
      email,
      password,
      age,
      gender,
      lookingFor,
      location: location || 'Ethiopia',
      interests: interests ? interests.split(',').map(i => i.trim()) : []
    });
    
    await user.save();
    
    req.flash('success', 'Account created successfully! Please login.');
    res.redirect('/login');
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error', 'Registration failed. Please try again.');
    res.redirect('/register');
  }
});

// Login Page
router.get('/login', requireGuest, (req, res) => {
  res.render('login', { 
    title: 'Login',
    csrfToken: req.csrfToken()
  });
});

// Login Submit
router.post('/login', requireGuest, loginValidation, validate, async (req, res) => {
  try {
    const { username, password, remember } = req.body;
    
    const user = await User.findOne({ 
      $or: [{ username }, { email: username }] 
    }).select('+password');
    
    if (!user || !await user.comparePassword(password)) {
      req.flash('error', 'Invalid username or password');
      return res.redirect('/login');
    }
    
    if (!user.isActive) {
      req.flash('error', 'This account has been deactivated');
      return res.redirect('/login');
    }
    
    // Set session
    req.session.userId = user._id;
    req.session.username = user.username;
    
    if (remember) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    }
    
    await user.updateLastActive();
    
    req.flash('success', `Welcome back, ${user.username}!`);
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    req.flash('error', 'Login failed. Please try again.');
    res.redirect('/login');
  }
});

// Logout
router.get('/logout', requireLogin, (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.redirect('/login');
  });
});

module.exports = router;
