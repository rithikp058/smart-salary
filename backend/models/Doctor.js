const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  hospital: { type: String, required: true },
  area: { type: String, required: true },
  pincode: { type: String, default: '' },
  type: { type: String, enum: ['VIP', 'Specialist', 'Regular'], default: 'Regular' },
  // Coordinates stored internally — never exposed as editable fields
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  // Full address from location search
  locationAddress: { type: String, default: '' },
  // Employees this doctor is assigned to
  assignedEmployeeIds: [{ type: String }],
  addedBy: { type: String, default: '' }, // employeeId or mrId or 'owner'
  addedByMrId: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);
