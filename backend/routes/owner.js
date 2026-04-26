const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const Salary = require('../models/Salary');
const adminMiddleware = require('../middleware/admin');

// POST /api/owner/login
router.post('/login', (req, res) => {
  const { adminKey } = req.body;
  const validKey = process.env.OWNER_KEY || 'owner@admin2026';
  if (adminKey !== validKey) {
    return res.status(401).json({ message: 'Invalid admin key' });
  }
  const token = jwt.sign(
    { isOwner: true, role: 'owner' },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '1d' }
  );
  res.json({ token, owner: { name: 'Owner', role: 'owner' } });
});

// GET /api/owner/employees — list all employees
router.get('/employees', adminMiddleware, async (req, res) => {
  try {
    const employees = await Employee.find().select('-password').sort({ employeeId: 1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/owner/employees/:id — update employee (base salary, distance, role, area, pincodes, mrId)
router.put('/employees/:id', adminMiddleware, async (req, res) => {
  try {
    const { baseSalary, travelDistance, department, designation, role, area, pincodes, mrId } = req.body;
    const emp = await Employee.findByIdAndUpdate(
      req.params.id,
      { baseSalary, travelDistance, department, designation, role, area, pincodes, mrId },
      { new: true }
    ).select('-password');
    res.json(emp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/owner/mr-list — list all MRs
router.get('/mr-list', adminMiddleware, async (req, res) => {
  try {
    const mrs = await Employee.find({ role: 'mr' }).select('-password').sort({ employeeId: 1 });
    res.json(mrs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/owner/mr/:mrId/team — get employees under a specific MR
router.get('/mr/:mrId/team', adminMiddleware, async (req, res) => {
  try {
    const team = await Employee.find({ mrId: req.params.mrId }).select('-password');
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
