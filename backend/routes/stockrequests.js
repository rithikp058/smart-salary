const express = require('express');
const router = express.Router();
const StockRequest = require('../models/StockRequest');
const Employee = require('../models/Employee');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const mrMiddleware = require('../middleware/mr');

// POST /api/stockrequests — employee raises a stock request
router.post('/', authMiddleware, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const { callReportId, doctorName, hospitalName, productName, quantity, photo, destination } = req.body;
    if (!doctorName || !hospitalName || !productName || !quantity || !photo)
      return res.status(400).json({ message: 'Doctor, hospital, product, quantity, and photo are required' });

    const today = new Date();
    const date = today.toISOString().slice(0, 10);
    const month = today.toISOString().slice(0, 7);

    const request = await StockRequest.create({
      employeeId: employee.employeeId,
      employeeName: employee.name,
      mrId: employee.mrId || '',
      callReportId: callReportId || null,
      doctorName,
      hospitalName,
      productName,
      quantity,
      month,
      date,
      photo,
      destination: destination || 'Medical Shop',
    });

    // Notify MR if assigned
    if (employee.mrId) {
      const mr = await Employee.findOne({ employeeId: employee.mrId });
      if (mr) {
        mr.notifications.push({
          message: `📦 Stock request from ${employee.name} for ${productName} (${quantity} units) — needs approval`,
        });
        await mr.save();
      }
    }

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/stockrequests/my — employee's own requests
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id);
    const filter = { employeeId: employee.employeeId };
    if (req.query.month) filter.month = req.query.month;
    const requests = await StockRequest.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/stockrequests/team — MR views pending requests from their team
router.get('/team', mrMiddleware, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'mr') filter.mrId = req.user.employeeId;
    if (req.query.month) filter.month = req.query.month;
    if (req.query.status) filter.status = req.query.status;
    const requests = await StockRequest.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/stockrequests/all — Owner views all requests
router.get('/all', adminMiddleware, async (req, res) => {
  try {
    const filter = {};
    if (req.query.month) filter.month = req.query.month;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    const requests = await StockRequest.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/stockrequests/:id/approve — MR or Owner approves
router.put('/:id/approve', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token' });
  const jwt = require('jsonwebtoken');
  let decoded;
  try { decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret'); }
  catch { return res.status(401).json({ message: 'Invalid token' }); }

  const isMR = decoded.role === 'mr';
  const isOwner = !!decoded.isOwner;
  if (!isMR && !isOwner) return res.status(403).json({ message: 'MR or Owner access required' });

  try {
    const request = await StockRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const newStatus = isOwner ? 'approved_owner' : 'approved_mr';
    request.status = newStatus;
    request.approvedBy = isOwner ? 'owner' : 'mr';
    request.approvedAt = new Date();
    request.stockMoved = true;
    if (req.body.destination) request.destination = req.body.destination;
    await request.save();

    // Notify employee
    const employee = await Employee.findOne({ employeeId: request.employeeId });
    if (employee) {
      employee.notifications.push({
        message: `✅ Stock request for ${request.productName} (${request.quantity} units) approved by ${isOwner ? 'Owner' : 'MR'}`,
      });
      await employee.save();
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/stockrequests/:id/reject — MR or Owner rejects
router.put('/:id/reject', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token' });
  const jwt = require('jsonwebtoken');
  let decoded;
  try { decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret'); }
  catch { return res.status(401).json({ message: 'Invalid token' }); }

  const isMR = decoded.role === 'mr';
  const isOwner = !!decoded.isOwner;
  if (!isMR && !isOwner) return res.status(403).json({ message: 'MR or Owner access required' });

  try {
    const request = await StockRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason: req.body.reason || '' },
      { new: true }
    );
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const employee = await Employee.findOne({ employeeId: request.employeeId });
    if (employee) {
      employee.notifications.push({
        message: `❌ Stock request for ${request.productName} rejected. Reason: ${req.body.reason || 'N/A'}`,
      });
      await employee.save();
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/stockrequests/:id/return — MR marks stock as returned/damaged
router.put('/:id/return', mrMiddleware, async (req, res) => {
  try {
    const { returnedQuantity, returnReason, damagedQuantity, damageNote } = req.body;
    const request = await StockRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (returnedQuantity > 0) {
      request.returned = true;
      request.returnedQuantity = returnedQuantity;
      request.returnReason = returnReason || '';
      request.returnedAt = new Date();
      request.returnedByMR = req.user.employeeId;
    }
    if (damagedQuantity > 0) {
      request.damaged = true;
      request.damagedQuantity = damagedQuantity;
      request.damageNote = damageNote || '';
    }
    await request.save();

    // Notify employee about incentive impact
    const employee = await Employee.findOne({ employeeId: request.employeeId });
    if (employee) {
      employee.notifications.push({
        message: `⚠️ Stock return recorded for ${request.productName}: ${returnedQuantity || 0} returned, ${damagedQuantity || 0} damaged. This may affect your incentive.`,
      });
      await employee.save();
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/stockrequests/incentive-summary/:employeeId/:month — delayed incentive calculation
router.get('/incentive-summary/:employeeId/:month', adminMiddleware, async (req, res) => {
  try {
    const { employeeId, month } = req.params;
    const requests = await StockRequest.find({
      employeeId,
      month,
      status: { $in: ['approved_mr', 'approved_owner'] },
    });

    const totalApproved = requests.reduce((sum, r) => sum + r.quantity, 0);
    const totalReturned = requests.reduce((sum, r) => sum + (r.returnedQuantity || 0), 0);
    const totalDamaged = requests.reduce((sum, r) => sum + (r.damagedQuantity || 0), 0);
    const netSold = totalApproved - totalReturned - totalDamaged;

    res.json({
      employeeId, month,
      totalApproved, totalReturned, totalDamaged, netSold,
      requests: requests.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
