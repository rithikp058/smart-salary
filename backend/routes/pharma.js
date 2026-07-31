/**
 * Pharma Field Management Routes
 * Handles: Doctors, Call Reports, Stock Requests, MR operations
 */
const express = require('express');
const router = express.Router();
const https = require('https');
const Doctor = require('../models/Doctor');
const CallReport = require('../models/CallReport');
const StockRequest = require('../models/StockRequest');
const Employee = require('../models/Employee');
const MR = require('../models/MR');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// ── Middleware: MR or Owner ────────────────────────────────────────────────
function mrOrAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    if (decoded.isOwner || decoded.isMR) { req.user = decoded; return next(); }
    return res.status(403).json({ message: 'MR or Owner access required' });
  } catch { return res.status(401).json({ message: 'Invalid token' }); }
}

// ── LOCATION SEARCH (Nominatim / OpenStreetMap) ───────────────────────────
// GET /api/pharma/location-search?q=Yashoda+Hospital&countrycodes=in
// Proxied through backend to avoid CORS and set a proper User-Agent
router.get('/location-search', auth, (req, res) => {
  const q = req.query.q;
  if (!q || String(q).trim().length < 2) return res.json([]);

  const query = encodeURIComponent(String(q).trim());
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=7&countrycodes=in`;

  const options = {
    headers: {
      // Nominatim requires a descriptive User-Agent
      'User-Agent': 'SmartSalaryProcessor/1.0 (pharma-field-app)',
      'Accept': 'application/json',
    },
  };

  https.get(url, options, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => { data += chunk; });
    apiRes.on('end', () => {
      try {
        const results = JSON.parse(data);
        // Normalise to a clean shape
        const mapped = results.map(r => ({
          placeId: r.place_id,
          displayName: r.display_name,
          name: r.name || r.display_name.split(',')[0],
          area: r.address?.suburb || r.address?.village || r.address?.city_district || r.address?.city || '',
          city: r.address?.city || r.address?.state_district || '',
          pincode: r.address?.postcode || '',
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        }));
        res.json(mapped);
      } catch {
        res.json([]);
      }
    });
  }).on('error', () => res.json([]));
});

// ── DOCTOR DATABASE ────────────────────────────────────────────────────────

// GET /api/pharma/doctors
router.get('/doctors', auth, async (req, res) => {
  try {
    const { area, pincode, type, employeeId } = req.query;
    const query = {};
    if (area) query.area = { $regex: area, $options: 'i' };
    if (pincode) query.pincode = pincode;
    if (type) query.type = type;
    // If employeeId supplied, return only doctors assigned to that employee
    if (employeeId) query.assignedEmployeeIds = employeeId;
    const doctors = await Doctor.find(query).sort({ name: 1 });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/pharma/doctors (MR or owner adds doctor — no manual lat/lng from UI)
router.post('/doctors', auth, async (req, res) => {
  try {
    const { name, hospital, area, pincode, type, lat, lng, locationAddress, assignedEmployeeIds } = req.body;
    if (!name || !hospital || !area) {
      return res.status(400).json({ message: 'Name, hospital and area are required' });
    }
    const doctor = new Doctor({
      name, hospital, area,
      pincode: pincode || '',
      type: type || 'Regular',
      lat: lat || null,
      lng: lng || null,
      locationAddress: locationAddress || '',
      assignedEmployeeIds: assignedEmployeeIds || [],
      addedBy: req.user.employeeId || req.user.mrId || 'owner',
      addedByMrId: req.user.mrId || '',
    });
    await doctor.save();
    res.status(201).json(doctor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/pharma/doctors/:id (owner or MR)
router.put('/doctors/:id', auth, async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/pharma/doctors/:id (owner)
router.delete('/doctors/:id', admin, async (req, res) => {
  try {
    await Doctor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Doctor deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── CALL REPORTS ───────────────────────────────────────────────────────────

// POST /api/pharma/call-reports (employee submits call report)
router.post('/call-reports', auth, async (req, res) => {
  try {
    const {
      doctorId, doctorName, hospitalName, doctorType,
      area, pincode, lat, lng, locationAddress,
      photo, visitDate, notes, locationValid, distanceFromHospital
    } = req.body;

    if (!doctorName || !hospitalName || !photo || !lat || !lng) {
      return res.status(400).json({ message: 'Doctor name, hospital, photo and location are required' });
    }
    if (!photo) return res.status(400).json({ message: 'Photo proof is mandatory' });

    const emp = await Employee.findOne({ employeeId: req.user.employeeId });
    if (!emp) return res.status(404).json({ message: 'Employee not found' });

    // Area/pincode restriction check
    if (emp.assignedPincodes && emp.assignedPincodes.length > 0) {
      if (pincode && !emp.assignedPincodes.includes(pincode)) {
        return res.status(403).json({
          message: `⚠️ Location restricted. You can only report calls from your assigned pincodes: ${emp.assignedPincodes.join(', ')}`
        });
      }
    }

    // ── STRICT GPS VALIDATION (server-side anti-fraud) ──────────────────
    // If the selected doctor has stored coordinates, enforce 10m radius
    if (doctorId) {
      const doctor = await require('../models/Doctor').findById(doctorId).select('lat lng name hospital');
      if (doctor && doctor.lat && doctor.lng && lat && lng) {
        const R = 6371000;
        const dLat = ((doctor.lat - lat) * Math.PI) / 180;
        const dLng = ((doctor.lng - lng) * Math.PI) / 180;
        const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
          Math.cos((lat*Math.PI)/180)*Math.cos((doctor.lat*Math.PI)/180)*
          Math.sin(dLng/2)*Math.sin(dLng/2);
        const distance = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
        if (distance > 10) {
          return res.status(403).json({
            message: `⚠️ You must be within 10 meters of ${doctor.hospital} to submit this report. You are currently ${distance}m away.`
          });
        }
      }
    }

    // ── DUPLICATE PREVENTION: same doctor, same day ──────────────────────
    if (doctorId) {
      const existing = await CallReport.findOne({
        employeeId: req.user.employeeId,
        doctorId,
        visitDate: visitDate || new Date().toISOString().slice(0, 10),
      });
      if (existing) {
        return res.status(409).json({
          message: `⚠️ You already submitted a call report for this doctor today. Duplicate reports are not allowed.`
        });
      }
    }

    const today = visitDate || new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);

    const report = new CallReport({
      employeeId: req.user.employeeId,
      employeeName: emp.name,
      mrId: emp.mrId || '',
      doctorId: doctorId || '',
      doctorName, hospitalName,
      doctorType: doctorType || 'Regular',
      area: area || emp.assignedArea || '',
      pincode: pincode || '',
      lat, lng,
      locationAddress: locationAddress || '',
      photo, visitDate: today, month,
      notes: notes || '',
      locationValid: locationValid !== undefined ? locationValid : true,
      distanceFromHospital: distanceFromHospital || 0,
    });
    await report.save();
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/pharma/call-reports/my (employee)
router.get('/call-reports/my', auth, async (req, res) => {
  try {
    const { month, date } = req.query;
    const query = { employeeId: req.user.employeeId };
    if (month) query.month = month;
    if (date) query.visitDate = date;
    const reports = await CallReport.find(query).sort({ visitTime: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/pharma/call-reports/all (owner/MR)
router.get('/call-reports/all', mrOrAdmin, async (req, res) => {
  try {
    const { month, employeeId, mrId } = req.query;
    const query = {};
    if (month) query.month = month;
    if (employeeId) query.employeeId = employeeId;
    if (mrId) query.mrId = mrId;
    // If MR, only show their employees' reports
    if (req.user.isMR && !req.user.isOwner) {
      const mr = await MR.findOne({ mrId: req.user.mrId });
      if (mr) query.mrId = mr.mrId;
    }
    const reports = await CallReport.find(query).sort({ visitTime: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── STOCK REQUESTS ─────────────────────────────────────────────────────────

// POST /api/pharma/stock-requests (employee raises stock request)
router.post('/stock-requests', auth, async (req, res) => {
  try {
    const { doctorId, doctorName, hospitalName, productName, quantity, photo, notes } = req.body;
    if (!doctorName || !hospitalName || !productName || !quantity || !photo) {
      return res.status(400).json({ message: 'Doctor, hospital, product, quantity and photo are required' });
    }

    const emp = await Employee.findOne({ employeeId: req.user.employeeId });
    if (!emp) return res.status(404).json({ message: 'Employee not found' });

    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);

    const request = new StockRequest({
      employeeId: req.user.employeeId,
      employeeName: emp.name,
      mrId: emp.mrId || '',
      doctorId: doctorId || '',
      doctorName, hospitalName, productName,
      quantity: Number(quantity),
      photo, notes: notes || '',
      month, requestDate: today,
    });
    await request.save();
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/pharma/stock-requests/my (employee)
router.get('/stock-requests/my', auth, async (req, res) => {
  try {
    const { month } = req.query;
    const query = { employeeId: req.user.employeeId };
    if (month) query.month = month;
    const requests = await StockRequest.find(query).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/pharma/stock-requests/all (owner/MR)
router.get('/stock-requests/all', mrOrAdmin, async (req, res) => {
  try {
    const { month, status, employeeId } = req.query;
    const query = {};
    if (month) query.month = month;
    if (status) query.status = status;
    if (employeeId) query.employeeId = employeeId;
    if (req.user.isMR && !req.user.isOwner) {
      query.mrId = req.user.mrId;
    }
    const requests = await StockRequest.find(query).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/pharma/stock-requests/:id/approve (MR or Owner approves)
router.put('/stock-requests/:id/approve', mrOrAdmin, async (req, res) => {
  try {
    const { approvalNote, movementType, destination } = req.body;
    const isOwner = req.user.isOwner;
    const status = isOwner ? 'owner_approved' : 'mr_approved';

    const request = await StockRequest.findByIdAndUpdate(
      req.params.id,
      {
        status,
        approvedBy: isOwner ? 'owner' : 'mr',
        approvedById: isOwner ? 'owner' : req.user.mrId,
        approvalNote: approvalNote || '',
        approvedAt: new Date(),
        movementType: movementType || 'godown_to_shop',
        destination: destination || '',
      },
      { new: true }
    );
    if (!request) return res.status(404).json({ message: 'Stock request not found' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/pharma/stock-requests/:id/reject (MR or Owner rejects)
router.put('/stock-requests/:id/reject', mrOrAdmin, async (req, res) => {
  try {
    const { approvalNote } = req.body;
    const request = await StockRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', approvalNote: approvalNote || '', approvedAt: new Date() },
      { new: true }
    );
    if (!request) return res.status(404).json({ message: 'Stock request not found' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/pharma/stock-requests/:id/return (MR marks return/damage)
router.put('/stock-requests/:id/return', mrOrAdmin, async (req, res) => {
  try {
    const { returnStatus, returnQuantity, returnNote } = req.body;
    const request = await StockRequest.findByIdAndUpdate(
      req.params.id,
      {
        returnStatus: returnStatus || 'returned',
        returnQuantity: returnQuantity || 0,
        returnNote: returnNote || '',
        returnedAt: new Date(),
        returnedBy: req.user.mrId || 'owner',
      },
      { new: true }
    );
    if (!request) return res.status(404).json({ message: 'Stock request not found' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── MR DASHBOARD DATA ──────────────────────────────────────────────────────

// GET /api/pharma/mr/dashboard (MR gets their employees' data)
router.get('/mr/dashboard', mrOrAdmin, async (req, res) => {
  try {
    if (!req.user.isMR) return res.status(403).json({ message: 'MR access required' });
    const mr = await MR.findOne({ mrId: req.user.mrId }).select('-password');
    if (!mr) return res.status(404).json({ message: 'MR not found' });

    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const employees = await Employee.find({ mrId: mr.mrId }).select('-password');
    const empIds = employees.map(e => e.employeeId);

    const [callReports, stockRequests] = await Promise.all([
      CallReport.find({ employeeId: { $in: empIds }, month }),
      StockRequest.find({ employeeId: { $in: empIds }, month }),
    ]);

    const empStats = employees.map(emp => {
      const calls = callReports.filter(c => c.employeeId === emp.employeeId);
      const stocks = stockRequests.filter(s => s.employeeId === emp.employeeId);
      return {
        employeeId: emp.employeeId,
        employeeName: emp.name,
        area: emp.assignedArea,
        pincodes: emp.assignedPincodes,
        targetCalls: emp.targetCalls || 3,
        totalCalls: calls.length,
        callsByType: {
          VIP: calls.filter(c => c.doctorType === 'VIP').length,
          Specialist: calls.filter(c => c.doctorType === 'Specialist').length,
          Regular: calls.filter(c => c.doctorType === 'Regular').length,
        },
        stockRequests: stocks.length,
        pendingStocks: stocks.filter(s => s.status === 'pending').length,
        recentCalls: calls.slice(0, 10),
      };
    });

    res.json({ mr, month, employees: empStats, totalCalls: callReports.length, pendingStocks: stockRequests.filter(s => s.status === 'pending').length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/pharma/employees/:employeeId/target (MR sets daily call target)
router.put('/employees/:employeeId/target', mrOrAdmin, async (req, res) => {
  try {
    const { targetCalls } = req.body;
    if (!targetCalls || targetCalls < 1) {
      return res.status(400).json({ message: 'Target must be at least 1' });
    }
    // MR can only update their own employees
    if (req.user.isMR && !req.user.isOwner) {
      const emp = await Employee.findOne({ employeeId: req.params.employeeId });
      if (!emp || emp.mrId !== req.user.mrId) {
        return res.status(403).json({ message: 'You can only set targets for your assigned employees' });
      }
    }
    const updated = await Employee.findOneAndUpdate(
      { employeeId: req.params.employeeId },
      { targetCalls: Number(targetCalls) },
      { new: true }
    ).select('-password');
    if (!updated) return res.status(404).json({ message: 'Employee not found' });
    res.json({ message: 'Target updated', employeeId: updated.employeeId, targetCalls: updated.targetCalls });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
