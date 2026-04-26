const mongoose = require('mongoose');

const callReportSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  mrId: { type: String, default: '' }, // MR who manages this employee

  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
  doctorName: { type: String, required: true },
  hospitalName: { type: String, required: true },
  doctorType: { type: String, enum: ['VIP', 'Specialist', 'Regular'], default: 'Regular' },

  date: { type: String, required: true },   // "YYYY-MM-DD"
  month: { type: String, required: true },  // "YYYY-MM"
  visitTime: { type: Date, default: Date.now },

  // GPS location at time of report
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  area: { type: String, default: '' },
  pincode: { type: String, default: '' },

  // Validation result
  locationValid: { type: Boolean, default: false },
  distanceFromHospital: { type: Number, default: null }, // meters

  // Photo proof (mandatory)
  photo: { type: String, required: true }, // base64 or URL

  notes: { type: String, default: '' },

  // MR verification
  verifiedByMR: { type: Boolean, default: false },
  mrNote: { type: String, default: '' },
}, { timestamps: true });

callReportSchema.index({ employeeId: 1, date: 1 });

module.exports = mongoose.model('CallReport', callReportSchema);
