const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  user: { type: String, required: true },
  date: { type: String, required: true },
  status: { type: String, required: true },
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
