const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  department: { type: String, default: '' },
  designation: { type: String, default: '' },
  baseSalary: { type: Number, default: 0 },
  travelDistance: { type: Number, default: 0 }, // km from home to office
  bankDetails: {
    accountNo: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    bankName: { type: String, default: '' }
  },
  notifications: [
    {
      message: String,
      read: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

// Hash password before saving
employeeSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password
employeeSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('Employee', employeeSchema);
