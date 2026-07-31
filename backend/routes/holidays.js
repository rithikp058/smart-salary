const express = require('express');
const router = express.Router();
const Holiday = require('../models/Holiday');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// GET /api/holidays
router.get('/', async (req, res) => {
  try {
    const { month } = req.query;
    const query = month ? { date: { $regex: `^${month}` } } : {};
    const holidays = await Holiday.find(query).sort({ date: 1 });
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/holidays (owner)
router.post('/', admin, async (req, res) => {
  try {
    const { date, reason } = req.body;
    if (!date || !reason) return res.status(400).json({ message: 'Date and reason are required' });
    const holiday = new Holiday({ date, reason });
    await holiday.save();
    res.status(201).json(holiday);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Holiday already exists for this date' });
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/holidays/:id (owner)
router.put('/:id', admin, async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!holiday) return res.status(404).json({ message: 'Holiday not found' });
    res.json(holiday);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/holidays/:id (owner)
router.delete('/:id', admin, async (req, res) => {
  try {
    await Holiday.findByIdAndDelete(req.params.id);
    res.json({ message: 'Holiday deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
