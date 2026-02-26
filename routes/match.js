// routes/match.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Match = require('../models/Match');
const Message = require('../models/Message');
const { requireLogin } = require('../middleware/auth');

// Like User
router.post('/like/:userId', requireLogin, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.session.userId;
    
    if (userId === currentUserId) {
      return res.status(400).json({ success: false, message: 'Cannot like yourself' });
    }
    
    let match = await Match.findOne({
      $or: [
        { user1: currentUserId, user2: userId },
        { user1: userId, user2: currentUserId }
      ]
    });
    
    if (!match) {
      match = new Match({
        user1: currentUserId,
        user2: userId,
        likedBy: [{ userId: currentUserId }]
      });
      await match.save();
    } else {
      const alreadyLiked = match.likedBy?.some(l => l.userId?.toString() === currentUserId);
      if (!alreadyLiked) {
        match.likedBy.push({ userId: currentUserId });
        await match.save();
      }
    }
    
    const isMatch = match.likedBy.length >= 2;
    res.json({ success: true, isMatch, message: isMatch ? "It's a match!" : "Like sent!" });
  } catch (error) {
    console.error('Like error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send like' });
  }
});

// Get Matches
router.get('/matches', requireLogin, async (req, res) => {
  try {
    const matches = await Match.find({
      $or: [{ user1: req.session.userId }, { user2: req.session.userId }],
      status: 'accepted'
    }).populate('user1', 'username age profileImage')
      .populate('user2', 'username age profileImage');
    
    const matchList = matches.map(m => {
      return m.user1._id.toString() === req.session.userId ? m.user2 : m.user1;
    });
    
    res.render('matches', { title: 'My Matches', matches: matchList });
  } catch (error) {
    console.error('Matches error:', error.message);
    req.flash('error', 'Failed to load matches');
    res.redirect('/dashboard');
  }
});

// Messages
router.get('/messages/:matchId', requireLogin, async (req, res) => {
  try {
    const { matchId } = req.params;
    const match = await Match.findOne({
      _id: matchId,
      $or: [{ user1: req.session.userId }, { user2: req.session.userId }],
      status: 'accepted'
    });
    
    if (!match) return res.redirect('/matches');
    
    const otherId = match.user1.toString() === req.session.userId ? match.user2 : match.user1;
    const otherUser = await User.findById(otherId);
    const messages = await Message.find({ matchId }).populate('sender', 'username').sort({ createdAt: 1 });
    
    await Message.updateMany({ matchId, receiver: req.session.userId, isRead: false }, { isRead: true });
    
    res.render('messages', { title: 'Messages', match, otherUser, messages });
  } catch (error) {
    console.error('Messages error:', error.message);
    req.flash('error', 'Failed to load messages');
    res.redirect('/matches');
  }
});

// Send Message
router.post('/messages/:matchId', requireLogin, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { content } = req.body;
    
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    
    const match = await Match.findOne({
      _id: matchId,
      $or: [{ user1: req.session.userId }, { user2: req.session.userId }],
      status: 'accepted'
    });
    
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    
    const receiver = match.user1.toString() === req.session.userId ? match.user2 : match.user1;
    
    await Message.create({
      matchId,
      sender: req.session.userId,
      receiver,
      content: content.trim()
    });
    
    res.json({ success: true, message: 'Message sent!' });
  } catch (error) {
    console.error('Send message error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

// Report User
router.post('/report/:userId', requireLogin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const user = await User.findById(userId);
    
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    user.reportedBy.push({ userId: req.session.userId, reason: reason || 'Inappropriate behavior' });
    
    if (user.reportedBy.length >= 5) {
      user.isActive = false;
      await user.save();
    } else {
      await user.save();
    }
    
    res.json({ success: true, message: 'User reported' });
  } catch (error) {
    console.error('Report error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to report' });
  }
});

module.exports = router;
