const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const MR = require('../models/MR');
const CallReport = require('../models/CallReport');
const StockRequest = require('../models/StockRequest');
const admin = require('../middleware/admin');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';
const OWNER_KEY = process.env.OWNER_KEY || 'owner@admin2026';

// POST /api/owner/login
router.post('/login', async (req, res) => {
  try {
    const { adminKey } = req.body;
    if (adminKey !== OWNER_KEY) return res.status(401).json({ message: 'Invalid admin key' });
    const token = jwt.sign({ isOwner: true, role: 'owner' }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ token, owner: { name: 'Owner', role: 'owner' } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/owner/employees
router.get('/employees', admin, async (req, res) => {
  try {
    const employees = await Employee.find({}).select('-password').sort({ employeeId: 1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/owner/employees/:id
router.put('/employees/:id', admin, async (req, res) => {
  try {
    const emp = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    res.json(emp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/owner/employees (create employee)
router.post('/employees', admin, async (req, res) => {
  try {
    const { name, employeeId, email, password, department, designation, baseSalary, phone, assignedArea, assignedPincodes, mrId, role } = req.body;
    if (!name || !employeeId || !email || !password) {
      return res.status(400).json({ message: 'Name, Employee ID, email and password are required' });
    }
    const exists = await Employee.findOne({ $or: [{ employeeId }, { email }] });
    if (exists) return res.status(409).json({ message: 'Employee ID or email already exists' });

    const emp = new Employee({
      name, employeeId, email, password, department, designation,
      baseSalary: baseSalary || 0, phone, role: role || 'employee',
      assignedArea: assignedArea || '', assignedPincodes: assignedPincodes || [],
      mrId: mrId || ''
    });
    await emp.save();
    const saved = emp.toObject();
    delete saved.password;
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/owner/employees/:id
router.delete('/employees/:id', admin, async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── MR Management ──────────────────────────────────────────────────────────

// GET /api/owner/mrs
router.get('/mrs', admin, async (req, res) => {
  try {
    const mrs = await MR.find({}).select('-password').sort({ mrId: 1 });
    res.json(mrs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/owner/mrs
router.post('/mrs', admin, async (req, res) => {
  try {
    const { name, mrId, email, password, phone, area, pincodes, employeeIds, baseSalary } = req.body;
    if (!name || !mrId || !email || !password) {
      return res.status(400).json({ message: 'Name, MR ID, email and password are required' });
    }
    const exists = await MR.findOne({ $or: [{ mrId }, { email }] });
    if (exists) return res.status(409).json({ message: 'MR ID or email already exists' });

    const mr = new MR({ name, mrId, email, password, phone, area: area || '', pincodes: pincodes || [], employeeIds: employeeIds || [], baseSalary: baseSalary || 0 });
    await mr.save();
    const saved = mr.toObject();
    delete saved.password;
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/owner/mrs/:id
router.put('/mrs/:id', admin, async (req, res) => {
  try {
    const mr = await MR.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
    if (!mr) return res.status(404).json({ message: 'MR not found' });
    res.json(mr);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/owner/mrs/:id
router.delete('/mrs/:id', admin, async (req, res) => {
  try {
    await MR.findByIdAndDelete(req.params.id);
    res.json({ message: 'MR deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Analytics ──────────────────────────────────────────────────────────────

// GET /api/owner/analytics
router.get('/analytics', admin, async (req, res) => {
  try {
    const { month } = req.query;
    const currentMonth = month || new Date().toISOString().slice(0, 7);

    const [employees, mrs, callReports, stockRequests] = await Promise.all([
      Employee.find({}).select('-password'),
      MR.find({}).select('-password'),
      CallReport.find({ month: currentMonth }),
      StockRequest.find({ month: currentMonth }),
    ]);

    // Per-employee call stats
    const empCallStats = employees.map(emp => {
      const calls = callReports.filter(c => c.employeeId === emp.employeeId);
      const stocks = stockRequests.filter(s => s.employeeId === emp.employeeId);
      return {
        employeeId: emp.employeeId,
        employeeName: emp.name,
        area: emp.assignedArea,
        totalCalls: calls.length,
        vipCalls: calls.filter(c => c.doctorType === 'VIP').length,
        specialistCalls: calls.filter(c => c.doctorType === 'Specialist').length,
        regularCalls: calls.filter(c => c.doctorType === 'Regular').length,
        stockRequests: stocks.length,
        approvedStocks: stocks.filter(s => s.status === 'owner_approved' || s.status === 'mr_approved').length,
      };
    });

    // Per-MR stats
    const mrStats = mrs.map(mr => {
      const mrEmps = employees.filter(e => e.mrId === mr.mrId);
      const mrCalls = callReports.filter(c => c.mrId === mr.mrId);
      return {
        mrId: mr.mrId,
        mrName: mr.name,
        area: mr.area,
        employeeCount: mrEmps.length,
        totalCalls: mrCalls.length,
        employees: mrEmps.map(e => e.employeeId),
      };
    });

    // Area-wise stats
    const areaMap = {};
    callReports.forEach(c => {
      if (!areaMap[c.area]) areaMap[c.area] = { area: c.area, calls: 0, employees: new Set() };
      areaMap[c.area].calls++;
      areaMap[c.area].employees.add(c.employeeId);
    });
    const areaStats = Object.values(areaMap).map(a => ({ ...a, employees: a.employees.size }));

    res.json({ month: currentMonth, empCallStats, mrStats, areaStats, totalCalls: callReports.length, totalStockRequests: stockRequests.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/owner/employees/role/:employeeId  — promote/demote
router.put('/employees/role/:employeeId', admin, async (req, res) => {
  try {
    const { newRole, replacementMrId } = req.body;
    if (!['employee', 'mr'].includes(newRole)) {
      return res.status(400).json({ message: 'Role must be employee or mr' });
    }

    const emp = await Employee.findOne({ employeeId: req.params.employeeId }).select('-password');
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    if (emp.role === 'owner') return res.status(403).json({ message: 'Cannot change Owner role' });

    // ── PROMOTE: employee → mr ─────────────────────────────────────────
    if (newRole === 'mr') {
      // Check if MR record already exists for this email
      const existing = await MR.findOne({ email: emp.email });
      if (!existing) {
        const mr = new MR({
          mrId: emp.employeeId,   // reuse employeeId as mrId
          name: emp.name,
          email: emp.email,
          password: emp.password, // already hashed — skip pre-save by using direct update
          phone: emp.phone || '',
          area: emp.assignedArea || '',
          pincodes: emp.assignedPincodes || [],
          employeeIds: [],
          baseSalary: emp.baseSalary || 0,
        });
        // bypass bcrypt double-hash by using $set directly after save
        await MR.create({
          mrId: emp.employeeId,
          name: emp.name,
          email: emp.email,
          password: emp.password,
          phone: emp.phone || '',
          area: emp.assignedArea || '',
          pincodes: emp.assignedPincodes || [],
          employeeIds: [],
          baseSalary: emp.baseSalary || 0,
        });
        // override hashed-again password with original hash
        await MR.updateOne({ email: emp.email }, { password: emp.password });
      }
      // Update Employee role
      await Employee.updateOne({ employeeId: emp.employeeId }, { role: 'mr', mrId: '' });
      return res.json({ message: `${emp.name} promoted to MR`, employeeId: emp.employeeId, newRole: 'mr' });
    }

    // ── DEMOTE: mr → employee ──────────────────────────────────────────
    if (newRole === 'employee') {
      // Reassign employees under this MR
      const underlings = await Employee.find({ mrId: emp.employeeId });
      if (underlings.length > 0 && !replacementMrId) {
        return res.status(400).json({
          message: `This MR has ${underlings.length} assigned employee(s). Provide replacementMrId to reassign them.`,
          count: underlings.length,
          employees: underlings.map(u => ({ employeeId: u.employeeId, name: u.name })),
        });
      }
      if (replacementMrId) {
        await Employee.updateMany({ mrId: emp.employeeId }, { mrId: replacementMrId });
        // Also update replacement MR's employeeIds list
        const underlingIds = underlings.map(u => u.employeeId);
        await MR.updateOne({ mrId: replacementMrId }, { $addToSet: { employeeIds: { $each: underlingIds } } });
        // Remove from old MR's employeeIds
        await MR.updateOne({ mrId: emp.employeeId }, { $set: { employeeIds: [] } });
      }
      // Delete MR record
      await MR.deleteOne({ $or: [{ mrId: emp.employeeId }, { email: emp.email }] });
      // Update Employee role
      await Employee.updateOne({ employeeId: emp.employeeId }, { role: 'employee' });
      return res.json({ message: `${emp.name} converted to Employee`, employeeId: emp.employeeId, newRole: 'employee' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
