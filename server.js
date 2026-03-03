// server.js - EthioMatch PRODUCTION READY
require('dotenv').config();

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
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

const app = express();

const constants = {
  APP_NAME: 'EthioMatch',
  APP_TAGLINE: 'Find serious relationships with Ethiopians worldwide'
};

const { User, Match, Message, Subscription, MessageToken, Payment, sequelize } = require('./models');

// Database Connection
const connectDB = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL not set');
      return null;
    }
    
    let dbUrl = process.env.DATABASE_URL.trim();
    if (dbUrl.startsWith('"') && dbUrl.endsWith('"')) dbUrl = dbUrl.slice(1, -1);
    if (dbUrl.startsWith("'") && dbUrl.endsWith("'")) dbUrl = dbUrl.slice(1, -1);
    if (dbUrl.startsWith('psql ')) dbUrl = dbUrl.replace(/^psql\s+/, '');
    if (dbUrl.startsWith('postgresql://')) dbUrl = dbUrl.replace('postgresql://', 'postgres://');
    if (!dbUrl.includes('sslmode=')) dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'sslmode=require';
    
    await sequelize.authenticate();
    console.log('Neon PostgreSQL Connected');
    await sequelize.sync({ alter: true });
    console.log('Database tables synced');
    return sequelize;
  } catch (error) {
    console.error('Neon Connection Error:', error.message);
    return null;
  }
};

connectDB();

// Session Configuration
const isPreview = process.env.VERCEL_ENV === 'preview' || (process.env.VERCEL_URL && process.env.VERCEL_URL.includes('vercel.app'));
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
        createTableIfMissing: true,
        errorLog: console.error.bind(console),
        pruneSessionInterval: false
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

// Security Middleware
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

// CSRF Token
app.use((req, res, next) => {
  if (!res.locals.csrfToken) {
    res.locals.csrfToken = process.env.CSRF_SECRET 
      ? require('crypto').randomBytes(32).toString('hex')
      : 'dev-token';
  }
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

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(req.method + ' ' + req.url + ' - ' + res.statusCode + ' in ' + duration + 'ms');
  });
  next();
});

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
  
  res.locals.formatDate = function(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };
  
  res.locals.truncateText = function(text, length) {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  };
  
  res.locals.getAvatarEmoji = function(username) {
    if (!username) return '👤';
    const emojis = ['😀', '😊', '🥰', '😎', '🤩', '🙋', '💁', '👩', '👨', '🧑', '🦁', '🐘', '🦒', '🦓', '🐆'];
    const index = username.split('').reduce(function(acc, char) { return acc + char.charCodeAt(0); }, 0) % emojis.length;
    return emojis[index];
  };
  
  res.locals.isOnline = function(lastActive) {
    if (!lastActive) return false;
    const minutesAgo = (Date.now() - new Date(lastActive).getTime()) / (1000 * 60);
    return minutesAgo < 10;
  };
  
  next();
});

// ============================================
// ROUTES
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

// Home
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
    return res.redirect('/dashboard');
  }
  res.render('login', { 
    title: 'Login',
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// Login POST
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      req.flash('error', 'Please enter username and password');
      return res.redirect('/login');
    }
    
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: { [Op.iLike]: username.trim() } },
          { email: { [Op.iLike]: username.toLowerCase().trim() } }
        ]
      }
    });
    
    if (!user) {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/login');
    }
    
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/login');
    }
    
    if (!user.isActive) {
      req.flash('error', 'Account deactivated');
      return res.redirect('/login');
    }
    
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      profileImage: user.profileImage
    };
    
    await user.updateLastActive().catch(() => {});
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('Login error:', error.message);
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
      const messages = error.errors.map(function(e) { return e.message; });
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
  req.session.destroy((err) => {
    if (err) console.error('Session destroy error:', err);
  });
  res.redirect('/login');
});

