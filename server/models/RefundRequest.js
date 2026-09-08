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
  approver: { type: String, required: false }, // Made optional for rule-based approval
  approverEmail: { type: String, required: false },
  // Multi-level approval fields
  usesRuleBasedApproval: { type: Boolean, default: false },
  approvalRuleId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApprovalRule' },
  currentApprovalLevel: { type: Number, default: 1 },
  approvalChain: [{
    level: Number,
    approverRole: String,
    approverId: String,
    approverName: String,
    approverEmail: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'awaiting'], default: 'awaiting' },
    approvedAt: Date,
    comments: String
  }],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  requestDate: { type: String, required: true },
  rejectionReason: { type: String },
  attachments: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('RefundRequest', refundRequestSchema);
