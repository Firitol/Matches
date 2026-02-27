// server.js - RENDER PRODUCTION READY
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { doubleCsrf } = require('csrf-csrf');
const path = require('path');
const flash = require('express-flash');

const app = express();

// ============================================
// 🛡️ SECURITY MIDDLEWARE
// ============================================

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests' }
});
app.use('/api/', limiter);

// ============================================
// 🔐 CSRF PROTECTION
// ============================================

const csrfEnabled = process.env.CSRF_SECRET && process.env.CSRF_SECRET.length >= 32;

if (csrfEnabled) {
  const { generateToken, doubleCsrfProtection } = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET,
    cookieName: 'ethiomatch_csrf',
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    },
    size: 32,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS']
  });

  app.use((req, res, next) => {
    try {
      res.locals.csrfToken = generateToken(req, res);
    } catch (e) {
      res.locals.csrfToken = '';
    }
    next();
  });
  app.use(doubleCsrfProtection);
} else {
  console.log('ℹ️ CSRF: Set CSRF_SECRET env var (32+ chars) for production');
  app.use((req, res, next) => {
    res.locals.csrfToken = 'dev-token';
    next();
  });
}

// ============================================
// 🗄️ MONGODB CONNECTION
// ============================================

let mongooseInstance = null;

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn('⚠️ MONGODB_URI not set, database unavailable');
      return null;
    }
    
    if (mongooseInstance && mongooseInstance.connection.readyState !== 0) {
      await mongooseInstance.disconnect();
    }
    
    mongooseInstance = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      tls: true,
      tlsAllowInvalidCertificates: false,
      retryWrites: true,
      w: 'majority',
      appName: 'EthioMatch'
    });
    
    console.log('✅ MongoDB Connected');
    return mongooseInstance;
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    return null;
  }
};

connectDB();

let reconnectTimeout = null;
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected, attempting reconnect in 5s...');
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  reconnectTimeout = setTimeout(() => connectDB(), 5000);
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err.message);
});

// ============================================
// 📦 SESSION CONFIGURATION
// ============================================

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_min_32_chars_here!!',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60,
    autoRemove: 'native'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  },
  name: 'ethiomatch.sid'
}));

// ============================================
// 🎨 VIEW ENGINE & STATIC FILES
// ============================================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// 📝 REQUEST PARSING & LOGGING
// ============================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} in ${duration}ms`);
  });
  next();
});

app.use(flash());

// ============================================
// 🌍 GLOBAL VARIABLES FOR VIEWS
// ============================================

const User = require('./models/User');
const { formatDate, getAvatarEmoji, truncateText, formatRelativeTime, isOnline } = require('./utils/helpers');
const constants = require('./utils/constants');

app.use(async (req, res, next) => {
  res.locals.user = null;
  if (req.session.userId) {
    try {
      res.locals.user = await User.findById(req.session.userId);
    } catch (e) {
      // User not found
    }
  }
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.warning = req.flash('warning');
  res.locals.info = req.flash('info');
  res.locals.appName = constants.APP_NAME;
  res.locals.currentYear = new Date().getFullYear();
  res.locals.formatDate = formatDate;
  res.locals.formatRelativeTime = formatRelativeTime;
  res.locals.getAvatarEmoji = getAvatarEmoji;
  res.locals.truncateText = truncateText;
  res.locals.isOnline = isOnline;
  res.locals.constants = constants;
  next();
});

// ============================================
// 🚦 ROUTES
// ============================================

// Health Check
app.get('/health', async (req, res) => {
  let dbStatus = 'unknown';
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      dbStatus = 'connected';
    } else {
      dbStatus = 'disconnected';
    }
  } catch (e) {
    dbStatus = 'error: ' + e.message;
  }
  
  res.json({
    status: dbStatus === 'connected' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus
  });
});

// Home Page
app.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/dashboard');
  } else {
    res.render('index', { title: 'Welcome', tagline: constants.APP_TAGLINE });
  }
});

// Login GET
app.get('/login', (req, res) => {
  if (req.session.userId) {
    res.redirect('/dashboard');
  } else {
    res.render('login', { title: 'Login' });
  }
});

// Login POST
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const User = require('./models/User');
    const user = await User.findOne({ 
      $or: [{ username }, { email: username }] 
    }).select('+password');
    
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
    
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error.message);
    req.flash('error', 'Login failed');
    res.redirect('/login');
  }
});

