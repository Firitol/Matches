// server.js
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

// 🔐 Security Headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// 🚦 Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests' }
});
app.use('/api/', limiter);

// 🔐 CSRF Protection (Safe Fallback)
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

// 🗄️ MongoDB Connection (Render-Compatible)
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    // Don't exit - allow app to start for health checks
  }
};
connectDB();

// 🔄 Reconnect on disconnect
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected, reconnecting...');
  connectDB();
});

// 📦 Session Configuration
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

// 🎨 View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 📁 Static Files
app.use(express.static(path.join(__dirname, 'public')));

// 📝 Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 📊 Logging
app.use(morgan('combined'));

// 💬 Flash Messages
app.use(flash());

// 🌍 Global View Variables
const User = require('./models/User');
const { formatDate, getAvatarEmoji, truncateText, formatRelativeTime, isOnline } = require('./utils/helpers');
const constants = require('./utils/constants');

app.use(async (req, res, next) => {
  res.locals.user = null;
  if (req.session.userId) {
    try {
      res.locals.user = await User.findById(req.session.userId);
    } catch (e) {
      // User not found, session will be cleared on next request
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

// Health Check (Critical for Render)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
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

// Auth Routes
app.use('/', require('./routes/auth'));

// User Routes (Protected)
app.use('/', require('./routes/user'));

// Match Routes (Protected)
app.use('/', require('./routes/match'));

// ============================================
// ❌ 404 Handler
// ============================================

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    error: { status: 404 }
  });
});

// ============================================
// 🚨 Global Error Handler
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
// 🚀 Start Server
// ============================================

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 EthioMatch running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// ============================================
// 🛑 Graceful Shutdown (Render Requirement)
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

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

module.exports = app;