// Dashboard
app.get('/dashboard', async (req, res) => {
  try {
    if (!req.session.userId) {
      req.flash('error', 'Please login to continue');
      return res.redirect('/login');
    }
    
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
    
    const matches = acceptedMatches.map(function(match) {
      return match.user1Id === user.id ? match.user2 : match.user1;
    }).filter(Boolean);
    
    const matchedUserIds = matches.map(function(m) { return m.id; });
    
    const potentialMatches = await User.findAll({
      where: {
        id: { [Op.notIn]: [user.id].concat(matchedUserIds) },
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
      matches: matches,
      potentialMatches: potentialMatches,
      stats: { matchCount: matchCount, likeCount: likeCount, potentialCount: potentialMatches.length },
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
  try {
    if (!req.session.userId) {
      req.flash('error', 'Please login to continue');
      return res.redirect('/login');
    }
    
    const user = await User.findByPk(req.session.userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      req.session.destroy();
      return res.redirect('/login');
    }
    
    res.render('profile', {
      title: 'Edit Profile',
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
        isVerified: user.isVerified
      }
    });
    
  } catch (error) {
    console.error('Profile GET error:', error.message);
    req.flash('error', 'Failed to load profile');
    res.redirect('/dashboard');
  }
});

// Profile POST
app.post('/profile', async (req, res) => {
  try {
    if (!req.session.userId) {
      req.flash('error', 'Please login to continue');
      return res.redirect('/login');
    }
    
    const { bio, location, interests, profileImage } = req.body;
    const user = await User.findByPk(req.session.userId);
    
    if (!user) {
      req.session.destroy();
      return res.redirect('/login');
    }
    
    if (bio !== undefined) user.bio = bio.trim().substring(0, 500);
    if (location !== undefined) user.location = location.trim().substring(0, 100);
    
    if (interests !== undefined) {
      user.interests = interests
        .split(',')
        .map(function(i) { return i.trim(); })
        .filter(function(i) { return i.length > 0; })
        .slice(0, 20);
    }
    
    if (profileImage !== undefined && profileImage.startsWith('http')) {
      user.profileImage = profileImage.substring(0, 255);
    }
    
    await user.save();
    
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      profileImage: user.profileImage
    };
    
    req.flash('success', 'Profile updated successfully!');
    res.redirect('/profile');
    
  } catch (error) {
    console.error('Profile POST error:', error.message);
    
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(function(e) { return e.message; });
      req.flash('error', messages);
    } else {
      req.flash('error', 'Failed to update profile');
    }
    
    res.redirect('/profile');
  }
});

// Profile Photo Upload
const { upload, uploadToCloudinaryMiddleware } = require('./middleware/upload');

app.post('/profile/upload-photo', 
  upload.single('profilePhoto'),
  uploadToCloudinaryMiddleware,
  async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
      if (!req.cloudinaryResult) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }
      
      const user = await User.findByPk(req.session.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      if (user.profileImagePublicId) {
        const { deleteFromCloudinary } = require('./lib/cloudinary');
        await deleteFromCloudinary(user.profileImagePublicId).catch(() => {});
      }
      
      user.profileImage = req.cloudinaryResult.url;
      user.profileImagePublicId = req.cloudinaryResult.publicId;
      await user.save();
      
      req.session.user.profileImage = user.profileImage;
      
      res.json({
        success: true,
        message: 'Profile photo updated successfully!',
        profileImage: user.profileImage
      });
      
    } catch (error) {
      console.error('Profile photo upload error:', error.message);
      res.status(500).json({ success: false, message: 'Failed to upload profile photo' });
    }
  }
);

// Matches
app.get('/matches', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  try {
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
    
    const matchList = matches.map(function(m) {
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
    const currentUserId = req.session.userId;
    
    if (userId === currentUserId) {
      return res.status(400).json({ success: false, message: 'Cannot like yourself' });
    }
    
    let match = await Match.findOne({
      where: {
        [Op.or]: [
          { user1Id: currentUserId, user2Id: userId },
          { user1Id: userId, user2Id: currentUserId }
        ]
      }
    });
    
    if (!match) {
      match = await Match.create({
        user1Id: currentUserId,
        user2Id: userId,
        likedBy: [currentUserId],
        status: 'pending'
      });
    } else {
      if (!match.likedBy || !match.likedBy.includes(currentUserId)) {
        if (!match.likedBy) match.likedBy = [];
        match.likedBy.push(currentUserId);
        await match.save();
      }
    }
    
    const isMutualLike = match.likedBy && match.likedBy.includes(currentUserId) && match.likedBy.includes(userId);
    
    if (isMutualLike && match.status !== 'accepted') {
      match.status = 'accepted';
      await match.save();
    }
    
    const isMatch = match.status === 'accepted';
    
    res.json({ 
      success: true, 
      isMatch: isMatch, 
      matchId: match.id,
      message: isMatch ? "It's a match! Start chatting now." : "Like sent! Wait for them to like you back." 
    });
    
  } catch (error) {
    console.error('Like error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to process like' });
  }
});

// Messages List
app.get('/messages', async (req, res) => {
  try {
    if (!req.session.userId) return res.redirect('/login');
    
    const matches = await Match.findAll({
      where: {
        [Op.or]: [{ user1Id: req.session.userId }, { user2Id: req.session.userId }],
        status: 'accepted'
      },
      include: [
        { model: User, as: 'user1', attributes: ['id', 'username', 'profileImage', 'lastActive'] },
        { model: User, as: 'user2', attributes: ['id', 'username', 'profileImage', 'lastActive'] }
      ],
      order: [['updatedAt', 'DESC']]
    });
    
    const conversations = matches.map(function(match) {
      const isUser1 = match.user1Id === req.session.userId;
      const otherUser = isUser1 ? match.user2 : match.user1;
      return {
        matchId: match.id,
        user: {
          id: otherUser.id,
          username: otherUser.username,
          profileImage: otherUser.profileImage,
          lastActive: otherUser.lastActive
        },
        lastMessage: null,
        updatedAt: match.updatedAt
      };
    });
    
    res.render('messages', {
      title: 'Messages',
      conversations: conversations,
      activeConversation: null
    });
    
  } catch (error) {
    console.error('Messages list error:', error.message);
    res.redirect('/dashboard');
  }
});

