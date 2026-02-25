// api/index.js - MINIMAL WORKING VERSION FOR VERCEL
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const { getIronSession } = require('iron-session');
const ejs = require('ejs');
const { join } = require('path');
const { readFile } = require('fs').promises;

// MongoDB connection (cached for serverless)
let client;
let db;

async function getDB() {
  if (db) return db;
  
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000
    });
    await client.connect();
  }
  
  db = client.db('ethiomatch');
  return db;
}

// Session config
const sessionConfig = {
  password: process.env.SESSION_PASSWORD || 'fallback_secret_must_be_32_chars_minimum!!',
  cookieName: 'ethio_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
};

// Helper: Render EJS view
async function render(viewName, data = {}) {
  const template = await readFile(join(process.cwd(), 'views', `${viewName}.ejs`), 'utf8');
  return ejs.render(template, {
    ...data,
    formatDate: (d) => d ? new Date(d).toLocaleDateString() : '',
    getAvatarEmoji: (g) => g === 'Male' ? '👨' : '👩',
    truncateText: (t, n = 100) => t && t.length > n ? t.slice(0, n) + '...' : t,
    formatRelativeTime: (d) => {
      if (!d) return '';
      const diff = Date.now() - new Date(d).getTime();
      const min = Math.floor(diff / 60000);
      if (min < 1) return 'Just now';
      if (min < 60) return `${min}m ago`;
      const hr = Math.floor(min / 60);
      if (hr < 24) return `${hr}h ago`;
      return new Date(d).toLocaleDateString();
    }
  });
}

// Helper: Render full page with header/footer
async function renderPage(viewName, data = {}) {
  const header = await render('partials/header', { 
    user: data.user || null,
    success: data.success || [],
    error: data.error || []
  });
  const content = await render(viewName, data);
  const footer = await render('partials/footer', { currentYear: new Date().getFullYear() });
  return header + content + footer;
}

