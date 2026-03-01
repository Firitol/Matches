// server.js - VERCEL + NEON PRODUCTION READY
require('dotenv').config();

// 🔍 DEBUG: Log environment variables
console.log('=== ENVIRONMENT DEBUG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL length:', process.env.DATABASE_URL.length);
  console.log('DATABASE_URL starts with postgres://:', process.env.DATABASE_URL.startsWith('postgres://'));
  // Log first 80 chars (hide password)
  const [protocol, rest] = process.env.DATABASE_URL.split('://');
  const [creds, hostPart] = rest.split('@');
  const [host, path] = hostPart.split('/');
  console.log('DATABASE_URL parsed host:', host);
  console.log('DATABASE_URL parsed database:', path?.split('?')[0]);
}
console.log('=========================');
const express = require('express');
const session = require('express-session');
const PostgreSQLStore = require('connect-pg-simple')(session);
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const flash = require('express-flash');
const { Sequelize, Op } = require('sequelize');

const app = express();

// ============================================
// ============================================
// 🗄️ NEON POSTGRESQL DATABASE CONNECTION
// ============================================

let sequelize;

const connectDB = async () => {
  try {
    // Debug logging
    console.log('🔍 DATABASE_URL Debug:');
    console.log('  - Exists:', !!process.env.DATABASE_URL);
    console.log('  - Type:', typeof process.env.DATABASE_URL);
    console.log('  - Length:', process.env.DATABASE_URL?.length);
    console.log('  - Trimmed:', process.env.DATABASE_URL?.trim() === process.env.DATABASE_URL);
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ FATAL: DATABASE_URL is not set!');
      console.error('   Add it in Vercel Dashboard → Settings → Environment Variables');
      return null;
    }
    
    // Clean the connection string (remove quotes, whitespace)
    let dbUrl = process.env.DATABASE_URL.trim();
    
    // Remove common prefixes/suffixes
    if (dbUrl.startsWith('"') && dbUrl.endsWith('"')) {
      dbUrl = dbUrl.slice(1, -1);
      console.log('🔧 Removed surrounding quotes from DATABASE_URL');
    }
    if (dbUrl.startsWith("'") && dbUrl.endsWith("'")) {
      dbUrl = dbUrl.slice(1, -1);
      console.log('🔧 Removed surrounding single quotes from DATABASE_URL');
    }
    if (dbUrl.startsWith('psql ')) {
      dbUrl = dbUrl.replace(/^psql\s+/, '');
      console.log('🔧 Removed psql prefix from DATABASE_URL');
    }
    
    // Ensure correct protocol
    if (dbUrl.startsWith('postgresql://')) {
      dbUrl = dbUrl.replace('postgresql://', 'postgres://');
      console.log('🔧 Changed postgresql:// to postgres://');
    }
    
    // Ensure sslmode is present
    if (!dbUrl.includes('sslmode=')) {
      dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'sslmode=require';
      console.log('🔧 Added sslmode=require to DATABASE_URL');
    }
    
    console.log('✅ Cleaned DATABASE_URL ready for connection');
    
    // Connect with cleaned URL
    sequelize = new Sequelize(dbUrl, {
      dialect: 'postgres',
      protocol: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      retry: {
        match: [/Deadlock/i, /Transaction/i, /Connection/i],
        max: 3
      }
    });
    
    await sequelize.authenticate();
    console.log('✅ Neon PostgreSQL Connected Successfully!');
    
    await sequelize.sync({ alter: true });
    console.log('✅ Database tables synced');
    
    return sequelize;
  } catch (error) {
    console.error('❌ Neon Connection Error:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Full error:', error);
    return null;
  }
};

// Initialize database
connectDB();

// ============================================
// 📦 SESSION CONFIGURATION 
const session = require('express-session');
const PostgreSQLStore = require('connect-pg-simple')(session);

app.use(session({
  store: new PostgreSQLStore({
    conObject: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    },
    tableName: 'session',
    createTableIfMissing: true,
    errorLog: console.error.bind(console)
  }),
  secret: process.env.SESSION_SECRET || 'fallback_secret_min_32_chars_here!!',
  resave: false,
  saveUninitialized: false,
  cookie: {
    // ✅ Vercel uses HTTPS, but serverless needs this setting
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,  // 1 day
    sameSite: 'lax',  // ✅ Critical for cross-origin serverless
    path: '/'  // ✅ Ensure cookie works on all routes
  },
  name: 'ethiomatch.sid'
}));
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
// 🔐 CSRF PROTECTION (Temporary Bypass for Debug)
// ============================================

app.use((req, res, next) => {
  res.locals.csrfToken = 'bypass-token';
  next();
});

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

const constants = {
  APP_NAME: 'EthioMatch',
  APP_TAGLINE: 'Find serious relationships with Ethiopians worldwide'
};

