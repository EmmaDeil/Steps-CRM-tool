const mongoose = require('mongoose');

const leaveAllocationSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  year: { type: Number, required: true },
  annualLeave: { type: Number, default: 20 },
  annualLeaveUsed: { type: Number, default: 0 },
  sickLeave: { type: Number, default: 10 },
  sickLeaveUsed: { type: Number, default: 0 },
  personalLeave: { type: Number, default: 5 },
  personalLeaveUsed: { type: Number, default: 0 },
  unpaidLeave: { type: Number, default: 0 },
  managerId: { type: String, required: true },
  managerName: { type: String, required: true },
  managerEmail: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  collection: 'leave_allocations'
});

// Create compound index to ensure one allocation per employee per year
leaveAllocationSchema.index({ employeeId: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('LeaveAllocation', leaveAllocationSchema);