// Main handler
module.exports = async (req, res) => {
  // Parse body for POST requests
  let body = {};
  if (req.method === 'POST' && req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    body = Object.fromEntries(new URLSearchParams(raw));
  }
  
  // Get session
  const session = await getIronSession(req, res, sessionConfig);
  
  // Set default headers
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;
  
  try {
    // ===== HEALTH CHECK =====
    if (path === '/health') {
      res.setHeader('Content-Type', 'application/json');
      const database = await getDB();
      const stats = await database.stats();
      return res.end(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: { connected: true, collections: stats.collections }
      }));
    }
    
    // ===== HOME PAGE =====
    if (path === '/' && method === 'GET') {
      if (session.userId) {
        res.setHeader('Location', '/dashboard');
        res.statusCode = 302;
        return res.end();
      }
      const html = await renderPage('index', { title: 'Welcome', tagline: 'Find serious relationships with Ethiopians worldwide' });
      return res.end(html);
    }
    
    // ===== REGISTER =====
    if (path === '/register') {
      if (method === 'GET') {
        if (session.userId) {
          res.setHeader('Location', '/dashboard');
          res.statusCode = 302;
          return res.end();
        }
        const html = await renderPage('register', { title: 'Join EthioMatch', csrfToken: 'token' });
        return res.end(html);
      }
      
      if (method === 'POST') {
        const { username, email, password, age, gender, lookingFor } = body;
        
        // Basic validation
        if (!username || !email || !password || !age || age < 18) {
          const html = await renderPage('register', { 
            title: 'Join EthioMatch',
            error: ['Please fill all fields and be 18+'],
            csrfToken: 'token'
          });
          return res.end(html);
        }
        
        const database = await getDB();
        const users = database.collection('users');
        
        // Check existing
        const exists = await users.findOne({ $or: [{ username }, { email }] });
        if (exists) {
          const html = await renderPage('register', {
            title: 'Join EthioMatch',
            error: ['Username or email already exists'],
            csrfToken: 'token'
          });
          return res.end(html);
        }
        
        // Create user
        const hashed = await bcrypt.hash(password, 10);
        const result = await users.insertOne({
          username,
          email: email.toLowerCase(),
          password: hashed,
          age: parseInt(age),
          gender,
          lookingFor,
          location: 'Ethiopia',
          bio: 'Looking for a serious relationship.',
          interests: [],
          profileImage: '/images/default-avatar.png',
          isActive: true,
          isVerified: false,
          createdAt: new Date(),
          lastActive: new Date()
        });
        
        // Auto-login
        session.userId = result.insertedId.toString();
        session.username = username;
        session.isLoggedIn = true;
        await session.save();
        
        res.setHeader('Location', '/dashboard');
        res.statusCode = 302;
        return res.end();
      }
    }
    
    // ===== LOGIN =====
    if (path === '/login') {
      if (method === 'GET') {
        if (session.userId) {
          res.setHeader('Location', '/dashboard');
          res.statusCode = 302;
          return res.end();
        }
        const html = await renderPage('login', { title: 'Login', csrfToken: 'token' });
        return res.end(html);
      }
      
      if (method === 'POST') {
        const { username, password } = body;
        
        if (!username || !password) {
          const html = await renderPage('login', {
            title: 'Login',
            error: ['Username and password required'],
            csrfToken: 'token'
          });
          return res.end(html);
        }
        
        const database = await getDB();
        const users = database.collection('users');
        
        const user = await users.findOne({
          $or: [
            { username: { $regex: new RegExp(`^${username}$`, 'i') }},
            { email: { $regex: new RegExp(`^${username}$`, 'i') }}
          ]
        });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
          const html = await renderPage('login', {
            title: 'Login',
            error: ['Invalid credentials'],
            csrfToken: 'token'
          });
          return res.end(html);
        }
        
        if (!user.isActive) {
          const html = await renderPage('login', {
            title: 'Login',
            error: ['Account deactivated'],
            csrfToken: 'token'
          });
          return res.end(html);
        }
        
        // Login successful
        session.userId = user._id.toString();
        session.username = user.username;
        session.isLoggedIn = true;
        await session.save();
        
        // Update last active
        await users.updateOne({ _id: user._id }, { $set: { lastActive: new Date() } });
        
        res.setHeader('Location', '/dashboard');
        res.statusCode = 302;
        return res.end();
      }
    }
    
    // ===== LOGOUT =====
    if (path === '/logout' && method === 'GET') {
      await session.destroy();
      res.setHeader('Location', '/login');
      res.statusCode = 302;
      return res.end();
    }
    
    // ===== DASHBOARD (Protected) =====
    if (path === '/dashboard' && method === 'GET') {
      if (!session.isLoggedIn || !session.userId) {
        res.setHeader('Location', '/login');
        res.statusCode = 302;
        return res.end();
      }
      
      const database = await getDB();
      const users = database.collection('users');
      const matches = database.collection('matches');
      
      const user = await users.findOne({ _id: new ObjectId(session.userId) });
      if (!user) {
        await session.destroy();
        res.setHeader('Location', '/login');
        res.statusCode = 302;
        return res.end();
      }
      
      // Get potential matches
      const matchedIds = await matches.distinct('user2', { user1: new ObjectId(session.userId) });
      const potentialMatches = await users.find({
        _id: { $nin: [...matchedIds.map(id => id.toString()), session.userId] },
        gender: user.lookingFor,
        isActive: true
      }).limit(10).toArray();
      
      const matchCount = await matches.countDocuments({
        $or: [{ user1: new ObjectId(session.userId) }, { user2: new ObjectId(session.userId) }],
        status: 'accepted'
      });
      
      const html = await renderPage('dashboard', {
        title: 'Dashboard',
        user,
        potentialMatches,
        matchCount,
        csrfToken: 'token'
      });
      return res.end(html);
    }
    
    // ===== PROFILE =====
    if (path === '/profile' && method === 'GET') {
      if (!session.isLoggedIn) {
        res.setHeader('Location', '/login');
        res.statusCode = 302;
        return res.end();
      }
      const database = await getDB();
      const user = await database.collection('users').findOne({ _id: new ObjectId(session.userId) });
      const html = await renderPage('profile', { title: 'My Profile', user, csrfToken: 'token' });
      return res.end(html);
    }
    
    // ===== MATCHES =====
    if (path === '/matches' && method === 'GET') {
      if (!session.isLoggedIn) {
        res.setHeader('Location', '/login');
        res.statusCode = 302;
        return res.end();
      }
      const database = await getDB();
      const matches = database.collection('matches');
      const users = database.collection('users');
      
      const matchDocs = await matches.find({
        $or: [{ user1: new ObjectId(session.userId) }, { user2: new ObjectId(session.userId) }],
        status: 'accepted'
      }).toArray();
      
      const matchList = [];
      for (const m of matchDocs) {
        const otherId = m.user1.toString() === session.userId ? m.user2 : m.user1;
        const other = await users.findOne({ _id: otherId });
        if (other) matchList.push(other);
      }
      
      const html = await renderPage('matches', { title: 'My Matches', matches: matchList, csrfToken: 'token' });
      return res.end(html);
    }
    
    // ===== LIKE USER (API) =====
    if (path.match(/^\/like\/[a-f0-9]{24}$/) && method === 'POST') {
      if (!session.isLoggedIn) {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: 'Unauthorized' }));
      }
      
      const userId = path.split('/').pop();
      const database = await getDB();
      const matches = database.collection('matches');
      
      let match = await matches.findOne({
        $or: [
          { user1: new ObjectId(session.userId), user2: new ObjectId(userId) },
          { user1: new ObjectId(userId), user2: new ObjectId(session.userId) }
        ]
      });
      
      if (!match) {
        await matches.insertOne({
          user1: new ObjectId(session.userId),
          user2: new ObjectId(userId),
          likedBy: [{ userId: new ObjectId(session.userId), date: new Date() }],
          status: 'pending',
          createdAt: new Date()
        });
      } else {
        const alreadyLiked = match.likedBy?.some(l => l.userId?.toString() === session.userId);
        if (!alreadyLiked) {
          await matches.updateOne(
            { _id: match._id },
            { $push: { likedBy: { userId: new ObjectId(session.userId), date: new Date() } } }
          );
        }
      }
      
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, message: 'Like sent' }));
      return;
    }
    
    // ===== 404 FALLBACK =====
    res.statusCode = 404;
    const html = await renderPage('error', {
      title: 'Page Not Found',
      message: 'The page you are looking for does not exist.',
      error: { status: 404 }
    });
    res.end(html);
    
  } catch (error) {
    console.error('Handler error:', error);
    
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    try {
      const html = await renderPage('error', {
        title: 'Error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message,
        error: process.env.NODE_ENV === 'production' ? {} : { status: 500 }
      });
      res.end(html);
    } catch {
      res.end('<h1>500 - Internal Server Error</h1>');
    }
  }
};
