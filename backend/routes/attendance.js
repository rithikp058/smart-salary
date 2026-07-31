const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// POST /api/attendance/checkin
router.post('/checkin', auth, async (req, res) => {
  try {
    const { photo } = req.body;
    if (!photo) return res.status(400).json({ message: 'Photo is required to mark attendance' });

    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);

    const existing = await Attendance.findOne({ employeeId: req.user.employeeId, date: today });
    if (existing && existing.checkedIn) {
      return res.status(409).json({ message: 'Already checked in today' });
    }

    const record = await Attendance.findOneAndUpdate(
      { employeeId: req.user.employeeId, date: today },
      { employeeId: req.user.employeeId, date: today, month, checkedIn: true, checkInTime: new Date(), photo },
      { upsert: true, new: true }
    );
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/attendance/my
router.get('/my', auth, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const records = await Attendance.find({ employeeId: req.user.employeeId, month });
    const daysPresent = records.filter(r => r.checkedIn).length;
    res.json({ month, daysPresent, records });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/attendance/all (owner)
router.get('/all', admin, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const employees = await Employee.find({}, 'employeeId name');
    const result = await Promise.all(employees.map(async (emp) => {
      const records = await Attendance.find({ employeeId: emp.employeeId, month });
      const days = records.filter(r => r.checkedIn).map(r => r.date);
      return { employeeId: emp.employeeId, employeeName: emp.name, days, records };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/attendance/override (owner)
router.put('/override', admin, async (req, res) => {
  try {
    const { employeeId, date, checkedIn } = req.body;
    const month = date.slice(0, 7);
    const record = await Attendance.findOneAndUpdate(
      { employeeId, date },
      { employeeId, date, month, checkedIn, overriddenByOwner: true, checkInTime: checkedIn ? new Date() : null },
      { upsert: true, new: true }
    );
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
