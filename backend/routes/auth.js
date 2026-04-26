const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const authMiddleware = require('../middleware/auth');

const signToken = (employee) =>
  jwt.sign(
    { id: employee._id, employeeId: employee.employeeId, role: employee.role || 'employee' },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { employeeId, name, email, password, department, designation, baseSalary } = req.body;
    if (!employeeId || !name || !email || !password)
      return res.status(400).json({ message: 'Required fields missing' });

    const exists = await Employee.findOne({ $or: [{ email }, { employeeId }] });
    if (exists) return res.status(409).json({ message: 'Employee ID or email already exists' });

    const employee = await Employee.create({ employeeId, name, email, password, department, designation, baseSalary });
    const token = signToken(employee);
    res.status(201).json({ token, employee: { id: employee._id, employeeId, name, email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    if (!employeeId || !password)
      return res.status(400).json({ message: 'Employee ID and password required' });

    const employee = await Employee.findOne({ employeeId });
    if (!employee || !(await employee.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(employee);
    res.json({ token, employee: { id: employee._id, employeeId: employee.employeeId, name: employee.name, email: employee.email, role: employee.role || 'employee', area: employee.area, pincodes: employee.pincodes, mrId: employee.mrId } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const employee = await Employee.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    if (!(await employee.comparePassword(currentPassword)))
      return res.status(401).json({ message: 'Current password is incorrect' });

    employee.password = newPassword;
    await employee.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/forgot-password (demo: just returns a reset token)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const employee = await Employee.findOne({ email });
    if (!employee) return res.status(404).json({ message: 'No account with that email' });
    // In production, send email. Here we return a token for demo.
    const resetToken = jwt.sign({ id: employee._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '15m' });
    res.json({ message: 'Reset token generated (demo)', resetToken });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
