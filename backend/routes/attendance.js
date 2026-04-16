const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// POST /api/attendance/checkin — employee daily check-in
router.post('/checkin', authMiddleware, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const today = new Date();
    const date = today.toISOString().slice(0, 10);
    const month = today.toISOString().slice(0, 7);

    const existing = await Attendance.findOne({ employeeId: employee.employeeId, date });
    if (existing) return res.status(409).json({ message: 'Already checked in today', record: existing });

    // Photo is mandatory — no photo = no attendance
    if (!req.body.photo) {
      return res.status(400).json({ message: 'Photo is required to mark attendance. Please capture a photo.' });
    }

    const record = await Attendance.create({
      employeeId: employee.employeeId,
      date, month,
      checkedIn: true,
      checkInTime: today,
      photo: req.body.photo || '',
    });
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/attendance/my — employee's own attendance for a month
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id);
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const records = await Attendance.find({ employeeId: employee.employeeId, month }).sort({ date: 1 });
    const daysPresent = records.filter(r => r.checkedIn).length;
    res.json({ records, daysPresent, month });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/attendance/all — owner: all employees attendance
router.get('/all', adminMiddleware, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const records = await Attendance.find({ month }).sort({ employeeId: 1, date: 1 });

    // Group by employee
    const grouped = {};
    for (const r of records) {
      if (!grouped[r.employeeId]) grouped[r.employeeId] = { employeeId: r.employeeId, days: [] };
      grouped[r.employeeId].days.push(r.date);
    }
    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/attendance/override — owner manually sets attendance
router.put('/override', adminMiddleware, async (req, res) => {
  try {
    const { employeeId, date, checkedIn } = req.body;
    if (!employeeId || !date) return res.status(400).json({ message: 'employeeId and date required' });
    const month = date.slice(0, 7);
    let record = await Attendance.findOne({ employeeId, date });
    if (record) {
      record.checkedIn = checkedIn;
      record.overriddenByOwner = true;
      await record.save();
    } else {
      record = await Attendance.create({ employeeId, date, month, checkedIn, overriddenByOwner: true });
    }
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
