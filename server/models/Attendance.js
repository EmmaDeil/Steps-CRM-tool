const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  employeeRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  employeeId: { type: String, required: true },
  name: { type: String, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  checkInTime: { type: Date },
  checkOutTime: { type: Date },
  status: { type: String, required: true, default: 'present' },
}, { timestamps: true });

// Ensure one record per employee per day
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
