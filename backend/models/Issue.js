const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: String, enum: ['employee', 'owner'], required: true },
  senderName: { type: String, required: true },
  text: { type: String, default: '' },
  attachments: [{ type: String }], // base64 or URLs
}, { timestamps: true });

const issueSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  month: { type: String, required: true },
  title: { type: String, required: true },
  status: { type: String, enum: ['pending', 'replied', 'resolved'], default: 'pending' },
  messages: [messageSchema],
}, { timestamps: true });

module.exports = mongoose.model('Issue', issueSchema);
