const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      required: true,
      unique: true,
    },
    poId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: true,
    },
    poNumber: { type: String, required: true },
    vendor: {
      vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
      vendorName: { type: String, required: true },
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    amountNgn: {
      type: Number,
      default: 0,
    },
    paymentType: {
      type: String,
      enum: ['deposit', 'partial', 'full', 'balance'],
      default: 'partial',
    },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'check', 'cash', 'credit_card', 'other'],
      default: 'bank_transfer',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    paymentDate: {
      type: Date,
      required: true,
    },
    completedDate: Date,
    reference: {
      transactionId: { type: String },
      bankName: { type: String },
      chequeNumber: { type: String },
      invoiceNumber: { type: String },
    },
    paidBy: {
      userId: { type: String, required: true },
      userName: { type: String, required: true },
      userEmail: { type: String },
      userDepartment: { type: String },
    },
    approver: {
      userId: { type: String },
      userName: { type: String },
      userEmail: { type: String },
      approvedAt: Date,
      comments: { type: String },
    },
    notes: { type: String },
    attachments: [
      {
        fileName: String,
        description: String,
        fileData: String,
        fileType: String,
        fileSize: Number,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    activities: [
      {
        type: {
          type: String,
          enum: ['created', 'submitted', 'approved', 'processing', 'completed', 'failed', 'cancelled'],
          default: 'created',
        },
        author: { type: String, required: true },
        authorId: { type: String },
        timestamp: { type: Date, default: Date.now },
        description: { type: String },
        details: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate Payment Number
paymentSchema.pre('validate', async function (next) {
  if (!this.paymentNumber) {
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const yearMonth = new Date().toISOString().slice(2, 7).replace('-', '');
    this.paymentNumber = `PAY-${yearMonth}-${randomSuffix}`;
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
