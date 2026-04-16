const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  dates: [{ type: String, required: true }], // ["YYYY-MM-DD", ...]
  month: { type: String, required: true },   // "YYYY-MM"
  leaveType: { type: String, enum: ['paid', 'unpaid'], required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  ownerNote: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Leave', leaveSchema);
