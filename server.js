// server.js - EthioMatch Production Ready (Vercel + Neon + PostgreSQL)
if (process.env.NODE_ENV === 'production') {
  process.on('warning', (warning) => {
    if (warning.name === 'SecurityWarning' && warning.message.includes('sslmode')) {
      return; // Ignore this specific warning
    }
    console.warn(warning); // Log other warnings
  });
}
require('dotenv').config();

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
      console.error('❌ DATABASE_URL not set in environment variables');
      return null;
    }
    
    let dbUrl = process.env.DATABASE_URL.trim();
    if (dbUrl.startsWith('"') && dbUrl.endsWith('"')) dbUrl = dbUrl.slice(1, -1);
    if (dbUrl.startsWith("'") && dbUrl.endsWith("'")) dbUrl = dbUrl.slice(1, -1);
    if (dbUrl.startsWith('psql ')) dbUrl = dbUrl.replace(/^psql\s+/, '');
    if (dbUrl.startsWith('postgresql://')) dbUrl = dbUrl.replace('postgresql://', 'postgres://');
    if (!dbUrl.includes('sslmode=')) dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'sslmode=require';
    
    sequelize = new Sequelize(dbUrl, {
      dialect: 'postgres',
      protocol: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
      },
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
      retry: { match: [/Deadlock/i, /Transaction/i, /Connection/i], max: 3 }
    });
    
    await sequelize.authenticate();
    console.log('✅ Neon PostgreSQL Connected');
    
    await sequelize.sync({ alter: true });
    console.log('✅ Database tables synced');
    
    return sequelize;
  } catch (error) {
    console.error('❌ Neon Connection Error:', error.message);
    return null;
  }
};

connectDB();

// 📦 SESSION CONFIGURATION - Vercel Preview + Production Compatible
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
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    path: '/',
    // ✅ Critical: Allow cookies on Vercel preview domains
    domain: process.env.VERCEL_URL
      ? '.' + process.env.VERCEL_URL.replace(/^https?:\/\//, '') 
      : undefined
  },
  name: 'ethiomatch.sid'
}));
// 🔍 SESSION DEBUG - Add after app.use(session(...))
app.use((req, res, next) => {
  if (req.path === '/dashboard' || req.path === '/login') {
    console.log('🔍 Session Debug:', {
      path: req.path,
      sessionId: req.sessionID?.substring(0, 12),
      userId: req.session?.userId,
      hasCookie: !!req.headers.cookie,
      vercelUrl: process.env.VERCEL_URL
    });
  }
  next();
});
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
// 🔐 CSRF TOKEN
// ============================================

app.use((req, res, next) => {
  if (!res.locals.csrfToken) {
    res.locals.csrfToken = process.env.CSRF_SECRET 
      ? require('crypto').randomBytes(32).toString('hex')
      : 'dev-token';
  }
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
  res.locals.formatDate = (date) => new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
  res.locals.truncateText = (text, length) => {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  };
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

// Login GET - SIMPLIFIED
app.get('/login', (req, res) => {
  console.log('🔍 GET /login - Rendering login page');
  console.log('  - Session userId:', req.session.userId);
  console.log('  - Already logged in:', !!req.session.userId);
  
  if (req.session.userId) {
    console.log('  - Redirecting to /dashboard (already logged in)');
    return res.redirect('/dashboard');
  }
  
  try {
    res.render('login', { 
      title: 'Login',
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (error) {
    console.error('❌ Login page render error:', error.message);
    res.status(500).send('Error loading login page: ' + error.message);
  }
});

// Login POST - SIMPLIFIED
app.post('/login', async (req, res) => {
  console.log('🔍 POST /login - Attempting login');
  console.log('  - Body:', JSON.stringify(req.body));
  
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      req.flash('error', 'Please enter username and password');
      return res.redirect('/login');
    }
    
    const User = require('./models/User');
    
    console.log('  - Searching for user:', username);
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: { [Op.iLike]: username } },
          { email: { [Op.iLike]: username } }
        ]
      }
    });
    
    console.log('  - User found:', !!user);
    
    if (!user) {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/login');
    }
    
    console.log('  - Comparing password...');
    const isMatch = await user.comparePassword(password);
    console.log('  - Password match:', isMatch);
    
    if (!isMatch) {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/login');
    }
    
    if (!user.isActive) {
      req.flash('error', 'Account deactivated');
      return res.redirect('/login');
    }
    
    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email
    };
    
    console.log('✅ Login successful:', user.username);
    console.log('  - Session userId:', req.session.userId);
    console.log('  - Redirecting to /dashboard');
    
    await user.updateLastActive().catch(() => {});
    
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('❌ Login error:', error.message);
    console.error('  - Stack:', error.stack);
    req.flash('error', 'Login failed: ' + error.message);
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

