const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// POST /api/leaves — employee applies
router.post('/', authMiddleware, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id);
    const { dates, leaveType, reason } = req.body;
    if (!dates?.length || !leaveType || !reason)
      return res.status(400).json({ message: 'Dates, leave type, and reason are required' });

    const leave = await Leave.create({
      employeeId: employee.employeeId,
      employeeName: employee.name,
      dates,
      month: dates[0].slice(0, 7),
      leaveType,
      reason,
    });
    res.status(201).json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/leaves/my
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id);
    const leaves = await Leave.find({ employeeId: employee.employeeId }).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/leaves/all — owner
router.get('/all', adminMiddleware, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.month) filter.month = req.query.month;
    const leaves = await Leave.find(filter).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/leaves/:id — owner approves/rejects
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, ownerNote: req.body.note || '' },
      { new: true }
    );
    if (!leave) return res.status(404).json({ message: 'Leave not found' });

    const emp = await Employee.findOne({ employeeId: leave.employeeId });
    if (emp) {
      const msg = leave.status === 'approved'
        ? `✅ Your ${leave.leaveType} leave for ${leave.dates.join(', ')} has been approved.`
        : `❌ Your leave request for ${leave.dates.join(', ')} was rejected.`;
      emp.notifications.push({ message: msg });
      await emp.save();
    }
    res.json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
