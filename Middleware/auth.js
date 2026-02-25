const User = require('../models/User');

exports.requireLogin = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      req.flash('error', 'Please login to continue');
      return res.redirect('/login');
    }
    
    const user = await User.findById(req.session.userId);
    if (!user || !user.isActive) {
      req.session.destroy();
      req.flash('error', 'Account not found or deactivated');
      return res.redirect('/login');
    }
    
    await user.updateLastActive();
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    req.flash('error', 'Authentication error');
    res.redirect('/login');
  }
};

exports.requireGuest = (req, res, next) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
};

exports.checkVerification = (req, res, next) => {
  if (!req.user.isVerified) {
    req.flash('warning', 'Please verify your account for full access');
  }
  next();
};
