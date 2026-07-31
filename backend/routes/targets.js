const express = require('express');
const router = express.Router();
const DoctorTarget = require('../models/DoctorTarget');
const CallReport = require('../models/CallReport');
const Employee = require('../models/Employee');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const mrMiddleware = require('../middleware/mr');

/**
 * Count valid, unique doctor visits for an employee in a month.
 * Rules:
 *  - locationValid must be true (GPS validated)
 *  - photo must exist
 *  - No duplicate: same doctorName + same date counts as 1 visit
 */
async function countValidVisits(employeeId, month) {
  const reports = await CallReport.find({
    employeeId,
    month,
    locationValid: true,
    photo: { $exists: true, $ne: '' },
  });

  // Deduplicate: same doctorName (case-insensitive) on same date = 1 visit
  const seen = new Set();
  let count = 0;
  for (const r of reports) {
    const key = `${r.doctorName.toLowerCase().trim()}|${r.date}`;
    if (!seen.has(key)) {
      seen.add(key);
      count++;
    }
  }
  return count;
}

// ── Employee: get own progress ────────────────────────────────────────────
// GET /api/targets/my-progress?month=YYYY-MM
router.get('/my-progress', authMiddleware, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const month = req.query.month || new Date().toISOString().slice(0, 7);

    const [targetDoc, visited] = await Promise.all([
      DoctorTarget.findOne({ employeeId: employee.employeeId, month }),
      countValidVisits(employee.employeeId, month),
    ]);

    res.json({
      employeeId: employee.employeeId,
      employeeName: employee.name,
      month,
      target: targetDoc?.target || 0,
      visited,
      percentage: targetDoc?.target ? Math.min(100, Math.round((visited / targetDoc.target) * 100)) : 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── MR: set or update target for an employee ─────────────────────────────
// POST /api/targets  { employeeId, month, target }
router.post('/', mrMiddleware, async (req, res) => {
  try {
    const { employeeId, month, target } = req.body;
    if (!employeeId || !month || !target)
      return res.status(400).json({ message: 'employeeId, month, and target are required' });

    const employee = await Employee.findOne({ employeeId });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const mrId = req.user.isOwner ? (employee.mrId || 'owner') : req.user.employeeId;

    const doc = await DoctorTarget.findOneAndUpdate(
      { employeeId, month },
      { employeeId, employeeName: employee.name, mrId, month, target: Number(target) },
      { upsert: true, new: true }
    );

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── MR: get team progress for a month ────────────────────────────────────
// GET /api/targets/team?month=YYYY-MM
router.get('/team', mrMiddleware, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const mrId = req.user.isOwner ? req.query.mrId : req.user.employeeId;

    // Get all employees under this MR
    const filter = mrId ? { mrId } : {};
    const employees = await Employee.find({ ...filter, role: 'employee' }).select('employeeId name area');

    // Get all targets for this month
    const employeeIds = employees.map(e => e.employeeId);
    const targets = await DoctorTarget.find({ employeeId: { $in: employeeIds }, month });
    const targetMap = Object.fromEntries(targets.map(t => [t.employeeId, t.target]));

    // Count valid visits for each employee in parallel
    const results = await Promise.all(
      employees.map(async (emp) => {
        const visited = await countValidVisits(emp.employeeId, month);
        const target = targetMap[emp.employeeId] || 0;
        return {
          employeeId: emp.employeeId,
          employeeName: emp.name,
          area: emp.area || '',
          month,
          target,
          visited,
          percentage: target ? Math.min(100, Math.round((visited / target) * 100)) : 0,
        };
      })
    );

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Owner: get all employees' progress ───────────────────────────────────
// GET /api/targets/all?month=YYYY-MM&mrId=xxx&area=xxx
router.get('/all', adminMiddleware, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    const empFilter = { role: 'employee' };
    if (req.query.mrId) empFilter.mrId = req.query.mrId;
    if (req.query.area) empFilter.area = req.query.area;

    const employees = await Employee.find(empFilter).select('employeeId name area mrId');
    const employeeIds = employees.map(e => e.employeeId);
    const targets = await DoctorTarget.find({ employeeId: { $in: employeeIds }, month });
    const targetMap = Object.fromEntries(targets.map(t => [t.employeeId, t.target]));

    const results = await Promise.all(
      employees.map(async (emp) => {
        const visited = await countValidVisits(emp.employeeId, month);
        const target = targetMap[emp.employeeId] || 0;
        return {
          employeeId: emp.employeeId,
          employeeName: emp.name,
          area: emp.area || '',
          mrId: emp.mrId || '',
          month,
          target,
          visited,
          percentage: target ? Math.min(100, Math.round((visited / target) * 100)) : 0,
        };
      })
    );

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Get targets list for a month (MR or Owner) ───────────────────────────
// GET /api/targets?month=YYYY-MM
router.get('/', mrMiddleware, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const filter = { month };
    if (!req.user.isOwner) filter.mrId = req.user.employeeId;
    const targets = await DoctorTarget.find(filter).sort({ employeeId: 1 });
    res.json(targets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
