const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireLogin } = require('../middleware/auth');

// Dashboard
router.get('/dashboard', requireLogin, async (req, res) => {
  try {
    const user = req.user;
    
    // Get potential matches (exclude self and already matched)
    const Match = require('../models/Match');
    const matchedUserIds = await Match.find({
      $or: [
        { user1: user._id },
        { user2: user._id }
      ]
    }).distinct('user1').concat(await Match.find({
      $or: [
        { user1: user._id },
        { user2: user._id }
      ]
    }).distinct('user2'));
    
    const potentialMatches = await User.find({
      _id: { $nin: [...matchedUserIds, user._id] },
      isActive: true,
      $or: [
        { gender: user.lookingFor },
        { gender: { $exists: false } }
      ]
    }).limit(10);
    
    // Get match count
    const matchCount = await Match.countDocuments({
      $or: [{ user1: user._id }, { user2: user._id }],
      status: 'accepted'
    });
    
    res.render('dashboard', {
      title: 'Dashboard',
      user,
      potentialMatches,
      matchCount,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    req.flash('error', 'Failed to load dashboard');
    res.redirect('/');
  }
});

// Profile
router.get('/profile', requireLogin, (req, res) => {
  res.render('profile', {
    title: 'My Profile',
    user: req.user,
    csrfToken: req.csrfToken()
  });
});

// Update Profile
router.post('/profile', requireLogin, async (req, res) => {
  try {
    const { bio, location, interests } = req.body;
    
    const user = await User.findById(req.session.userId);
    
    if (bio) user.bio = bio;
    if (location) user.location = location;
    if (interests) user.interests = interests.split(',').map(i => i.trim());
    
    await user.save();
    
    req.flash('success', 'Profile updated successfully!');
    res.redirect('/profile');
  } catch (error) {
    console.error('Profile update error:', error);
    req.flash('error', 'Failed to update profile');
    res.redirect('/profile');
  }
});

// Delete Account
router.post('/profile/delete', requireLogin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.session.userId);
    req.session.destroy();
    req.flash('success', 'Account deleted successfully');
    res.redirect('/register');
  } catch (error) {
    console.error('Delete account error:', error);
    req.flash('error', 'Failed to delete account');
    res.redirect('/profile');
  }
});

module.exports = router;
