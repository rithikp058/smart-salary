const express = require('express');
const router = express.Router();
const CallReport = require('../models/CallReport');
const Employee = require('../models/Employee');
const Doctor = require('../models/Doctor');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const mrMiddleware = require('../middleware/mr');

// Haversine formula — distance in meters between two GPS points
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// POST /api/callreports — employee submits a call report
router.post('/', authMiddleware, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const {
      doctorId, doctorName, hospitalName, doctorType,
      latitude, longitude, area, pincode,
      photo, notes,
    } = req.body;

    if (!doctorName || !hospitalName || !photo)
      return res.status(400).json({ message: 'Doctor name, hospital, and photo are required' });
    if (latitude == null || longitude == null)
      return res.status(400).json({ message: 'GPS location is required' });

    // Area/pincode restriction — employee must be in assigned area
    if (employee.pincodes && employee.pincodes.length > 0) {
      if (pincode && !employee.pincodes.includes(pincode)) {
        return res.status(403).json({
          message: `You are outside your assigned area. Allowed pincodes: ${employee.pincodes.join(', ')}`,
        });
      }
    }

    // GPS radius validation against doctor's registered location (if available)
    let locationValid = true;
    let distanceFromHospital = null;

    if (doctorId) {
      const doctor = await Doctor.findById(doctorId);
      if (doctor && doctor.latitude && doctor.longitude) {
        distanceFromHospital = Math.round(haversineDistance(latitude, longitude, doctor.latitude, doctor.longitude));
        locationValid = distanceFromHospital <= 10; // STRICT: 10 meters
        if (!locationValid) {
          return res.status(403).json({
            message: `You must be near the doctor location to report. You are ${distanceFromHospital}m away — must be within 10m.`,
            distanceFromHospital,
          });
        }
      }
    }

    const today = new Date();
    const date = today.toISOString().slice(0, 10);
    const month = today.toISOString().slice(0, 7);

    // Duplicate check: same employee, same doctor name, same date
    const duplicate = await CallReport.findOne({
      employeeId: employee.employeeId,
      date,
      doctorName: { $regex: new RegExp(`^${doctorName.trim()}$`, 'i') },
    });
    if (duplicate) {
      return res.status(409).json({
        message: `You have already reported a visit to Dr. ${doctorName} today. Duplicate visits are not allowed.`,
      });
    }

    const report = await CallReport.create({
      employeeId: employee.employeeId,
      employeeName: employee.name,
      mrId: employee.mrId || '',
      doctorId: doctorId || null,
      doctorName,
      hospitalName,
      doctorType: doctorType || 'Regular',
      date, month,
      visitTime: today,
      latitude, longitude,
      area: area || employee.area || '',
      pincode: pincode || '',
      locationValid,
      distanceFromHospital,
      photo,
      notes: notes || '',
    });

    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/callreports/my — employee's own reports
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id);
    const filter = { employeeId: employee.employeeId };
    if (req.query.month) filter.month = req.query.month;
    if (req.query.date) filter.date = req.query.date;
    const reports = await CallReport.find(filter).sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/callreports/team — MR views their team's reports
router.get('/team', mrMiddleware, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'mr') filter.mrId = req.user.employeeId;
    if (req.query.month) filter.month = req.query.month;
    if (req.query.date) filter.date = req.query.date;
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    const reports = await CallReport.find(filter).sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/callreports/all — Owner views all reports
router.get('/all', adminMiddleware, async (req, res) => {
  try {
    const filter = {};
    if (req.query.month) filter.month = req.query.month;
    if (req.query.date) filter.date = req.query.date;
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    const reports = await CallReport.find(filter).sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/callreports/:id/verify — MR verifies a call report
router.put('/:id/verify', mrMiddleware, async (req, res) => {
  try {
    const { verified, mrNote } = req.body;
    const report = await CallReport.findByIdAndUpdate(
      req.params.id,
      { verifiedByMR: verified, mrNote: mrNote || '' },
      { new: true }
    );
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
