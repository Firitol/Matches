// routes/user.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Match = require('../models/Match');
const { requireLogin } = require('../middleware/auth');

// Dashboard
router.get('/dashboard', requireLogin, async (req, res) => {
  try {
    const user = req.user;
    
    // Get matched user IDs
    const matched = await Match.find({
      $or: [{ user1: user._id }, { user2: user._id }]
    }).distinct('user1').concat(
      await Match.find({ $or: [{ user1: user._id }, { user2: user._id }] }).distinct('user2')
    );
    
    // Get potential matches
    const potentialMatches = await User.find({
      _id: { $nin: [...matched.map(id => id.toString()), user._id.toString()] },
      isActive: true,
      gender: user.lookingFor
    }).limit(10);
    
    const matchCount = await Match.countDocuments({
      $or: [{ user1: user._id }, { user2: user._id }],
      status: 'accepted'
    });
    
    res.render('dashboard', { title: 'Dashboard', user, potentialMatches, matchCount });
  } catch (error) {
    console.error('Dashboard error:', error.message);
    req.flash('error', 'Failed to load dashboard');
    res.redirect('/');
  }
});

// Profile GET
router.get('/profile', requireLogin, (req, res) => {
  res.render('profile', { title: 'My Profile', user: req.user });
});

// Profile POST (Update)
router.post('/profile', requireLogin, async (req, res) => {
  try {
    const { bio, location, interests } = req.body;
    const user = await User.findById(req.session.userId);
    
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

// Change Password
router.post('/profile/change-password', requireLogin, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.session.userId).select('+password');
    
    if (!user || !(await user.comparePassword(currentPassword))) {
      req.flash('error', 'Current password incorrect');
      return res.redirect('/profile');
    }
    
    if (newPassword.length < 8 || newPassword !== confirmPassword) {
      req.flash('error', 'Invalid new password');
      return res.redirect('/profile');
    }
    
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    
    req.flash('success', 'Password changed!');
    res.redirect('/profile');
  } catch (error) {
    console.error('Password change error:', error.message);
    req.flash('error', 'Failed to change password');
    res.redirect('/profile');
  }
});

// Delete Account
router.post('/profile/delete', requireLogin, async (req, res) => {
  try {
    await Match.deleteMany({ $or: [{ user1: req.session.userId }, { user2: req.session.userId }] });
    await User.findByIdAndDelete(req.session.userId);
    req.session.destroy();
    req.flash('success', 'Account deleted');
    res.redirect('/register');
  } catch (error) {
    console.error('Delete error:', error.message);
    req.flash('error', 'Failed to delete account');
    res.redirect('/profile');
  }
});

module.exports = router;