app.use(async (req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.warning = req.flash('warning');
  res.locals.info = req.flash('info');
  res.locals.appName = constants.APP_NAME;
  res.locals.currentYear = new Date().getFullYear();
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
    await sequelize.query('SELECT 1');
    dbStatus = 'connected';
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

// Register POST - PRODUCTION READY
app.post('/register', async (req, res) => {
  try {
    const { username, email, password, age, gender, lookingFor, location, terms } = req.body;
    
    // Validate required fields
    if (!username || username.trim().length < 3) {
      req.flash('error', 'Username must be at least 3 characters');
      return res.redirect('/register');
    }
    
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      req.flash('error', 'Please enter a valid email');
      return res.redirect('/register');
    }
    
    if (!password || password.length < 8) {
      req.flash('error', 'Password must be at least 8 characters');
      return res.redirect('/register');
    }
    
    // ✅ Age validation: convert to number + strict bounds check
    const ageNumber = parseInt(String(age).trim(), 10);
    if (isNaN(ageNumber) || ageNumber < 18 || ageNumber > 100) {
      req.flash('error', 'You must be 18-100 years old');
      return res.redirect('/register');
    }
    
    if (!gender || !['Male', 'Female', 'Other'].includes(gender)) {
      req.flash('error', 'Please select a valid gender');
      return res.redirect('/register');
    }
    
    if (!lookingFor || !['Male', 'Female', 'Both'].includes(lookingFor)) {
      req.flash('error', 'Please select what you are looking for');
      return res.redirect('/register');
    }
    
    if (!terms) {
      req.flash('error', 'You must agree to the Terms of Service');
      return res.redirect('/register');
    }
    
    const User = require('./models/User');
    
    // Check for existing user (case-insensitive username)
    const existing = await User.findOne({
      where: {
        [Op.or]: [
          { username: { [Op.iLike]: username.trim() } },
          { email: { [Op.iLike]: email.toLowerCase() } }
        ]
      }
    });
    
    if (existing) {
      req.flash('error', 'Username or email already exists');
      return res.redirect('/register');
    }
    
    // Create user - PostgreSQL + Sequelize will enforce age constraint
    const user = await User.create({
      username: username.trim(),
      email: email.toLowerCase(),
      password: password,
      age: ageNumber,  // Stored as INTEGER
      gender: gender,
      lookingFor: lookingFor,
      location: location || 'Ethiopia'
    });
    
    req.flash('success', 'Account created! Please login.');
    res.redirect('/login');
    
  } catch (error) {
    console.error('Register error:', error.message);
    
    // Handle database/validation errors gracefully
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message);
      req.flash('error', messages);
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      req.flash('error', 'Username or email already exists');
    } else if (error.message.includes('users_age_check')) {
      req.flash('error', 'Age must be between 18 and 100');
    } else {
      req.flash('error', 'Registration failed. Please try again.');
    }
    
    res.redirect('/register');
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
    
    if (existing) {
      req.flash('error', 'Username or email already exists');
      return res.redirect('/register');
    }
    
    const user = await User.create({
      username: username.trim(),
      email: email.toLowerCase(),
      password: password,
      age: ageNumber,
      gender: gender,
      lookingFor: lookingFor,
      location: location || 'Ethiopia'
    });
    
    console.log('✅ User created:', user.username, 'Age:', user.age);
    
    req.flash('success', 'Account created! Please login.');
    res.redirect('/login');
    
  } catch (error) {
    console.error('Register error:', error.message);
    
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message);
      req.flash('error', messages);
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      req.flash('error', 'Username or email already exists');
    } else {
      req.flash('error', 'Registration failed: ' + error.message);
    }
    
    res.redirect('/register');
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// ============================================
// 📊 DASHBOARD ROUTE - PRODUCTION READY
// ============================================