// Register GET
app.get('/register', (req, res) => {
  if (req.session.userId) {
    res.redirect('/dashboard');
  } else {
    res.render('register', { title: 'Join EthioMatch' });
  }
});

// Register POST - ✅ AGE VALIDATION FIXED
app.post('/register', async (req, res) => {
  try {
    const { username, email, password, age, gender, lookingFor, location } = req.body;
    
    // 🔍 DEBUG: Log what we're receiving
    console.log('=== REGISTRATION DEBUG ===');
    console.log('Raw age value:', age);
    console.log('Age type:', typeof age);
    console.log('Age length:', age ? age.length : 'N/A');
    
    // ✅ FIX: Convert age to number multiple ways
    const ageNumber = parseInt(String(age).trim(), 10);
    const ageNumber2 = Number(age);
    
    console.log('Parsed age (parseInt):', ageNumber);
    console.log('Parsed age (Number):', ageNumber2);
    console.log('Is NaN:', isNaN(ageNumber));
    console.log('Is valid number:', !isNaN(ageNumber) && ageNumber >= 18 && ageNumber <= 100);
    console.log('========================');
    
    // Validate username
    if (!username || username.trim().length < 3) {
      req.flash('error', 'Username must be at least 3 characters');
      return res.redirect('/register');
    }
    
    // Validate email
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      req.flash('error', 'Please enter a valid email');
      return res.redirect('/register');
    }
    
    // Validate password
    if (!password || password.length < 8) {
      req.flash('error', 'Password must be at least 8 characters');
      return res.redirect('/register');
    }
    
    // ✅ FIX: Multiple validation checks for age
    if (!age) {
      req.flash('error', 'Age is required');
      return res.redirect('/register');
    }
    
    if (isNaN(ageNumber) || ageNumber < 18 || ageNumber > 100) {
      req.flash('error', `You must be 18-100 years old (received: ${age})`);
      return res.redirect('/register');
    }
    
    // Validate gender
    if (!gender || !['Male', 'Female', 'Other'].includes(gender)) {
      req.flash('error', 'Please select a valid gender');
      return res.redirect('/register');
    }
    
    // Validate lookingFor
    if (!lookingFor || !['Male', 'Female', 'Both'].includes(lookingFor)) {
      req.flash('error', 'Please select what you are looking for');
      return res.redirect('/register');
    }
    
    const User = require('./models/User');
    
    // Check for existing user
    const existing = await User.findOne({ 
      $or: [{ username }, { email: email.toLowerCase() }] 
    });
    
    if (existing) {
      req.flash('error', 'Username or email already exists');
      return res.redirect('/register');
    }
    
    // Create new user
    const user = new User({
      username: username.trim(),
      email: email.toLowerCase(),
      password,
      age: ageNumber,
      gender,
      lookingFor,
      location: location || 'Ethiopia'
    });
    
    await user.save();
    
    console.log('✅ User created successfully:', user.username, 'Age:', user.age);
    
    req.flash('success', 'Account created! Please login.');
    res.redirect('/login');
    
  } catch (error) {
    console.error('Register error:', error.message);
    console.error('Error details:', error);
    req.flash('error', 'Registration failed: ' + error.message);
    res.redirect('/register');
  }
});
// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Dashboard
app.get('/dashboard', async (req, res) => {
  if (!req.session.userId) {
    req.flash('error', 'Please login');
    return res.redirect('/login');
  }
  
  try {
    const User = require('./models/User');
    const Match = require('./models/Match');
    
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.redirect('/login');
    }
    
    const matched = await Match.find({
      $or: [{ user1: user._id }, { user2: user._id }]
    }).distinct('user1').concat(
      await Match.find({ $or: [{ user1: user._id }, { user2: user._id }] }).distinct('user2')
    );
    
    const potentialMatches = await User.find({
      _id: { $nin: [...matched.map(id => id.toString()), user._id.toString()] },
      isActive: true,
      gender: user.lookingFor
    }).limit(10);
    
    const matchCount = await Match.countDocuments({
      $or: [{ user1: user._id }, { user2: user._id }],
      status: 'accepted'
    });
    
    res.render('dashboard', { title: 'Dashboard', user, potentialMatches, matchCount });
  } catch (error) {
    console.error('Dashboard error:', error.message);
    req.flash('error', 'Failed to load dashboard');
    res.redirect('/');
  }
});

