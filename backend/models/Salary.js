const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String },
  month: { type: String, required: true },
  baseSalary: { type: Number, default: 0 },
  daysWorked: { type: Number, default: 0 },
  totalWorkingDays: { type: Number, default: 26 },
  absentDays: { type: Number, default: 0 },
  absentDeduction: { type: Number, default: 0 },  // ₹250 per absent day
  salesAmount: { type: Number, default: 0 },       // MRP sales
  incentive: { type: Number, default: 0 },
  travelDistance: { type: Number, default: 0 },    // km
  travelAllowance: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },        // owner-managed extra deductions
  bonus: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  netSalary: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'processed', 'credited'], default: 'pending' },
  creditedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Salary', salarySchema);
