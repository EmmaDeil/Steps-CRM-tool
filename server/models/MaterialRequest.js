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
      required: false,
      enum: ['Internal Transfer', 'RFQ', 'Purchase Request', 'Emergency Purchase', 'Stock Replenishment'],
      default: 'Purchase Request',
    },
    approver: {
      type: String,
      required: false, // Made optional for rule-based approval
    },
    department: {
      type: String,
      required: false,
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
    currency: {
      type: String,
      default: 'NGN',
    },
    date: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', 'fulfilled'],
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
    attachments: [{
      fileName: String,
      fileData: String,
      fileType: String,
      fileSize: Number,
    }],
    message: {
      type: String,
      default: '',
    },
    comments: [{
      author: { type: String, required: true },
      authorId: { type: String },
      text: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      mentions: [String],
    }],
    activities: [{
      type: { type: String, enum: ['comment', 'status_change', 'approval', 'rejection', 'created'], default: 'comment' },
      author: { type: String, required: true },
      authorId: { type: String },
      text: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    }],
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
