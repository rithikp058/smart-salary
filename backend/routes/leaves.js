const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// POST /api/leaves (employee applies)
router.post('/', auth, async (req, res) => {
  try {
    const { dates, leaveType, reason } = req.body;
    if (!dates || !dates.length || !leaveType || !reason) {
      return res.status(400).json({ message: 'Dates, leave type and reason are required' });
    }
    const emp = await Employee.findOne({ employeeId: req.user.employeeId });
    const month = dates[0].slice(0, 7);
    const leave = new Leave({
      employeeId: req.user.employeeId,
      employeeName: emp?.name || req.user.employeeId,
      dates, leaveType, reason, month
    });
    await leave.save();
    res.status(201).json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/leaves/my (employee)
router.get('/my', auth, async (req, res) => {
  try {
    const leaves = await Leave.find({ employeeId: req.user.employeeId }).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/leaves/all (owner)
router.get('/all', admin, async (req, res) => {
  try {
    const { status, month } = req.query;
    const query = {};
    if (status) query.status = status;
    if (month) query.month = month;
    const leaves = await Leave.find(query).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/leaves/:id (owner approves/rejects)
router.put('/:id', admin, async (req, res) => {
  try {
    const { status, note } = req.body;
    const leave = await Leave.findByIdAndUpdate(req.params.id, { status, ownerNote: note || '' }, { new: true });
    if (!leave) return res.status(404).json({ message: 'Leave not found' });
    res.json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
