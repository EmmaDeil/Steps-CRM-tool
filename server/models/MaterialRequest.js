const mongoose = require('mongoose');

const materialRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
    },
    requestTitle: { 
      type: String 
    },
    requestType: {
      type: String,
      required: true,
      enum: ['Internal Transfer', 'RFQ', 'Purchase Request', 'Emergency Purchase', 'Stock Replenishment'],
      default: 'Purchase Request',
    },
    approver: {
      type: String,
      required: false, // Made optional for rule-based approval
    },
    department: {
      type: String,
      required: true,
    },
    // Multi-level approval fields
    usesRuleBasedApproval: {
      type: Boolean,
      default: false,
    },
    approvalRuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApprovalRule',
    },
    currentApprovalLevel: {
      type: Number,
      default: 1,
    },
    approvalChain: [{
      level: Number,
      approverRole: String,
      approverId: String,
      approverName: String,
      approverEmail: String,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'awaiting'],
        default: 'awaiting'
      },
      approvedAt: Date,
      comments: String
    }],
    requestedBy: {
      type: String,
      required: true,
    },
    requiredByDate: { 
      type: Date 
    },
    budgetCode: { 
      type: String 
    },
    reason: { 
      type: String 
    },
    preferredVendor: { 
      type: String 
    },
    date: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'fulfilled'],
      default: 'pending',
    },
    rejectionReason: { 
      type: String 
    },
    lineItems: [
      {
        itemName: String,
        quantity: Number,
        quantityType: String,
        amount: Number,
        description: String,
      },
    ],
    attachments: [String],
    message: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for ID mapped to _id
materialRequestSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

module.exports = mongoose.model('MaterialRequest', materialRequestSchema);
