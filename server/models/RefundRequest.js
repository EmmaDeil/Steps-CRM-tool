const mongoose = require('mongoose');

const refundRequestSchema = new mongoose.Schema({
  employeeName: { type: String, required: true },
  employeeId: { type: String, required: true },
  department: { type: String, required: true },
  userId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'NGN' },
  reason: { type: String, required: true },
  category: { type: String, required: true },
  receiptNumber: { type: String },
  transactionDate: { type: String, required: true },
  approver: { type: String, required: true },
  approverEmail: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  requestDate: { type: String, required: true },
  rejectionReason: { type: String },
  attachments: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('RefundRequest', refundRequestSchema);
