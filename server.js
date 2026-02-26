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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests' }
});
app.use('/api/', limiter);

// ============================================
// 🔐 CSRF PROTECTION (Safe Fallback)
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
// 🗄️ MONGODB CONNECTION (Robust, Render-Compatible)
// ============================================

let mongooseInstance = null;

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn('⚠️ MONGODB_URI not set, database unavailable');
      return null;
    }
    
    // Close existing connection if any
    if (mongooseInstance && mongooseInstance.connection.readyState !== 0) {
      await mongooseInstance.disconnect();
    }
    
    // Create new connection with TLS settings for Render
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
    // Don't exit - allow app to start for health checks
    return null;
  }
};

// Initial connection
connectDB();

// Reconnect on disconnect (with debounce)
let reconnectTimeout = null;
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected, attempting reconnect in 5s...');
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  reconnectTimeout = setTimeout(() => connectDB(), 5000);
});

// Handle connection errors
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

// Request logging middleware (helps debug issues)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Flash messages
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

// Health Check (Works without MongoDB)
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
    nodeVersion: process.version,
    database: dbStatus,
    render: {
      port: process.env.PORT,
      hostname: process.env.HOSTNAME || 'unknown'
    }
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
// ❌ 404 HANDLER
// ============================================

app.use((req, res) => {
  // Check if headers already sent
  if (res.headersSent) {
    return res.end();
  }
  
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    error: { status: 404 }
  });
});

// ============================================
// 🚨 GLOBAL ERROR HANDLER (FIXED)
// ============================================

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  
  // Check if headers already sent - CRITICAL FIX
  if (res.headersSent) {
    console.error('Headers already sent, cannot render error page');
    return next(err);
  }
  
  // Log the error stack for debugging
  console.error('Stack:', err.stack);
  
  // Send JSON response for API requests
  if (req.headers.accept?.includes('application/json')) {
    return res.status(err.status || 500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
  
  // Render error page for browser requests
  res.status(err.status || 500);
  
  // Try to render error page, with fallback
  try {
    res.render('error', {
      title: 'Error',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
      error: process.env.NODE_ENV === 'production' ? {} : err
    });
  } catch (renderErr) {
    console.error('Failed to render error page:', renderErr.message);
    // Ultimate fallback - plain text response
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
// 🛑 GRACEFUL SHUTDOWN (Render Requirement)
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
  // Don't exit immediately - let Express handle
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  // Don't exit - let the app continue
});

module.exports = app;