app.get('/dashboard', async (req, res) => {
  try {
    // 🔐 Authentication Check
    if (!req.session.userId) {
      req.flash('error', 'Please login to continue');
      return res.redirect('/login');
    }
    
    const User = require('./models/User');
    const Match = require('./models/Match');
    
    // 👤 Fetch Current User
    const user = await User.findByPk(req.session.userId, {
      attributes: {
        exclude: ['password'] // Never send password to frontend
      }
    });
    
    // Handle deleted/deactivated account
    if (!user || !user.isActive) {
      req.session.destroy();
      req.flash('error', 'Account not found or deactivated');
      return res.redirect('/login');
    }
    
    // 🔄 Update last active timestamp
    await user.updateLastActive().catch(() => {}); // Non-blocking
    
    // 💕 Fetch Accepted Matches
    const acceptedMatches = await Match.findAll({
      where: {
        [Op.or]: [
          { user1Id: user.id },
          { user2Id: user.id }
        ],
        status: 'accepted'
      },
      include: [
        {
          model: User,
          as: 'user1',
          attributes: ['id', 'username', 'age', 'profileImage', 'location']
        },
        {
          model: User,
          as: 'user2',
          attributes: ['id', 'username', 'age', 'profileImage', 'location']
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit: 20
    });
    
    // Transform matches to show the "other" user
    const matches = acceptedMatches.map(match => {
      const isUser1 = match.user1Id === user.id;
      return isUser1 ? match.user2 : match.user1;
    }).filter(Boolean); // Remove any nulls
    
    // 🔍 Fetch Potential Matches (not yet matched)
    // Exclude: current user, already matched users, blocked users
    const matchedUserIds = matches.map(m => m.id);
    
    const potentialMatches = await User.findAll({
      where: {
        id: {
          [Op.notIn]: [user.id, ...matchedUserIds]
        },
        isActive: true,
        gender: user.lookingFor,
        age: { [Op.between]: [18, 100] }
      },
      attributes: ['id', 'username', 'age', 'bio', 'location', 'profileImage', 'interests'],
      limit: 12,
      order: [['lastActive', 'DESC']]
    });
    
    // 📊 Fetch Stats
    const [matchCount, likeCount] = await Promise.all([
      Match.count({
        where: {
          [Op.or]: [{ user1Id: user.id }, { user2Id: user.id }],
          status: 'accepted'
        }
      }),
      Match.count({
        where: {
          [Op.or]: [{ user1Id: user.id }, { user2Id: user.id }],
          status: 'pending'
        }
      })
    ]);
    
    // 🎨 Render Dashboard with Data
res.render('dashboard', {
  title: 'Dashboard',
  
  // 👤 Current User Data (sanitized - no password)
  user: {
    id: user.id,
    username: user.username,
    email: user.email,
    age: user.age,
    gender: user.gender,
    lookingFor: user.lookingFor,
    location: user.location,
    bio: user.bio,
    interests: user.interests,
    profileImage: user.profileImage,
    isVerified: user.isVerified,
    lastActive: user.lastActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  },
  
  // 💕 Accepted Matches (other user in each match)
  matches: matches,
  
  // 🔍 Potential Matches (people to browse)
  potentialMatches: potentialMatches,
  
  // 📊 Stats for display
  stats: {
    matchCount: matchCount,
    likeCount: likeCount,
    potentialCount: potentialMatches.length
  },
  
  // 🎯 For highlighting active nav item
  activePage: 'dashboard',
  
  // 🌍 Global helpers (if not already in app.use)
  formatDate: (date) => new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }),
  truncateText: (text, length) => {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  }
});
    
  } catch (error) {
    // 🚨 Production Error Handling
    console.error('Dashboard error:', {
      message: error.message,
      userId: req.session?.userId,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    // Don't expose internal errors to users
    req.flash('error', 'Failed to load dashboard. Please try again.');
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
    const user = await User.findByPk(req.session.userId);
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
    const user = await User.findByPk(req.session.userId);
    
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
    
    const matches = await Match.findAll({
      where: {
        [Op.or]: [
          { user1Id: req.session.userId },
          { user2Id: req.session.userId }
        ],
        status: 'accepted'
      },
      include: [
        { model: User, as: 'user1', attributes: ['id', 'username', 'age', 'profileImage'] },
        { model: User, as: 'user2', attributes: ['id', 'username', 'age', 'profileImage'] }
      ]
    });
    
    const matchList = matches.map(m => {
      return m.user1Id === req.session.userId ? m.user2 : m.user1;
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
      where: {
        [Op.or]: [
          { user1Id: req.session.userId, user2Id: userId },
          { user1Id: userId, user2Id: req.session.userId }
        ]
      }
    });
    
    if (!match) {
      match = await Match.create({
        user1Id: req.session.userId,
        user2Id: userId,
        likedBy: [req.session.userId],
        status: 'pending'
      });
    } else {
      const alreadyLiked = match.likedBy?.includes(req.session.userId);
      if (!alreadyLiked) {
        match.likedBy.push(req.session.userId);
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
    const User = require('./models/User');
    
    const match = await Match.findOne({
      where: {
        id: matchId,
        [Op.or]: [
          { user1Id: req.session.userId },
          { user2Id: req.session.userId }
        ],
        status: 'accepted'
      },
      include: [
        { model: User, as: 'user1', attributes: ['id', 'username', 'profileImage'] },
        { model: User, as: 'user2', attributes: ['id', 'username', 'profileImage'] }
      ]
    });
    
    if (!match) return res.redirect('/matches');
    
    const otherUser = match.user1Id === req.session.userId ? match.user2 : match.user1;
    
    res.render('messages', { title: 'Messages', match, otherUser, messages: [] });
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
// 🚀 START SERVER (Vercel Compatible)
// ============================================

const PORT = process.env.PORT || 3000;

// Vercel uses app.listen without callback for serverless
const server = app.listen(PORT, () => {
  console.log(`🚀 EthioMatch running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown for Vercel
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    if (sequelize) sequelize.close();
    process.exit(0);
  });
});

module.exports = app;
// 🔍 TEMPORARY DEBUG ROUTE - REMOVE AFTER TESTING
app.get('/debug/env', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  const dbUrl = process.env.DATABASE_URL;
  
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: {
      exists: !!dbUrl,
      length: dbUrl?.length,
      startsWith: dbUrl?.substring(0, 20) + '...',
      hasSSL: dbUrl?.includes('sslmode=require'),
      // Parse hostname
      hostname: dbUrl ? (() => {
        try {
          const url = new URL(dbUrl);
          return url.hostname;
        } catch {
          return 'INVALID_URL';
        }
      })() : null
    },
    SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'MISSING',
    CSRF_SECRET: process.env.CSRF_SECRET ? 'SET' : 'MISSING'
  });
});