// Profile GET
app.get('/profile', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  
  try {
    const User = require('./models/User');
    const user = await User.findById(req.session.userId);
    res.render('profile', { title: 'My Profile', user });
  } catch (error) {
    console.error('Profile error:', error.message);
    res.redirect('/dashboard');
  }
});

// Profile POST
app.post('/profile', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  
  try {
    const { bio, location, interests } = req.body;
    const User = require('./models/User');
    const user = await User.findById(req.session.userId);
    
    if (bio !== undefined) user.bio = bio.substring(0, 500);
    if (location !== undefined) user.location = location.substring(0, 100);
    if (interests !== undefined) {
      user.interests = interests.split(',').map(i => i.trim()).filter(Boolean).slice(0, 20);
    }
    
    await user.save();
    req.flash('success', 'Profile updated!');
    res.redirect('/profile');
  } catch (error) {
    console.error('Profile update error:', error.message);
    req.flash('error', 'Failed to update profile');
    res.redirect('/profile');
  }
});

// Matches
app.get('/matches', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  
  try {
    const Match = require('./models/Match');
    const User = require('./models/User');
    
    const matches = await Match.find({
      $or: [{ user1: req.session.userId }, { user2: req.session.userId }],
      status: 'accepted'
    }).populate('user1', 'username age profileImage')
      .populate('user2', 'username age profileImage');
    
    const matchList = matches.map(m => {
      return m.user1._id.toString() === req.session.userId ? m.user2 : m.user1;
    });
    
    res.render('matches', { title: 'My Matches', matches: matchList });
  } catch (error) {
    console.error('Matches error:', error.message);
    res.redirect('/dashboard');
  }
});

// Like User
app.post('/like/:userId', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  try {
    const { userId } = req.params;
    const Match = require('./models/Match');
    
    let match = await Match.findOne({
      $or: [
        { user1: req.session.userId, user2: userId },
        { user1: userId, user2: req.session.userId }
      ]
    });
    
    if (!match) {
      match = new Match({
        user1: req.session.userId,
        user2: userId,
        likedBy: [{ userId: req.session.userId }]
      });
      await match.save();
    } else {
      const alreadyLiked = match.likedBy?.some(l => l.userId?.toString() === req.session.userId);
      if (!alreadyLiked) {
        match.likedBy.push({ userId: req.session.userId });
        await match.save();
      }
    }
    
    const isMatch = match.likedBy.length >= 2;
    res.json({ success: true, isMatch, message: isMatch ? "It's a match!" : "Like sent!" });
  } catch (error) {
    console.error('Like error:', error.message);
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

// Messages
app.get('/messages/:matchId', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  
  try {
    const { matchId } = req.params;
    const Match = require('./models/Match');
    const Message = require('./models/Message');
    const User = require('./models/User');
    
    const match = await Match.findOne({
      _id: matchId,
      $or: [{ user1: req.session.userId }, { user2: req.session.userId }],
      status: 'accepted'
    });
    
    if (!match) return res.redirect('/matches');
    
    const otherId = match.user1.toString() === req.session.userId ? match.user2 : match.user1;
    const otherUser = await User.findById(otherId);
    const messages = await Message.find({ matchId }).populate('sender', 'username').sort({ createdAt: 1 });
    
    res.render('messages', { title: 'Messages', match, otherUser, messages });
  } catch (error) {
    console.error('Messages error:', error.message);
    res.redirect('/matches');
  }
});

// 404 Handler
app.use((req, res) => {
  if (res.headersSent) return;
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    error: { status: 404 }
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  
  if (res.headersSent) {
    return next(err);
  }
  
  console.error('Stack:', err.stack);
  
  if (req.headers.accept?.includes('application/json')) {
    return res.status(err.status || 500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
  
  res.status(err.status || 500);
  
  try {
    res.render('error', {
      title: 'Error',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
      error: process.env.NODE_ENV === 'production' ? {} : err
    });
  } catch (renderErr) {
    console.error('Failed to render error page:', renderErr.message);
    res.type('text').send('500 - Internal Server Error');
  }
});

// ============================================
// 🚀 START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 EthioMatch running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// ============================================
// 🛑 GRACEFUL SHUTDOWN
// ============================================

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(() => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(() => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

module.exports = app;
