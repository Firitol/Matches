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

// Import Utils
const logger = require('./utils/logger');
const constants = require('./utils/constants');
const { formatDate } = require('./utils/helpers');

// Import Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const matchRoutes = require('./routes/match');

// Import Models
const User = require('./models/User');

const app = express();

// ============================================
// 🛡️ SECURITY MIDDLEWARE
// ============================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false
}));

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: constants.RATE_LIMIT_WINDOW_MS,
  max: constants.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    message: constants.MESSAGES.RATE_LIMITED
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: constants.AUTH_RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later'
  }
});

app.use('/api/', apiLimiter);
app.use('/login', authLimiter);
app.use('/register', authLimiter);

// ============================================
// 🔐 CSRF PROTECTION
// ============================================

const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  cookieName: '__Host-psyi.xsrf.token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS']
});

// Add CSRF token to all responses
app.use((req, res, next) => {
  res.locals.csrfToken = generateToken(req, res);
  next();
});

// ============================================
// 🗄️ DATABASE CONNECTION
// ============================================

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  logger.info('✅ MongoDB Connected Successfully', {
    database: mongoose.connection.name
  });
})
.catch(err => {
  logger.error('❌ MongoDB Connection Error', {
    error: err.message,
    stack: err.stack
  });
  process.exit(1);
});

// MongoDB connection event listeners
mongoose.connection.on('error', err => {
  logger.error('MongoDB connection error', { error: err.message });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

// ============================================
// 📦 SESSION CONFIGURATION
// ============================================

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI,
    ttl: constants.SESSION_MAX_AGE / 1000,
    autoRemove: 'native'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: constants.SESSION_MAX_AGE,
    sameSite: 'lax'
  },
  name: 'ethiomatch.sid'
}));

// ============================================
// 🎨 VIEW ENGINE & STATIC FILES
// ============================================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true
}));

// ============================================
// 📝 REQUEST PARSING & LOGGING
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Morgan HTTP logging
app.use(morgan('combined', {
  stream: {
    write: (message) => {
      const [method, url, status, duration] = message.split(' ');
      logger.info('HTTP Request', {
        method: method.trim(),
        url: url.trim(),
        status: parseInt(status),
        duration: duration.trim()
      });
    }
  }
}));

// ============================================
// 🛡️ CSRF & FLASH MESSAGES
// ============================================

app.use(doubleCsrfProtection);
app.use(flash());

// ============================================
// 🌍 GLOBAL VARIABLES FOR VIEWS
// ============================================

app.use((req, res, next) => {
  // Make user available to all views
  res.locals.user = req.session.userId ? req.user : null;
  
  // Flash messages
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.warning = req.flash('warning');
  res.locals.info = req.flash('info');
  
  // App info
  res.locals.appName = constants.APP_NAME;
  res.locals.appVersion = constants.APP_VERSION;
  res.locals.currentYear = new Date().getFullYear();
  
  // Helper functions for views
  res.locals.formatDate = formatDate;
  res.locals.formatRelativeTime = require('./utils/helpers').formatRelativeTime;
  res.locals.getAvatarEmoji = require('./utils/helpers').getAvatarEmoji;
  res.locals.truncateText = require('./utils/helpers').truncateText;
  res.locals.isOnline = require('./utils/helpers').isOnline;
  
  next();
});

// ============================================
// 🚦 ROUTES
// ============================================

// Health check for Render monitoring
app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  
  logger.info('Health check performed', { status: healthStatus.status });
  res.status(200).json(healthStatus);
});

// API Ping for keeping session alive
app.post('/api/ping', (req, res) => {
  if (req.session.userId) {
    User.findById(req.session.userId)
      .then(user => {
        if (user) {
          user.updateLastActive();
        }
      })
      .catch(err => logger.error('Ping error', { error: err.message }));
  }
  res.json({ success: true, timestamp: new Date().toISOString() });
});

// Home route
app.get('/', (req, res) => {
  if (req.session.userId) {
    logger.info('User redirected to dashboard', { userId: req.session.userId });
    res.redirect('/dashboard');
  } else {
    logger.info('Home page visited', { ip: req.ip });
    res.render('index', { 
      title: 'Welcome',
      tagline: constants.APP_TAGLINE
    });
  }
});

// Auth routes
app.use('/', authRoutes);

// User routes (require login)
app.use('/', userRoutes);

// Match routes (require login)
app.use('/', matchRoutes);

// ============================================
// ❌ 404 HANDLER
// ============================================

app.use((req, res) => {
  logger.warn('404 - Page not found', {
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    error: { status: 404 }
  });
});

// ============================================
// 🚨 GLOBAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  logger.error('Unhandled Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  // Don't leak error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(err.status || 500).render('error', {
    title: 'Error',
    message: isProduction ? constants.MESSAGES.ERROR : err.message,
    error: isProduction ? {} : err
  });
});

// ============================================
// 🚀 START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info('🚀 EthioMatch Server Started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    pid: process.pid
  });
  
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║  🇪🇹  EthioMatch - Serious Relationships  ║
  ╠═══════════════════════════════════════════╣
  ║  Port: ${PORT}                            ║
  ║  Environment: ${process.env.NODE_ENV || 'development'}              ║
  ║  Node Version: ${process.version}                     ║
  ║  Status: Running ✅                      ║
  ╚═══════════════════════════════════════════╝
  `);
});

// ============================================
// 🛑 GRACEFUL SHUTDOWN
// ============================================

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    mongoose.connection.close(() => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    mongoose.connection.close(() => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', {
    error: err.message,
    stack: err.stack
  });
  
  server.close(() => {
    process.exit(1);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason?.message || reason,
    promise: promise
  });
});

// ============================================
// 📤 EXPORT FOR TESTING
// ============================================

module.exports = app;
