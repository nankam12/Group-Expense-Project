const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');

// GET /api/expenses  — all expenses involving current user
router.get('/', protect, async (req, res) => {
  try {
    const expenses = await Expense.find({
      $or: [{ paidBy: req.user._id }, { 'participants.user': req.user._id }],
    })
      .populate('paidBy', 'name email')
      .populate('participants.user', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/expenses  — create a new expense
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, category, totalAmount, paidBy, participants, splitType } = req.body;

    if (!title || !totalAmount || !paidBy || !participants || participants.length === 0) {
      return res.status(400).json({ message: 'title, totalAmount, paidBy, and participants are required' });
    }

    if (isNaN(parseFloat(totalAmount)) || parseFloat(totalAmount) <= 0) {
      return res.status(400).json({ message: 'totalAmount must be a positive number' });
    }

    let processedParticipants;
    if (splitType === 'equal' || !splitType) {
      const share = parseFloat((totalAmount / participants.length).toFixed(2));
      processedParticipants = participants.map((p) => ({
        user: p.user,
        amount: share,
        paid: p.user.toString() === paidBy.toString(),
      }));
      // Correct rounding so amounts sum to totalAmount
      const summed = processedParticipants.reduce((acc, p) => acc + p.amount, 0);
      const diff = parseFloat((totalAmount - summed).toFixed(2));
      if (diff !== 0) processedParticipants[0].amount = parseFloat((processedParticipants[0].amount + diff).toFixed(2));
    } else {
      // Custom split — validate that amounts sum to totalAmount
      const customSum = participants.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
      if (Math.abs(customSum - parseFloat(totalAmount)) > 0.02) {
        return res.status(400).json({ message: 'Custom amounts must sum to the total amount' });
      }
      processedParticipants = participants.map((p) => ({
        user: p.user,
        amount: parseFloat(p.amount),
        paid: p.user.toString() === paidBy.toString(),
      }));
    }

    const expense = await Expense.create({
      title: title.trim(),
      description: description?.trim(),
      category: category || 'other',
      totalAmount: parseFloat(totalAmount),
      paidBy,
      participants: processedParticipants,
      splitType: splitType || 'equal',
      createdBy: req.user._id,
    });

    const populated = await expense.populate([
      { path: 'paidBy', select: 'name email' },
      { path: 'participants.user', select: 'name email' },
      { path: 'createdBy', select: 'name email' },
    ]);

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/expenses/:id
router.get('/:id', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid expense ID' });
    }

    const expense = await Expense.findById(req.params.id)
      .populate('paidBy', 'name email')
      .populate('participants.user', 'name email')
      .populate('createdBy', 'name email');

    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    const isInvolved =
      expense.paidBy._id.toString() === req.user._id.toString() ||
      expense.participants.some((p) => p.user._id.toString() === req.user._id.toString());

    if (!isInvolved) return res.status(403).json({ message: 'Not authorized' });

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid expense ID' });
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    if (expense.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the creator can delete this expense' });
    }

    await expense.deleteOne();
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
