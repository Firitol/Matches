// server.js - RENDER COMPATIBLE VERSION
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

const enableCSRF = process.env.CSRF_SECRET && process.env.CSRF_SECRET.length > 32;

if (enableCSRF) {
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
  console.warn('⚠️ CSRF disabled: Set CSRF_SECRET env var (32+ chars)');
  app.use((req, res, next) => {
    res.locals.csrfToken = 'dev-token';
    next();
  });
}

// ============================================
// 🗄️ DATABASE CONNECTION (Persistent for Render)
// ============================================

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
  process.exit(1);
});

// ============================================
// 📦 SESSION CONFIGURATION (Server-side for Render)
// ============================================

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_min_32_chars_here!!',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60
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
app.use(flash());

// ============================================
// 🌍 GLOBAL VARIABLES FOR VIEWS
// ============================================

const User = require('./models/User');
const { formatDate, getAvatarEmoji, truncateText, formatRelativeTime, isOnline } = require('./utils/helpers');
const constants = require('./utils/constants');

app.use(async (req, res, next) => {
  res.locals.user = req.session.userId ? await User.findById(req.session.userId).catch(() => null) : null;
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

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Home
app.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/dashboard');
  } else {
    res.render('index', { title: 'Welcome', tagline: constants.APP_TAGLINE });
  }
});

// Auth routes
app.use('/', require('./routes/auth'));

// User routes
app.use('/', require('./routes/user'));

// Match routes
app.use('/', require('./routes/match'));

// ============================================
// ❌ 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    error: { status: 404 }
  });
});

// ============================================
// 🚨 ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  
  res.status(err.status || 500).render('error', {
    title: 'Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// ============================================
// 🚀 START SERVER (Render requires this)
// ============================================

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 EthioMatch running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// ============================================
// 🛑 GRACEFUL SHUTDOWN (Important for Render)
// ============================================

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  server.close(() => {
    mongoose.connection.close(() => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down');
  server.close(() => {
    mongoose.connection.close(() => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = app;
