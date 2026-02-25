// routes/user.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

// Import Models
const User = require('../models/User');
const Match = require('../models/Match');
const Message = require('../models/Message');

// Import Middleware
const { requireLogin, checkVerification } = require('../middleware/auth');

// Import Utils
const logger = require('../utils/logger');
const constants = require('../utils/constants');
const { sanitizeInput, truncateText, getAvatarEmoji } = require('../utils/helpers');

// ============================================
// 📊 DASHBOARD
// ============================================

router.get('/dashboard', requireLogin, checkVerification, async (req, res) => {
  try {
    const user = req.user;
    
    logger.info('Dashboard accessed', { userId: user._id, username: user.username });
    
    // Get matched user IDs (exclude from potential matches)
    const matchedUserIds = await Match.find({
      $or: [
        { user1: user._id },
        { user2: user._id }
      ]
    }).distinct('user1').concat(
      await Match.find({
        $or: [
          { user1: user._id },
          { user2: user._id }
        ]
      }).distinct('user2')
    );
    
    // Get potential matches (exclude self and already matched)
    const matchQuery = {
      _id: { $nin: [...matchedUserIds.map(id => id.toString()), user._id.toString()] },
      isActive: true,
      $or: [
        { gender: user.lookingFor },
        { lookingFor: 'Both' },
        { gender: { $exists: false } }
      ]
    };
    
    // If user is looking for specific gender
    if (user.lookingFor !== 'Both') {
      matchQuery.gender = user.lookingFor;
    }
    
    const potentialMatches = await User.find(matchQuery)
      .select('username age gender location bio interests profileImage lastActive')
      .limit(10);
    
    // Get accepted match count
    const matchCount = await Match.countDocuments({
      $or: [{ user1: user._id }, { user2: user._id }],
      status: constants.MATCH_STATUS.ACCEPTED
    });
    
    // Get unread message count
    const unreadCount = await Message.countDocuments({
      receiver: user._id,
      isRead: false
    });
    
    res.render('dashboard', {
      title: 'Dashboard',
      user,
      potentialMatches,
      matchCount,
      unreadCount,
      constants,
      getAvatarEmoji,
      truncateText,
      csrfToken: req.csrfToken()
    });
    
  } catch (error) {
    logger.error('Dashboard error', {
      userId: req.session.userId,
      error: error.message,
      stack: error.stack
    });
    
    req.flash('error', 'Failed to load dashboard. Please try again.');
    res.redirect('/');
  }
});

// ============================================
// 👤 USER PROFILE
// ============================================

router.get('/profile', requireLogin, async (req, res) => {
  try {
    const user = req.user;
    
    logger.info('Profile page accessed', { userId: user._id });
    
    res.render('profile', {
      title: 'My Profile',
      user,
      constants,
      csrfToken: req.csrfToken()
    });
    
  } catch (error) {
    logger.error('Profile page error', {
      userId: req.session.userId,
      error: error.message
    });
    
    req.flash('error', 'Failed to load profile');
    res.redirect('/dashboard');
  }
});

// ============================================
// ✏️ UPDATE PROFILE
// ============================================

router.post('/profile', requireLogin, async (req, res) => {
  try {
    const { bio, location, interests } = req.body;
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/login');
    }
    
    // Update fields with sanitization
    if (bio !== undefined) {
      user.bio = sanitizeInput(bio).substring(0, constants.BIO_MAX_LENGTH);
    }
    
    if (location !== undefined) {
      user.location = sanitizeInput(location).substring(0, 100);
    }
    
    if (interests !== undefined) {
      user.interests = interests
        .split(',')
        .map(i => sanitizeInput(i.trim()))
        .filter(i => i.length > 0)
        .slice(0, 20); // Max 20 interests
    }
    
    await user.save();
    
    logger.info('Profile updated', { userId: user._id });
    
    req.flash('success', 'Profile updated successfully!');
    res.redirect('/profile');
    
  } catch (error) {
    logger.error('Profile update error', {
      userId: req.session.userId,
      error: error.message
    });
    
    req.flash('error', 'Failed to update profile');
    res.redirect('/profile');
  }
});

// ============================================
// 🔒 CHANGE PASSWORD
// ============================================

