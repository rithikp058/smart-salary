const mongoose = require('mongoose');

const callReportSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  mrId: { type: String, default: '' }, // MR who manages this employee
  doctorId: { type: String, required: true },
  doctorName: { type: String, required: true },
  hospitalName: { type: String, required: true },
  doctorType: { type: String, enum: ['VIP', 'Specialist', 'Regular'], default: 'Regular' },
  area: { type: String, required: true },
  pincode: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  locationAddress: { type: String, default: '' },
  photo: { type: String, required: true }, // base64 proof photo
  visitDate: { type: String, required: true }, // YYYY-MM-DD
  visitTime: { type: Date, default: Date.now },
  month: { type: String, required: true }, // YYYY-MM
  notes: { type: String, default: '' },
  locationValid: { type: Boolean, default: false }, // GPS radius check passed
  distanceFromHospital: { type: Number, default: 0 }, // meters
}, { timestamps: true });

module.exports = mongoose.model('CallReport', callReportSchema);
