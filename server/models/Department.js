const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, trim: true },
  icon: { type: String, default: null },
  color: { type: String, default: null },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Department', departmentSchema);
