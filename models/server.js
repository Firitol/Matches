require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const path = require('path');
const User = require('./models/User');

const app = express();

// 1. Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error(err));

// 2. Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// 3. Middleware to check login
const requireLogin = (req, res, next) => {
  if (!req.session.userId) return res.redirect('/login');
  next();
};

// 4. Routes

// Home Page
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Register
app.get('/register', (req, res) => res.render('register'));

app.post('/register', async (req, res) => {
  const { username, password, age, gender, lookingFor } = req.body;
  
  // 18+ Validation
  if (age < 18) return res.send("You must be 18+ to join EthioMatch.");

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, age, gender, lookingFor });
    await user.save();
    res.redirect('/login');
  } catch (err) {
    res.send("Error creating account. Username might be taken.");
  }
});

// Login
app.get('/login', (req, res) => res.render('login'));

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.userId = user._id;
    req.session.username = user.username;
    res.redirect('/dashboard');
  } else {
    res.send("Invalid credentials");
  }
});

// Dashboard (Match Finder)
app.get('/dashboard', requireLogin, async (req, res) => {
  const currentUser = await User.findById(req.session.userId);
  
  // Find matches (excluding self)
  // Simple logic: Find users of the gender the current user is looking for
  const matches = await User.find({ 
    _id: { $ne: req.session.userId },
    gender: currentUser.lookingFor 
  }).limit(10);

  res.render('dashboard', { user: currentUser, matches });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// 5. Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`EthioMatch running on port ${PORT}`);
});