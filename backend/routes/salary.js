const express = require('express');
const router = express.Router();
const Salary = require('../models/Salary');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

/**
 * Salary Calculation Logic:
 * - Daily rate = baseSalary / 26
 * - Earned base = daysWorked * dailyRate (capped at 26)
 * - Absent deduction = absentDays * 250
 * - Travel allowance: distance > 50km → ₹2 × distance, else 0
 * - Incentive (MRP sales based):
 *     < 100000 → 0
 *     >= 100000 → 5% of base
 *     >= 125000 → 7.5% of base
 *     >= 150000 → 10% of base
 * - Tax = 10% of gross
 * - Net = earnedBase + incentive + travelAllowance - absentDeduction - deductions - tax
 */
function calculateSalary({ baseSalary, daysWorked, salesAmount, travelDistance, deductions = 0 }) {
  const totalWorkingDays = 26;
  const dailyRate = baseSalary / totalWorkingDays;
  const absentDays = Math.max(0, totalWorkingDays - daysWorked);
  const earnedBase = Math.round(Math.min(daysWorked, totalWorkingDays) * dailyRate);
  const absentDeduction = absentDays * 250;

  // Travel allowance
  const travelAllowance = travelDistance > 50 ? travelDistance * 2 : 0;

  // Incentive based on MRP sales
  let incentiveRate = 0;
  if (salesAmount >= 150000) incentiveRate = 0.10;
  else if (salesAmount >= 125000) incentiveRate = 0.075;
  else if (salesAmount >= 100000) incentiveRate = 0.05;
  const incentive = Math.round(baseSalary * incentiveRate);

  const gross = earnedBase + incentive + travelAllowance;
  const tax = Math.round(gross * 0.1);
  const netSalary = gross - tax - absentDeduction - deductions;

  return { earnedBase, absentDays, absentDeduction, travelAllowance, incentive, tax, netSalary, totalWorkingDays };
}

// POST /api/salary/enter-data — employee submits work data
router.post('/enter-data', authMiddleware, async (req, res) => {
  try {
    const { month, salesAmount, travelDistance } = req.body;
    const employee = await Employee.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Auto-calculate days from attendance
    const attendanceRecords = await Attendance.find({ employeeId: employee.employeeId, month });
    const daysWorked = attendanceRecords.filter(a => a.checkedIn).length;

    const dist = travelDistance ?? employee.travelDistance ?? 0;
    const { earnedBase, absentDays, absentDeduction, travelAllowance, incentive, tax, netSalary, totalWorkingDays } =
      calculateSalary({ baseSalary: employee.baseSalary, daysWorked, salesAmount: salesAmount || 0, travelDistance: dist });

    let record = await Salary.findOne({ employeeId: employee.employeeId, month });
    const fields = {
      daysWorked, totalWorkingDays, absentDays, absentDeduction,
      salesAmount: salesAmount || 0, travelDistance: dist, travelAllowance,
      incentive, tax, netSalary, baseSalary: employee.baseSalary,
      bonus: incentive, status: 'pending', employeeName: employee.name,
    };

    if (record) {
      Object.assign(record, fields);
      await record.save();
    } else {
      record = await Salary.create({ employeeId: employee.employeeId, month, ...fields });
    }
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/salary/build/:month — owner credits salary
router.post('/build/:month', adminMiddleware, async (req, res) => {
  try {
    const { employeeId, deductions } = req.body;
    const employee = await Employee.findOne({ employeeId });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    let record = await Salary.findOne({ employeeId, month: req.params.month });
    if (!record) return res.status(404).json({ message: 'No salary data for this month. Employee must enter data first.' });

    // Apply owner deductions
    if (deductions !== undefined) {
      record.deductions = deductions;
      const gross = record.earnedBase || (record.baseSalary / 26 * record.daysWorked);
      record.netSalary = record.netSalary - (deductions - (record.deductions || 0));
    }
    record.status = 'credited';
    record.creditedAt = new Date();
    await record.save();

    employee.notifications.push({ message: `Salary of ₹${record.netSalary.toLocaleString()} credited for ${req.params.month}` });
    await employee.save();

    res.json({ message: 'Salary processed and credited', record });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/salary/history — employee's own history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id);
    const records = await Salary.find({ employeeId: employee.employeeId }).sort({ month: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/salary/latest
router.get('/latest', authMiddleware, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id);
    const record = await Salary.findOne({ employeeId: employee.employeeId }).sort({ month: -1 });
    res.json(record || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/salary/all — owner: all employees all months
router.get('/all', adminMiddleware, async (req, res) => {
  try {
    const { month } = req.query;
    const filter = month ? { month } : {};
    const records = await Salary.find(filter).sort({ month: -1, employeeId: 1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/salary/deductions — owner sets deductions for an employee month
router.put('/deductions', adminMiddleware, async (req, res) => {
  try {
    const { employeeId, month, deductions } = req.body;
    const record = await Salary.findOne({ employeeId, month });
    if (!record) return res.status(404).json({ message: 'No salary record found' });

    const diff = deductions - record.deductions;
    record.deductions = deductions;
    record.netSalary = record.netSalary - diff;
    await record.save();
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
