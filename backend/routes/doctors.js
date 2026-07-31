const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// GET /api/doctors — all employees/MR can view doctors
router.get('/', authMiddleware, async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.area) filter.area = req.query.area;
    if (req.query.pincode) filter.pincode = req.query.pincode;
    if (req.query.type) filter.type = req.query.type;
    // Smart search: match name or hospital by keyword
    if (req.query.search) {
      const re = new RegExp(req.query.search, 'i');
      filter.$or = [{ name: re }, { hospital: re }];
    }
    const doctors = await Doctor.find(filter).sort({ name: 1 });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/doctors/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/doctors — MR or Owner can add doctors
router.post('/', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token' });
  const jwt = require('jsonwebtoken');
  let decoded;
  try { decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret'); }
  catch { return res.status(401).json({ message: 'Invalid token' }); }
  if (!decoded.isOwner && decoded.role !== 'mr') return res.status(403).json({ message: 'MR or Owner access required' });

  try {
    const { name, hospital, area, pincode, type, phone, latitude, longitude } = req.body;
    if (!name || !hospital || !area || !pincode)
      return res.status(400).json({ message: 'Name, hospital, area, and pincode are required' });
    const doctor = await Doctor.create({ name, hospital, area, pincode, type, phone, latitude, longitude });
    res.status(201).json(doctor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/doctors/:id — MR or Owner can edit doctors
router.put('/:id', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token' });
  const jwt = require('jsonwebtoken');
  let decoded;
  try { decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret'); }
  catch { return res.status(401).json({ message: 'Invalid token' }); }
  if (!decoded.isOwner && decoded.role !== 'mr') return res.status(403).json({ message: 'MR or Owner access required' });

  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/doctors/:id — MR or Owner (soft delete)
router.delete('/:id', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token' });
  const jwt = require('jsonwebtoken');
  let decoded;
  try { decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret'); }
  catch { return res.status(401).json({ message: 'Invalid token' }); }
  if (!decoded.isOwner && decoded.role !== 'mr') return res.status(403).json({ message: 'MR or Owner access required' });

  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json({ message: 'Doctor deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
