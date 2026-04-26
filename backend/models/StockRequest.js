const mongoose = require('mongoose');

const stockRequestSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  mrId: { type: String, default: '' },

  // Linked call report
  callReportId: { type: mongoose.Schema.Types.ObjectId, ref: 'CallReport', default: null },

  doctorName: { type: String, required: true },
  hospitalName: { type: String, required: true },

  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  month: { type: String, required: true }, // "YYYY-MM"
  date: { type: String, required: true },  // "YYYY-MM-DD"

  // Photo proof of doctor accepting product
  photo: { type: String, required: true },

  // Approval workflow
  status: {
    type: String,
    enum: ['pending', 'approved_mr', 'approved_owner', 'rejected'],
    default: 'pending'
  },
  approvedBy: { type: String, default: '' }, // 'mr' or 'owner'
  approvedAt: { type: Date },
  rejectionReason: { type: String, default: '' },

  // Stock movement tracking
  stockMoved: { type: Boolean, default: false },
  destination: { type: String, default: '' }, // "Medical Shop" or "Hospital"

  // Return tracking
  returned: { type: Boolean, default: false },
  returnedQuantity: { type: Number, default: 0 },
  returnReason: { type: String, default: '' },
  returnedAt: { type: Date },
  returnedByMR: { type: String, default: '' },

  // Damage tracking
  damaged: { type: Boolean, default: false },
  damagedQuantity: { type: Number, default: 0 },
  damageNote: { type: String, default: '' },

  // Incentive impact
  incentiveAdjusted: { type: Boolean, default: false },
  incentiveMonth: { type: String, default: '' }, // Month C when incentive is given
}, { timestamps: true });

stockRequestSchema.index({ employeeId: 1, month: 1 });

module.exports = mongoose.model('StockRequest', stockRequestSchema);
