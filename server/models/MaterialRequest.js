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
    },
    approver: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
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
