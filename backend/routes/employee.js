const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const authMiddleware = require('../middleware/auth');

// GET /api/employee/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id).select('-password');
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/employee/me
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { name, email, phone, department, designation, bankDetails } = req.body;
    const employee = await Employee.findByIdAndUpdate(
      req.user.id,
      { name, email, phone, department, designation, bankDetails },
      { new: true, runValidators: true }
    ).select('-password');
    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/employee/notifications
router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id).select('notifications');
    res.json(employee.notifications.reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/employee/notifications/read
router.put('/notifications/read', authMiddleware, async (req, res) => {
  try {
    await Employee.updateOne(
      { _id: req.user.id },
      { $set: { 'notifications.$[].read': true } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
