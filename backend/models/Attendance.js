const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  date: { type: String, required: true }, // "YYYY-MM-DD"
  month: { type: String, required: true }, // "YYYY-MM"
  checkedIn: { type: Boolean, default: false },
  checkInTime: { type: Date },
  photo: { type: String, default: '' }, // base64 or URL
  overriddenByOwner: { type: Boolean, default: false },
}, { timestamps: true });

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
