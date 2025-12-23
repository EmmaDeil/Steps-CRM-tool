const mongoose = require('mongoose');

const materialRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
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
    date: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
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
  }
);

module.exports = mongoose.model('MaterialRequest', materialRequestSchema);
