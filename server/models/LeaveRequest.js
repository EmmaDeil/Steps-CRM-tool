const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  userId: { type: String, required: true },
  department: { type: String },
  leaveType: { 
    type: String, 
    required: true,
    enum: ['annual', 'sick', 'personal', 'unpaid']
  },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  days: { type: Number, required: true },
  reason: { type: String },
  managerId: { type: String, required: true },
  managerName: { type: String, required: true },
  managerEmail: { type: String },
  status: { 
    type: String, 
    default: 'pending_manager',
    enum: ['pending_manager', 'approved_manager', 'rejected_manager', 'pending_hr', 'approved', 'rejected']
  },
  managerApprovedAt: { type: Date },
  managerRejectedAt: { type: Date },
  managerComments: { type: String },
  hrApprovedAt: { type: Date },
  hrRejectedAt: { type: Date },
  hrComments: { type: String },
  requestDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  collection: 'leave_requests'
});

// Indexes for efficient queries
leaveRequestSchema.index({ employeeId: 1, status: 1 });
leaveRequestSchema.index({ managerId: 1, status: 1 });
leaveRequestSchema.index({ userId: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
