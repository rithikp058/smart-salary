const mongoose = require('mongoose');

// One record per employee per month — set by their MR
const doctorTargetSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  mrId: { type: String, required: true },       // MR who set this target
  month: { type: String, required: true },       // "YYYY-MM"
  target: { type: Number, required: true, min: 1 }, // number of doctors to visit
}, { timestamps: true });

// One target per employee per month
doctorTargetSchema.index({ employeeId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('DoctorTarget', doctorTargetSchema);
