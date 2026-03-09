// server.js - EthioMatch PRODUCTION READY
require('dotenv').config();

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

const express = require('express');
const session = require('express-session');
const PostgreSQLStore = require('connect-pg-simple')(session);
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const flash = require('express-flash');
const { Op } = require('sequelize');
const { Server } = require('socket.io');

const app = express();
const constants = {
  APP_NAME: 'EthioMatch',
  APP_TAGLINE: 'Find serious relationships with Ethiopians worldwide'
};

// Core Models
const { User, Match, Message, sequelize } = require('./models');

// Database Connection
const connectDB = async () => {
  try {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
    await sequelize.authenticate();
    console.log('Neon PostgreSQL Connected');
    await sequelize.sync({ alter: true });
    console.log('Database tables synced');
    return sequelize;
  } catch (error) {
    console.error('Database connection error:', error.message);
    return null;
  }
};
connectDB();

// Session Configuration
const isPreview = process.env.VERCEL_ENV === 'preview' || (process.env.VERCEL_URL?.includes('vercel.app'));
const useMemoryStore = isPreview || process.env.USE_MEMORY_STORE === 'true';

app.use(session({
  store: useMemoryStore
    ? new session.MemoryStore()
    : new PostgreSQLStore({
        conObject: {
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        },
        tableName: 'session',
        createTableIfMissing: true
      }),
  secret: process.env.SESSION_SECRET || 'fallback_secret_min_32_chars_here!!',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production' && !isPreview,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    path: '/'
  },
  name: 'ethiomatch.sid'
}));

// Security
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// CSRF placeholder
app.use((req, res, next) => {
  res.locals.csrfToken = process.env.CSRF_SECRET
    ? require('crypto').randomBytes(32).toString('hex')
    : 'dev-token';
  next();
});

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Request Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(flash());

// Global Variables
app.use(async (req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.warning = req.flash('warning');
  res.locals.info = req.flash('info');
  res.locals.appName = constants.APP_NAME;
  res.locals.currentYear = new Date().getFullYear();
  res.locals.constants = constants;

  res.locals.formatDate = (date) => date ? new Date(date).toLocaleString('en-US') : '';
  res.locals.truncateText = (text, length) => text && text.length > length ? text.substring(0, length) + '...' : text;
  res.locals.getAvatarEmoji = (username) => {
    if (!username) return '👤';
    const emojis = ['😀', '😊', '🥰', '😎', '🤩', '🙋', '💁', '👩', '👨', '🧑', '🦁', '🐘', '🦒', '🦓', '🐆'];
    return emojis[username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % emojis.length];
  };
  res.locals.isOnline = (lastActive) => lastActive && (Date.now() - new Date(lastActive).getTime()) / 60000 < 10;
  next();
});

// Rate limiter
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { success: false, message: 'Too many API requests' } });

// API Router
const apiRouter = express.Router();
app.use('/api', apiLimiter, apiRouter);

apiRouter.get('/test', (req, res) => res.json({ success: true, timestamp: new Date(), userId: req.session.userId || 'not-logged-in' }));

// Cloudinary Upload Middleware
const { upload, uploadToCloudinaryMiddleware } = require('./middleware/upload');
const { deleteFromCloudinary } = require('./lib/cloudinary');

// ======================
// Socket.IO Setup
// ======================
const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`${constants.APP_NAME} running on port ${process.env.PORT || 3000}`);
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    if (userId) socket.join(String(userId));
  });
});

app.locals.io = io;

// ======================
// Graceful shutdown
// ======================
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => { if (sequelize) sequelize.close(); process.exit(0); });
});

module.exports = app;
