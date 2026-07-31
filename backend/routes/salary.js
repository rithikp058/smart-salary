const express = require('express');
const router = express.Router();
const Salary = require('../models/Salary');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Holiday = require('../models/Holiday');
const Leave = require('../models/Leave');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// POST /api/salary/enter-data (employee submits monthly data)
router.post('/enter-data', auth, async (req, res) => {
  try {
    const { month, salesAmount, travelDistance } = req.body;
    const emp = await Employee.findOne({ employeeId: req.user.employeeId });
    if (!emp) return res.status(404).json({ message: 'Employee not found' });

    const record = await Salary.findOneAndUpdate(
      { employeeId: req.user.employeeId, month },
      { employeeId: req.user.employeeId, employeeName: emp.name, month, salesAmount: salesAmount || 0, travelDistance: travelDistance || 0 },
      { upsert: true, new: true }
    );
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/salary/build/:month (owner builds/credits salary)
router.post('/build/:month', admin, async (req, res) => {
  try {
    const { month } = req.params;
    const { employeeId, deductions } = req.body;

    const query = employeeId ? { employeeId } : {};
    const employees = await Employee.find(query);

    const results = [];
    for (const emp of employees) {
      const attRecords = await Attendance.find({ employeeId: emp.employeeId, month });
      const daysWorked = attRecords.filter(r => r.checkedIn).length;

      const holidays = await Holiday.find({ date: { $regex: `^${month}` } });
      const approvedLeaves = await Leave.find({ employeeId: emp.employeeId, month, status: 'approved' });
      const paidLeaveDates = approvedLeaves.filter(l => l.leaveType === 'paid').flatMap(l => l.dates);
      const unpaidLeaveDates = approvedLeaves.filter(l => l.leaveType === 'unpaid').flatMap(l => l.dates);

      const totalDaysInMonth = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).getDate();
      const workingDays = totalDaysInMonth - holidays.length;
      const absentDays = Math.max(0, workingDays - daysWorked - paidLeaveDates.length - unpaidLeaveDates.length);
      const absentDeduction = (absentDays + unpaidLeaveDates.length) * 250;

      const existing = await Salary.findOne({ employeeId: emp.employeeId, month });
      const salesAmount = existing?.salesAmount || 0;
      const travelDist = existing?.travelDistance || emp.travelDistance || 0;

      const dailyRate = emp.baseSalary / 26;
      const earnedBase = Math.round(Math.min(daysWorked, 26) * dailyRate);
      const travelAllowance = travelDist > 50 ? travelDist * 2 : 0;

      let incentiveRate = 0;
      if (salesAmount >= 150000) incentiveRate = 0.10;
      else if (salesAmount >= 125000) incentiveRate = 0.075;
      else if (salesAmount >= 100000) incentiveRate = 0.05;
      const incentive = Math.round(emp.baseSalary * incentiveRate);

      const gross = earnedBase + incentive + travelAllowance;
      const tax = Math.round(gross * 0.1);
      const extraDeductions = deductions !== undefined ? deductions : (existing?.deductions || 0);
      const netSalary = gross - tax - absentDeduction - extraDeductions;

      const record = await Salary.findOneAndUpdate(
        { employeeId: emp.employeeId, month },
        {
          employeeId: emp.employeeId, employeeName: emp.name, month,
          baseSalary: emp.baseSalary, daysWorked, totalWorkingDays: workingDays,
          absentDays, absentDeduction, salesAmount, incentive,
          travelDistance: travelDist, travelAllowance,
          deductions: extraDeductions, tax, netSalary,
          status: 'credited', creditedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      // Notify employee
      await Employee.updateOne(
        { employeeId: emp.employeeId },
        { $push: { notifications: { message: `✅ Salary of ₹${netSalary.toLocaleString()} credited for ${month}`, read: false, createdAt: new Date() } } }
      );
      results.push(record);
    }
    res.json({ message: 'Salary built successfully', records: results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/salary/history (employee)
router.get('/history', auth, async (req, res) => {
  try {
    const records = await Salary.find({ employeeId: req.user.employeeId }).sort({ month: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/salary/latest (employee)
router.get('/latest', auth, async (req, res) => {
  try {
    const record = await Salary.findOne({ employeeId: req.user.employeeId }).sort({ month: -1 });
    res.json(record || {});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/salary/all (owner)
router.get('/all', admin, async (req, res) => {
  try {
    const { month } = req.query;
    const query = month ? { month } : {};
    const records = await Salary.find(query).sort({ month: -1, employeeId: 1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/salary/deductions (owner sets extra deductions)
router.put('/deductions', admin, async (req, res) => {
  try {
    const { employeeId, month, deductions } = req.body;
    const record = await Salary.findOneAndUpdate(
      { employeeId, month },
      { deductions },
      { new: true }
    );
    res.json(record || { message: 'No salary record found for this month' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/salary/incentive-adjust (owner adjusts incentive for returns)
router.put('/incentive-adjust', admin, async (req, res) => {
  try {
    const { employeeId, month, incentiveAdjustment, stockReturns, incentiveStatus } = req.body;
    const record = await Salary.findOneAndUpdate(
      { employeeId, month },
      { incentiveAdjustment: incentiveAdjustment || 0, stockReturns: stockReturns || 0, incentiveStatus: incentiveStatus || 'adjusted' },
      { new: true }
    );
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