router.post('/profile/change-password', requireLogin, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.session.userId).select('+password');
    
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/login');
    }
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      req.flash('error', 'Current password is incorrect');
      return res.redirect('/profile');
    }
    
    // Validate new password
    if (newPassword.length < constants.PASSWORD_MIN_LENGTH) {
      req.flash('error', `Password must be at least ${constants.PASSWORD_MIN_LENGTH} characters`);
      return res.redirect('/profile');
    }
    
    if (newPassword !== confirmPassword) {
      req.flash('error', 'New passwords do not match');
      return res.redirect('/profile');
    }
    
    // Check password complexity
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      req.flash('error', 'Password must contain uppercase, lowercase, and number');
      return res.redirect('/profile');
    }
    
    // Update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    
    logger.info('Password changed', { userId: user._id });
    
    req.flash('success', 'Password changed successfully!');
    res.redirect('/profile');
    
  } catch (error) {
    logger.error('Password change error', {
      userId: req.session.userId,
      error: error.message
    });
    
    req.flash('error', 'Failed to change password');
    res.redirect('/profile');
  }
});

// ============================================
// 🗑️ DELETE ACCOUNT
// ============================================

router.post('/profile/delete', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Delete all matches involving this user
    await Match.deleteMany({
      $or: [{ user1: userId }, { user2: userId }]
    });
    
    // Delete all messages involving this user
    await Message.deleteMany({
      $or: [{ sender: userId }, { receiver: userId }]
    });
    
    // Delete user account
    await User.findByIdAndDelete(userId);
    
    logger.info('Account deleted', { userId });
    
    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        logger.error('Session destruction error', { error: err.message });
      }
    });
    
    req.flash('success', 'Account deleted successfully. We are sorry to see you go.');
    res.redirect('/register');
    
  } catch (error) {
    logger.error('Account deletion error', {
      userId: req.session.userId,
      error: error.message
    });
    
    req.flash('error', 'Failed to delete account');
    res.redirect('/profile');
  }
});

// ============================================
// 📸 UPLOAD PROFILE IMAGE (Placeholder)
// ============================================

router.post('/profile/upload-image', requireLogin, async (req, res) => {
  try {
    // TODO: Implement actual file upload with multer
    // For now, just update the profile image URL
    
    const { profileImage } = req.body;
    
    if (!profileImage) {
      return res.status(400).json({
        success: false,
        message: 'No image provided'
      });
    }
    
    // Validate image URL
    if (!profileImage.startsWith('http')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image URL'
      });
    }
    
    const user = await User.findById(req.session.userId);
    user.profileImage = sanitizeInput(profileImage);
    await user.save();
    
    logger.info('Profile image updated', { userId: user._id });
    
    res.json({
      success: true,
      message: 'Profile image updated successfully',
      profileImage: user.profileImage
    });
    
  } catch (error) {
    logger.error('Profile image upload error', {
      userId: req.session.userId,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload image'
    });
  }
});

// ============================================
// 👁️ VIEW ANOTHER USER'S PROFILE
// ============================================

router.get('/user/:userId', requireLogin, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;
    
    if (userId === currentUser._id.toString()) {
      return res.redirect('/profile');
    }
    
    const profileUser = await User.findById(userId)
      .select('username age gender location bio interests profileImage lastActive createdAt');
    
    if (!profileUser) {
      req.flash('error', 'User not found');
      return res.redirect('/dashboard');
    }
    
    // Check if they are matched
    const match = await Match.findOne({
      $or: [
        { user1: currentUser._id, user2: userId },
        { user1: userId, user2: currentUser._id }
      ],
      status: constants.MATCH_STATUS.ACCEPTED
    });
    
    const isMatched = !!match;
    const isOnline = require('../utils/helpers').isOnline(profileUser.lastActive);
    
    logger.info('User profile viewed', {
      viewerId: currentUser._id,
      viewedUserId: userId
    });
    
    res.render('user-profile', {
      title: profileUser.username,
      profileUser,
      isMatched,
      isOnline,
      getAvatarEmoji,
      constants,
      csrfToken: req.csrfToken()
    });
    
  } catch (error) {
    logger.error('View user profile error', {
      userId: req.session.userId,
      error: error.message
    });
    
    req.flash('error', 'Failed to load user profile');
    res.redirect('/dashboard');
  }
});

// ============================================
// 🚫 BLOCK USER
// ============================================

router.post('/user/:userId/block', requireLogin, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;
    
    if (userId === currentUser._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot block yourself'
      });
    }
    
    // Find or create match record with blocked status
    let match = await Match.findOne({
      $or: [
        { user1: currentUser._id, user2: userId },
        { user1: userId, user2: currentUser._id }
      ]
    });
    
    if (match) {
      match.status = constants.MATCH_STATUS.BLOCKED;
      await match.save();
    } else {
      match = new Match({
        user1: currentUser._id,
        user2: userId,
        status: constants.MATCH_STATUS.BLOCKED
      });
      await match.save();
    }
    
    logger.info('User blocked', {
      blockerId: currentUser._id,
      blockedUserId: userId
    });
    
    res.json({
      success: true,
      message: 'User blocked successfully'
    });
    
  } catch (error) {
    logger.error('Block user error', {
      userId: req.session.userId,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to block user'
    });
  }
});

