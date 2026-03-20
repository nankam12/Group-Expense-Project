const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Payment = require('../models/Payment');
const { protect } = require('../middleware/auth');

// GET /api/balances  — net balance with every other user
router.get('/', protect, async (req, res) => {
  try {
    const myId = req.user._id.toString();

    const expenses = await Expense.find({
      $or: [{ paidBy: req.user._id }, { 'participants.user': req.user._id }],
    })
      .populate('paidBy', 'name email')
      .populate('participants.user', 'name email');

    const payments = await Payment.find({
      $or: [{ payer: req.user._id }, { payee: req.user._id }],
      status: 'completed',
    });

    // balanceMap[userId] = { user, amount }
    // positive = they owe me; negative = I owe them
    const balanceMap = {};

    for (const expense of expenses) {
      const payerId = expense.paidBy._id.toString();
      const iAmPayer = payerId === myId;

      for (const p of expense.participants) {
        const participantId = p.user._id.toString();
        if (p.paid) continue; // already settled

        if (iAmPayer && participantId !== myId) {
          // I paid; they owe me
          if (!balanceMap[participantId]) balanceMap[participantId] = { user: p.user, amount: 0 };
          balanceMap[participantId].amount += p.amount;
        } else if (!iAmPayer && participantId === myId) {
          // Someone else paid; I owe them
          if (!balanceMap[payerId]) balanceMap[payerId] = { user: expense.paidBy, amount: 0 };
          balanceMap[payerId].amount -= p.amount;
        }
      }
    }

    // Adjust for recorded payments
    for (const payment of payments) {
      const payerId = payment.payer.toString();
      const payeeId = payment.payee.toString();
      const otherUserId = payerId === myId ? payeeId : payerId;

      if (!balanceMap[otherUserId]) continue;

      if (payerId === myId) {
        // I paid them → reduces what I owe / increases credit
        balanceMap[otherUserId].amount += payment.amount;
      } else {
        // They paid me → reduces what they owe me
        balanceMap[otherUserId].amount -= payment.amount;
      }
    }

    const balances = Object.values(balanceMap).filter((b) => Math.abs(b.amount) > 0.001);
    res.json(balances);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
