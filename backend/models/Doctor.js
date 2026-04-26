const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  hospital: { type: String, required: true },
  area: { type: String, required: true },
  pincode: { type: String, required: true },
  type: { type: String, enum: ['VIP', 'Specialist', 'Regular'], default: 'Regular' },
  phone: { type: String, default: '' },
  // GPS coordinates of hospital/clinic for radius validation
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);