// ============================================
// ⚠️ REPORT USER
// ============================================

router.post('/user/:userId/report', requireLogin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const currentUser = req.user;
    
    if (userId === currentUser._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot report yourself'
      });
    }
    
    const reportedUser = await User.findById(userId);
    
    if (!reportedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if already reported by this user
    const alreadyReported = reportedUser.reportedBy.some(
      r => r.userId.toString() === currentUser._id.toString()
    );
    
    if (alreadyReported) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this user'
      });
    }
    
    // Add report
    reportedUser.reportedBy.push({
      userId: currentUser._id,
      reason: sanitizeInput(reason) || 'Inappropriate behavior',
      date: new Date()
    });
    
    await reportedUser.save();
    
    // Auto-block if multiple reports
    if (reportedUser.reportedBy.length >= 5) {
      reportedUser.isActive = false;
      await reportedUser.save();
      logger.warn('User auto-deactivated due to multiple reports', {
        userId: reportedUser._id,
        reportCount: reportedUser.reportedBy.length
      });
    }
    
    logger.info('User reported', {
      reporterId: currentUser._id,
      reportedUserId: userId,
      reason
    });
    
    res.json({
      success: true,
      message: 'User reported successfully. Thank you for keeping our community safe.'
    });
    
  } catch (error) {
    logger.error('Report user error', {
      userId: req.session.userId,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to report user'
    });
  }
});

// ============================================
// ⚙️ ACCOUNT SETTINGS
// ============================================

router.get('/settings', requireLogin, async (req, res) => {
  try {
    const user = req.user;
    
    res.render('settings', {
      title: 'Account Settings',
      user,
      constants,
      csrfToken: req.csrfToken()
    });
    
  } catch (error) {
    logger.error('Settings page error', {
      userId: req.session.userId,
      error: error.message
    });
    
    req.flash('error', 'Failed to load settings');
    res.redirect('/dashboard');
  }
});

// ============================================
// 🔔 UPDATE NOTIFICATION PREFERENCES
// ============================================

router.post('/settings/notifications', requireLogin, async (req, res) => {
  try {
    const { emailNotifications, pushNotifications } = req.body;
    const user = await User.findById(req.session.userId);
    
    // TODO: Add notification preferences to User model
    // For now, just log the preference
    logger.info('Notification preferences updated', {
      userId: user._id,
      emailNotifications: emailNotifications === 'on',
      pushNotifications: pushNotifications === 'on'
    });
    
    req.flash('success', 'Notification preferences updated');
    res.redirect('/settings');
    
  } catch (error) {
    logger.error('Notification settings error', {
      userId: req.session.userId,
      error: error.message
    });
    
    req.flash('error', 'Failed to update notification settings');
    res.redirect('/settings');
  }
});

// ============================================
// 🚪 DEACTIVATE ACCOUNT (Temporary)
// ============================================

router.post('/settings/deactivate', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    user.isActive = false;
    await user.save();
    
    logger.info('Account deactivated', { userId: user._id });
    
    req.session.destroy();
    
    req.flash('success', 'Account deactivated. You can reactivate by logging in again.');
    res.redirect('/login');
    
  } catch (error) {
    logger.error('Account deactivation error', {
      userId: req.session.userId,
      error: error.message
    });
    
    req.flash('error', 'Failed to deactivate account');
    res.redirect('/settings');
  }
});

// ============================================
// 📈 USER STATISTICS (For Future Premium Features)
// ============================================

router.get('/stats', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Get match statistics
    const totalMatches = await Match.countDocuments({
      $or: [{ user1: userId }, { user2: userId }],
      status: constants.MATCH_STATUS.ACCEPTED
    });
    
    const pendingMatches = await Match.countDocuments({
      $or: [{ user1: userId }, { user2: userId }],
      status: constants.MATCH_STATUS.PENDING
    });
    
    const totalMessages = await Message.countDocuments({
      sender: userId
    });
    
    const profileViews = 0; // TODO: Implement profile view tracking
    
    res.render('stats', {
      title: 'My Statistics',
      stats: {
        totalMatches,
        pendingMatches,
        totalMessages,
        profileViews
      },
      csrfToken: req.csrfToken()
    });
    
  } catch (error) {
    logger.error('Stats page error', {
      userId: req.session.userId,
      error: error.message
    });
    
    req.flash('error', 'Failed to load statistics');
    res.redirect('/dashboard');
  }
});

module.exports = router;
