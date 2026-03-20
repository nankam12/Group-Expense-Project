const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');

// GET /api/payments  — payments involving current user
router.get('/', protect, async (req, res) => {
  try {
    const payments = await Payment.find({
      $or: [{ payer: req.user._id }, { payee: req.user._id }],
    })
      .populate('payer', 'name email')
      .populate('payee', 'name email')
      .populate('expense', 'title totalAmount category')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/payments  — record a payment
router.post('/', protect, async (req, res) => {
  try {
    const { payee, amount, expense, note } = req.body;

    if (!payee || !amount) {
      return res.status(400).json({ message: 'payee and amount are required' });
    }
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }
    if (payee === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot record a payment to yourself' });
    }

    const payment = await Payment.create({
      payer: req.user._id,
      payee,
      amount: parseFloat(amount),
      expense: expense && mongoose.Types.ObjectId.isValid(expense) ? expense : null,
      note: note?.trim(),
      status: 'completed',
      completedAt: new Date(),
    });

    // If linked to an expense, mark that participant as paid
    if (payment.expense) {
      const exp = await Expense.findById(payment.expense);
      if (exp) {
        const participant = exp.participants.find(
          (p) => p.user.toString() === req.user._id.toString()
        );
        if (participant) {
          participant.paid = true;
          await exp.save();
        }
      }
    }

    const populated = await payment.populate([
      { path: 'payer', select: 'name email' },
      { path: 'payee', select: 'name email' },
      { path: 'expense', select: 'title totalAmount category' },
    ]);

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