// Register POST
app.post('/register', async (req, res) => {
  try {
    const { username, email, password, age, gender, lookingFor, location, terms } = req.body;
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
    const user = await User.create({
      username: username.trim(),
      email: email.toLowerCase(),
      password: password,
      age: ageNumber,
      gender: gender,
      lookingFor: lookingFor,
      location: location || 'Ethiopia'
    });
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
      req.flash('error', 'Registration failed. Please try again.');
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
  try {
    if (!req.session.userId) {
      req.flash('error', 'Please login to continue');
      return res.redirect('/login');
    }
    const User = require('./models/User');
    const Match = require('./models/Match');
    const user = await User.findByPk(req.session.userId, {
      attributes: { exclude: ['password'] }
    });
    if (!user || !user.isActive) {
      req.session.destroy();
      req.flash('error', 'Account not found or deactivated');
      return res.redirect('/login');
    }
    await user.updateLastActive().catch(() => {});
    const acceptedMatches = await Match.findAll({
      where: {
        [Op.or]: [{ user1Id: user.id }, { user2Id: user.id }],
        status: 'accepted'
      },
      include: [
        { model: User, as: 'user1', attributes: ['id', 'username', 'age', 'profileImage', 'location'] },
        { model: User, as: 'user2', attributes: ['id', 'username', 'age', 'profileImage', 'location'] }
      ],
      order: [['updatedAt', 'DESC']],
      limit: 20
    });
    const matches = acceptedMatches.map(match => {
      return match.user1Id === user.id ? match.user2 : match.user1;
    }).filter(Boolean);
    const matchedUserIds = matches.map(m => m.id);
    const potentialMatches = await User.findAll({
      where: {
        id: { [Op.notIn]: [user.id, ...matchedUserIds] },
        isActive: true,
        gender: user.lookingFor,
        age: { [Op.between]: [18, 100] }
      },
      attributes: ['id', 'username', 'age', 'bio', 'location', 'profileImage', 'interests'],
      limit: 12,
      order: [['lastActive', 'DESC']]
    });
    const [matchCount, likeCount] = await Promise.all([
      Match.count({
        where: { [Op.or]: [{ user1Id: user.id }, { user2Id: user.id }], status: 'accepted' }
      }),
      Match.count({
        where: { [Op.or]: [{ user1Id: user.id }, { user2Id: user.id }], status: 'pending' }
      })
    ]);
    res.render('dashboard', {
      title: 'Dashboard',
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
        createdAt: user.createdAt
      },
      matches,
      potentialMatches,
      stats: { matchCount, likeCount, potentialCount: potentialMatches.length },
      activePage: 'dashboard'
    });
  } catch (error) {
    console.error('Dashboard error:', error.message);
    req.flash('error', 'Failed to load dashboard');
    res.redirect('/');
  }
});

// Profile GET
app.get('/profile', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  try {
    const User = require('./models/User');
    const user = await User.findByPk(req.session.userId, {
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      req.session.destroy();
      return res.redirect('/login');
    }
    res.render('profile', { title: 'My Profile', user });
  } catch (error) {
    console.error('Profile error:', error.message);
    res.redirect('/dashboard');
  }
});

// Profile POST
app.post('/profile', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  try {
    const { bio, location, interests } = req.body;
    const User = require('./models/User');
    const user = await User.findByPk(req.session.userId);
    if (!user) return res.redirect('/login');
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
  if (!req.session.userId) return res.redirect('/login');
  try {
    const Match = require('./models/Match');
    const User = require('./models/User');
    const matches = await Match.findAll({
      where: {
        [Op.or]: [{ user1Id: req.session.userId }, { user2Id: req.session.userId }],
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
      if (!match.likedBy?.includes(req.session.userId)) {
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
  if (!req.session.userId) return res.redirect('/login');
  try {
    const { matchId } = req.params;
    const Match = require('./models/Match');
    const User = require('./models/User');
    const match = await Match.findOne({
      where: {
        id: matchId,
        [Op.or]: [{ user1Id: req.session.userId }, { user2Id: req.session.userId }],
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
// 🔍 TEMPORARY DEBUG ROUTES (Remove after fixing)
app.get('/debug/server', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    routes: {
      login: 'GET /login, POST /login',
      register: 'GET /register, POST /register',
      dashboard: 'GET /dashboard',
      health: 'GET /health'
    },
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
      SESSION_SECRET: process.env.SESSION_SECRET ? 'SET (' + process.env.SESSION_SECRET.length + ' chars)' : 'MISSING'
    }
  });
});

app.get('/debug/login-test', (req, res) => {
  res.send(`
    <html>
      <head><title>Login Debug</title></head>
      <body>
        <h1>Login Debug Test</h1>
        <p>Session ID: ${req.sessionID}</p>
        <p>Session userId: ${req.session.userId || 'NOT SET'}</p>
        <p>Cookie: ${req.headers.cookie || 'NONE'}</p>
        <hr>
        <a href="/login">Go to Login</a> | 
        <a href="/debug/server">Server Info</a> | 
        <a href="/health">Health Check</a>
      </body>
    </html>
  `);
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
  if (res.headersSent) return next(err);
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

const server = app.listen(PORT, () => {
  console.log(`🚀 EthioMatch running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    if (sequelize) sequelize.close();
    process.exit(0);
  });
});

module.exports = app;
