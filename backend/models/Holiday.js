const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // "YYYY-MM-DD"
  reason: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Holiday', holidaySchema);
