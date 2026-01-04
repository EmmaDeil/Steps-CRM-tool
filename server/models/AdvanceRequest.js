const mongoose = require('mongoose');

const advanceRequestSchema = new mongoose.Schema({
  employeeName: { type: String, required: true },
  employeeId: { type: String, required: true },
  department: { type: String, required: true },
  userId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'NGN' },
  reason: { type: String, required: true },
  purpose: { type: String, required: true },
  approver: { type: String, required: true },
  approverEmail: { type: String, required: true },
  repaymentPeriod: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  requestDate: { type: String, required: true },
  hasRetirement: { type: Boolean, default: false },
  rejectionReason: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('AdvanceRequest', advanceRequestSchema);
