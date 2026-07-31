const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mrSchema = new mongoose.Schema({
  mrId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  area: { type: String, default: '' },
  pincodes: [{ type: String }], // assigned pincodes
  employeeIds: [{ type: String }], // employees managed by this MR (up to ~6)
  baseSalary: { type: Number, default: 0 },
  notifications: [
    {
      message: String,
      read: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

mrSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

mrSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('MR', mrSchema);
