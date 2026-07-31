const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Employee = require('../models/Employee');
const MR = require('../models/MR');
const auth = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, employeeId, email, department, designation, baseSalary, password, phone } = req.body;
    if (!name || !employeeId || !email || !password) {
      return res.status(400).json({ message: 'Name, Employee ID, email and password are required' });
    }
    const exists = await Employee.findOne({ $or: [{ employeeId }, { email }] });
    if (exists) return res.status(409).json({ message: 'Employee ID or email already exists' });

    const emp = new Employee({ name, employeeId, email, password, department, designation, baseSalary: baseSalary || 0, phone });
    await emp.save();

    const token = jwt.sign({ id: emp._id, employeeId: emp.employeeId, role: 'employee' }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.status(201).json({ token, employee: { name: emp.name, employeeId: emp.employeeId, email: emp.email, department: emp.department, designation: emp.designation, baseSalary: emp.baseSalary } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    if (!employeeId || !password) return res.status(400).json({ message: 'Employee ID and password required' });

    const emp = await Employee.findOne({ employeeId });
    if (!emp) return res.status(401).json({ message: 'Invalid Employee ID or password' });

    const valid = await emp.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid Employee ID or password' });

    const token = jwt.sign({ id: emp._id, employeeId: emp.employeeId, role: emp.role || 'employee' }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({
      token,
      employee: {
        name: emp.name, employeeId: emp.employeeId, email: emp.email,
        department: emp.department, designation: emp.designation,
        baseSalary: emp.baseSalary, role: emp.role || 'employee',
        assignedArea: emp.assignedArea, assignedPincodes: emp.assignedPincodes,
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/mr-login
router.post('/mr-login', async (req, res) => {
  try {
    const { mrId, password } = req.body;
    if (!mrId || !password) return res.status(400).json({ message: 'MR ID and password required' });

    const mr = await MR.findOne({ mrId });
    if (!mr) return res.status(401).json({ message: 'Invalid MR ID or password' });

    const valid = await mr.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid MR ID or password' });

    const token = jwt.sign({ id: mr._id, mrId: mr.mrId, role: 'mr', isMR: true }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({
      token,
      mr: { name: mr.name, mrId: mr.mrId, email: mr.email, area: mr.area, pincodes: mr.pincodes, employeeIds: mr.employeeIds }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/change-password
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const emp = await Employee.findOne({ employeeId: req.user.employeeId });
    if (!emp) return res.status(404).json({ message: 'Employee not found' });

    const valid = await emp.comparePassword(currentPassword);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });

    emp.password = newPassword;
    await emp.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const emp = await Employee.findOne({ email });
    if (!emp) return res.status(404).json({ message: 'No account found with this email' });
    const resetToken = crypto.randomBytes(20).toString('hex');
    res.json({ message: 'Reset link sent to your email', resetToken });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
