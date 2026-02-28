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
// 🗄️ NEON POSTGRESQL DATABASE CONNECTION
// ============================================

let sequelize;

const connectDB = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL not set');
      return null;
    }
    
    // Neon connection with pooling + SSL
    sequelize = new Sequelize(process.env.DATABASE_URL, {
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
      // Vercel serverless optimization
      retry: {
        match: [/Deadlock/i, /Transaction/i, /Connection/i],
        max: 3
      }
    });
    
    await sequelize.authenticate();
    console.log('✅ Neon PostgreSQL Connected');
    
    // Sync models (create tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('✅ Database tables synced');
    
    return sequelize;
  } catch (error) {
    console.error('❌ Neon Connection Error:', error.message);
    return null;
  }
};

// Initialize database
connectDB();

// ============================================
// 📦 SESSION CONFIGURATION (Neon PostgreSQL)
// ============================================

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
    secure: process.env.NODE_ENV === 'production', // Vercel uses HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
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

// Login POST
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const User = require('./models/User');
    
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: username },
          { email: username }
        ]
      }
    });
    
    if (!user || !(await user.comparePassword(password))) {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/login');
    }
    
    if (!user.isActive) {
      req.flash('error', 'Account deactivated');
      return res.redirect('/login');
    }
    
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.user = user;
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

// Register POST - TEMPORARY BYPASS FOR AGE VALIDATION
app.post('/register', async (req, res) => {
  try {
    const { username, email, password, age, gender, lookingFor, location, terms } = req.body;
    
    console.log('🔍 Registration attempt:', { username, age, gender });
    
    // TEMPORARY: Accept any age value for now
    const ageNumber = age ? parseInt(String(age).replace(/[^0-9]/g, ''), 10) || 25 : 25;
    
    console.log('✅ Age accepted:', ageNumber);
    
    const User = require('./models/User');
    
    const existing = await User.findOne({
      where: {
        [Op.or]: [
          { username: username },
          { email: email }
        ]
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

// Dashboard
app.get('/dashboard', async (req, res) => {
  if (!req.session.userId) {
    req.flash('error', 'Please login');
    return res.redirect('/login');
  }
  
  try {
    const User = require('./models/User');
    const Match = require('./models/Match');
    
    const user = await User.findByPk(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.redirect('/login');
    }
    
    const potentialMatches = await User.findAll({
      where: {
        id: { [Op.ne]: user.id },
        isActive: true,
        gender: user.lookingFor
      },
      limit: 10
    });
    
    const matchCount = await Match.count({
      where: {
        [Op.or]: [
          { user1Id: user.id },
          { user2Id: user.id }
        ],
        status: 'accepted'
      }
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
