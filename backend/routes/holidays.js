const express = require('express');
const router = express.Router();
const Holiday = require('../models/Holiday');
const adminMiddleware = require('../middleware/admin');
const authMiddleware = require('../middleware/auth');

// GET /api/holidays?month=YYYY-MM
router.get('/', authMiddleware, async (req, res) => {
  try {
    const filter = req.query.month ? { date: { $regex: `^${req.query.month}` } } : {};
    const holidays = await Holiday.find(filter).sort({ date: 1 });
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/holidays
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { date, reason } = req.body;
    if (!date || !reason) return res.status(400).json({ message: 'Date and reason required' });
    const holiday = await Holiday.create({ date, reason });
    res.status(201).json(holiday);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Holiday already exists for this date' });
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/holidays/:id
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!holiday) return res.status(404).json({ message: 'Holiday not found' });
    res.json(holiday);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/holidays/:id
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndDelete(req.params.id);
    if (!holiday) return res.status(404).json({ message: 'Holiday not found' });
    res.json({ message: 'Holiday deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