// Chat Room
app.get('/messages/:matchId', async (req, res) => {
  try {
    if (!req.session.userId) return res.redirect('/login');
    
    const { matchId } = req.params;
    
    const match = await Match.findOne({
      where: {
        id: matchId,
        [Op.or]: [
          { user1Id: req.session.userId },
          { user2Id: req.session.userId }
        ]
      }
    });
    
    if (!match) {
      req.flash('error', 'Conversation not found');
      return res.redirect('/messages');
    }
    
    if (match.status !== 'accepted') {
      req.flash('info', 'Wait for mutual like to start chatting');
      return res.redirect('/matches');
    }
    
    const messages = await Message.findAll({
      where: { matchId: matchId },
      order: [['createdAt', 'ASC']],
      limit: 100
    });
    
    const messagesWithSender = await Promise.all(
      messages.map(async function(msg) {
        const sender = await User.findByPk(msg.senderId, {
          attributes: ['id', 'username', 'profileImage']
        });
        return {
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId,
          senderName: sender ? sender.username : 'Unknown',
          mediaType: msg.mediaType,
          mediaUrl: msg.mediaUrl,
          createdAt: msg.createdAt,
          isRead: msg.isRead
        };
      })
    );
    
    await Message.update(
      { isRead: true, readAt: new Date() },
      {
        where: {
          matchId: matchId,
          senderId: { [Op.ne]: req.session.userId },
          isRead: false
        }
      }
    );
    
    const otherUserId = match.user1Id === req.session.userId ? match.user2Id : match.user1Id;
    const otherUser = await User.findByPk(otherUserId, {
      attributes: ['id', 'username', 'profileImage']
    });
    
    res.render('chat', {
      title: 'Chat with ' + (otherUser ? otherUser.username : 'User'),
      match: {
        id: match.id,
        status: match.status,
        otherUser: {
          id: otherUser ? otherUser.id : null,
          username: otherUser ? otherUser.username : 'User',
          profileImage: otherUser ? otherUser.profileImage : null
        }
      },
      messages: messagesWithSender,
      currentUser: {
        id: req.session.userId,
        username: req.session.username
      }
    });
    
  } catch (error) {
    console.error('Chat room error:', error.message);
    res.redirect('/messages');
  }
});

// Send Text Message - FIXED WITH data: KEY
app.post('/messages/:matchId/send', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  try {
    const { matchId } = req.params;
    const content = req.body.content;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }
    
    const match = await Match.findOne({
      where: {
        id: matchId,
        [Op.or]: [{ user1Id: req.session.userId }, { user2Id: req.session.userId }],
        status: 'accepted'
      }
    });
    
    if (!match) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    
    const message = await Message.create({
      matchId: matchId,
      senderId: req.session.userId,
      content: content.trim().substring(0, 1000),
      mediaType: 'text'
    });
    
    await match.update({ updatedAt: new Date() });
    
    res.json({
      success: true,
      message: 'Message sent!',
      data: {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        senderName: req.session.username,
        mediaType: message.mediaType,
        mediaUrl: message.mediaUrl,
        createdAt: message.createdAt,
        isRead: message.isRead
      }
    });
    
  } catch (error) {
    console.error('Send message error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

// Send Media Message - FIXED WITH data: KEY
app.post('/messages/:matchId/send-media', 
  upload.single('media'),
  uploadToCloudinaryMiddleware,
  async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    try {
      const { matchId } = req.params;
      const caption = req.body.caption;
      
      if (!req.cloudinaryResult) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }
      
      const match = await Match.findOne({
        where: {
          id: matchId,
          [Op.or]: [{ user1Id: req.session.userId }, { user2Id: req.session.userId }],
          status: 'accepted'
        }
      });
      
      if (!match) {
        return res.status(404).json({ success: false, message: 'Conversation not found' });
      }
      
      const message = await Message.create({
        matchId: matchId,
        senderId: req.session.userId,
        content: caption ? caption.trim().substring(0, 1000) : null,
        mediaType: req.cloudinaryResult.mediaType,
        mediaUrl: req.cloudinaryResult.url
      });
      
      await match.update({ updatedAt: new Date() });
      
      res.json({
        success: true,
        message: 'Media sent!',
        data: {
          id: message.id,
          content: message.content,
          senderId: message.senderId,
          senderName: req.session.username,
          mediaType: message.mediaType,
          mediaUrl: message.mediaUrl,
          createdAt: message.createdAt,
          isRead: message.isRead
        }
      });
      
    } catch (error) {
      console.error('Send media error:', error.message);
      res.status(500).json({ success: false, message: 'Failed to send media' });
    }
  }
);

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
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
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

// Start Server
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log('EthioMatch running on port ' + PORT);
  console.log('Environment: ' + (process.env.NODE_ENV || 'development'));
  console.log('Session Store: ' + (useMemoryStore ? 'MemoryStore (preview)' : 'PostgreSQLStore (production)'));
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    if (sequelize) sequelize.close();
    process.exit(0);
  });
});

module.exports = app;
