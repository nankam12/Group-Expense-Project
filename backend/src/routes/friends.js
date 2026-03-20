const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Friendship = require('../models/Friendship');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// GET /api/friends  — accepted friends list
router.get('/', protect, async (req, res) => {
  try {
    const friendships = await Friendship.find({
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
      status: 'accepted',
    })
      .populate('requester', 'name email')
      .populate('recipient', 'name email');

    const friends = friendships.map((f) => {
      const isRequester = f.requester._id.toString() === req.user._id.toString();
      const friend = isRequester ? f.recipient : f.requester;
      return { friendshipId: f._id, ...friend.toObject() };
    });

    res.json(friends);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/friends/requests  — pending requests received
router.get('/requests', protect, async (req, res) => {
  try {
    const requests = await Friendship.find({
      recipient: req.user._id,
      status: 'pending',
    }).populate('requester', 'name email');

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/friends/sent  — pending requests sent
router.get('/sent', protect, async (req, res) => {
  try {
    const sent = await Friendship.find({
      requester: req.user._id,
      status: 'pending',
    }).populate('recipient', 'name email');

    res.json(sent);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/friends/request/:userId  — send a friend request
router.post('/request/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot send a friend request to yourself' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    const existing = await Friendship.findOne({
      $or: [
        { requester: req.user._id, recipient: userId },
        { requester: userId, recipient: req.user._id },
      ],
    });
    if (existing) {
      return res.status(400).json({ message: 'Friend request already exists or you are already friends' });
    }

    const friendship = await Friendship.create({
      requester: req.user._id,
      recipient: userId,
    });

    res.status(201).json(friendship);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/friends/accept/:friendshipId  — accept a request
router.put('/accept/:friendshipId', protect, async (req, res) => {
  try {
    const friendship = await Friendship.findById(req.params.friendshipId);
    if (!friendship) return res.status(404).json({ message: 'Friend request not found' });

    if (friendship.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept this request' });
    }

    friendship.status = 'accepted';
    await friendship.save();
    res.json(friendship);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/friends/:friendshipId  — reject or remove
router.delete('/:friendshipId', protect, async (req, res) => {
  try {
    const friendship = await Friendship.findById(req.params.friendshipId);
    if (!friendship) return res.status(404).json({ message: 'Friendship not found' });

    const isInvolved =
      friendship.requester.toString() === req.user._id.toString() ||
      friendship.recipient.toString() === req.user._id.toString();
    if (!isInvolved) return res.status(403).json({ message: 'Not authorized' });

    await friendship.deleteOne();
    res.json({ message: 'Friendship removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
