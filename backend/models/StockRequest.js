const mongoose = require('mongoose');

const stockRequestSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  mrId: { type: String, default: '' },
  doctorId: { type: String, default: '' },
  doctorName: { type: String, required: true },
  hospitalName: { type: String, required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  photo: { type: String, required: true }, // proof photo
  notes: { type: String, default: '' },
  month: { type: String, required: true }, // YYYY-MM
  requestDate: { type: String, required: true }, // YYYY-MM-DD

  // Approval workflow
  status: {
    type: String,
    enum: ['pending', 'mr_approved', 'owner_approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: { type: String, default: '' }, // 'mr' or 'owner'
  approvedById: { type: String, default: '' },
  approvalNote: { type: String, default: '' },
  approvedAt: { type: Date },

  // Stock movement
  movementType: { type: String, enum: ['godown_to_shop', 'godown_to_hospital', ''], default: '' },
  destination: { type: String, default: '' }, // shop/hospital name

  // Return tracking
  returnStatus: { type: String, enum: ['none', 'returned', 'damaged', 'issue'], default: 'none' },
  returnQuantity: { type: Number, default: 0 },
  returnNote: { type: String, default: '' },
  returnedAt: { type: Date },
  returnedBy: { type: String, default: '' }, // mrId
}, { timestamps: true });

module.exports = mongoose.model('StockRequest', stockRequestSchema);
