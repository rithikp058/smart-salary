const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  month: { type: String, required: true }, // "YYYY-MM"
  openingStock: { type: Number, default: 0 },
  closingStock: { type: Number, default: 0 },
  mrpSales: { type: Number, default: 0 },
}, { timestamps: true });

stockSchema.index({ employeeId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Stock', stockSchema);
