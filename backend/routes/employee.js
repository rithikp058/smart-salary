const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');

// GET /api/employee/me
router.get('/me', auth, async (req, res) => {
  try {
    const emp = await Employee.findOne({ employeeId: req.user.employeeId }).select('-password');
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    res.json(emp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/employee/me
router.put('/me', auth, async (req, res) => {
  try {
    const { name, email, phone, department, designation, bankDetails } = req.body;
    const emp = await Employee.findOneAndUpdate(
      { employeeId: req.user.employeeId },
      { name, email, phone, department, designation, bankDetails },
      { new: true, runValidators: true }
    ).select('-password');
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    res.json(emp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/employee/notifications
router.get('/notifications', auth, async (req, res) => {
  try {
    const emp = await Employee.findOne({ employeeId: req.user.employeeId }).select('notifications');
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    res.json(emp.notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/employee/notifications/read
router.put('/notifications/read', auth, async (req, res) => {
  try {
    await Employee.updateOne(
      { employeeId: req.user.employeeId },
      { $set: { 'notifications.$[].read': true } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
