const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Issue = require('../models/Issue');
const Employee = require('../models/Employee');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// POST /api/issues — employee opens a new thread
router.post('/', authMiddleware, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id);
    const { month, title, message } = req.body;
    if (!month || !message) return res.status(400).json({ message: 'Month and message required' });

    const issue = await Issue.create({
      employeeId: employee.employeeId,
      employeeName: employee.name,
      month,
      title: title || `Issue for ${month}`,
      messages: [{ sender: 'employee', senderName: employee.name, text: message, attachments: [] }],
    });

    employee.notifications.push({ message: `📝 Issue "${issue.title}" submitted for ${month}.` });
    await employee.save();
    res.status(201).json(issue);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/issues/:id/reply — employee or owner adds a message
router.post('/:id/reply', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token' });

  let decoded;
  try { decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'fallback_secret'); }
  catch { return res.status(401).json({ message: 'Invalid token' }); }

  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    const { text, attachments } = req.body;
    if (!text && (!attachments?.length)) return res.status(400).json({ message: 'Message or attachment required' });

    const isOwner = !!decoded.isOwner;
    let senderName = 'Owner';
    if (!isOwner) {
      const emp = await Employee.findById(decoded.id);
      senderName = emp ? emp.name : 'Employee';
    }

    issue.messages.push({ sender: isOwner ? 'owner' : 'employee', senderName, text: text || '', attachments: attachments || [] });
    issue.status = isOwner ? 'replied' : (issue.status === 'replied' ? 'pending' : issue.status);
    await issue.save();

    if (isOwner) {
      const emp = await Employee.findOne({ employeeId: issue.employeeId });
      if (emp) { emp.notifications.push({ message: `💬 Owner replied to your issue "${issue.title}"` }); await emp.save(); }
    }

    res.json(issue);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/issues/:id/status — owner changes status
router.put('/:id/status', adminMiddleware, async (req, res) => {
  try {
    const issue = await Issue.findByIdAndUpdate(req.params.id, { status: req.body.status || 'resolved' }, { new: true });
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    res.json(issue);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/issues/my
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id);
    const issues = await Issue.find({ employeeId: employee.employeeId }).sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/issues/all — owner
router.get('/all', adminMiddleware, async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const issues = await Issue.find(filter).sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/issues/:id
router.get('/:id', async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    res.json(issue);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
