const express = require('express');
const router = express.Router();
const Issue = require('../models/Issue');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// POST /api/issues (employee raises issue)
router.post('/', auth, async (req, res) => {
  try {
    const { month, title, message } = req.body;
    const emp = await Employee.findOne({ employeeId: req.user.employeeId });
    const issue = new Issue({
      employeeId: req.user.employeeId,
      employeeName: emp?.name || req.user.employeeId,
      month, title,
      messages: [{ sender: 'employee', senderName: emp?.name || req.user.employeeId, text: message }]
    });
    await issue.save();
    res.status(201).json(issue);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/issues/my (employee)
router.get('/my', auth, async (req, res) => {
  try {
    const issues = await Issue.find({ employeeId: req.user.employeeId }).sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/issues/all (owner)
router.get('/all', admin, async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const issues = await Issue.find(query).sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/issues/:id/reply
router.post('/:id/reply', async (req, res) => {
  try {
    const { text, attachments } = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const isOwner = decoded.isOwner;

    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    let senderName = 'Owner';
    if (!isOwner) {
      const emp = await Employee.findOne({ employeeId: decoded.employeeId });
      senderName = emp?.name || decoded.employeeId;
    }

    issue.messages.push({ sender: isOwner ? 'owner' : 'employee', senderName, text: text || '', attachments: attachments || [] });
    if (isOwner) issue.status = 'replied';
    await issue.save();
    res.json(issue);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/issues/:id/status (owner)
router.put('/:id/status', admin, async (req, res) => {
  try {
    const { status } = req.body;
    const issue = await Issue.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    res.json(issue);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
