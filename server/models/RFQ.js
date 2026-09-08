const mongoose = require('mongoose');

const rfqSchema = new mongoose.Schema(
  {
    rfqNumber: {
      type: String,
      required: true,
      unique: true,
    },
    materialRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaterialRequest',
      required: true,
    },
    requestType: {
      type: String,
      enum: ['store', 'internal_transfer', 'maintenance'],
      default: 'store',
    },
    vendor: {
      vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
      vendorName: { type: String, required: true },
      vendorEmail: { type: String },
      vendorPhone: { type: String },
    },
    requestedBy: {
      userId: { type: String, required: true },
      userName: { type: String, required: true },
      userEmail: { type: String },
    },
    department: { type: String },
    currency: {
      type: String,
      default: 'NGN',
    },
    exchangeRateToNgn: {
      type: Number,
      default: 1,
    },
    lineItems: [
      {
        itemName: { type: String, required: true },
        quantity: { type: Number, required: true },
        quantityType: { type: String, required: true },
        estimatedAmount: { type: Number },
        description: { type: String },
      },
    ],
    totalEstimatedAmount: {
      type: Number,
      default: 0,
    },
    totalEstimatedAmountNgn: {
      type: Number,
      default: 0,
    },
    quotations: [
      {
        quotationDate: { type: Date, default: Date.now },
        quotedAmount: { type: Number },
        quotedAmountNgn: { type: Number },
        quotedBy: { type: String }, // Vendor contact
        notes: { type: String },
        attachments: [
          {
            fileName: String,
            fileData: String,
            fileType: String,
            fileSize: Number,
          },
        ],
        status: {
          type: String,
          enum: ['pending', 'received', 'rejected', 'accepted'],
          default: 'pending',
        },
        receivedAt: Date,
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'sent', 'quotation_received', 'quotation_accepted', 'po_generated', 'cancelled'],
      default: 'draft',
    },
    bestQuotationIndex: {
      type: Number,
      default: null,
    },
    sentDate: Date,
    expiryDate: Date,
    requiredByDate: Date,
    notes: { type: String },
    activities: [
      {
        type: {
          type: String,
          enum: ['created', 'sent', 'quotation_received', 'quotation_accepted', 'po_generated', 'cancelled'],
          default: 'created',
        },
        author: { type: String, required: true },
        authorId: { type: String },
        timestamp: { type: Date, default: Date.now },
        description: { type: String },
      },
    ],
    linkedPOId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate RFQ Number
rfqSchema.pre('validate', async function (next) {
  if (!this.rfqNumber) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const yearMonth = new Date().toISOString().slice(2, 7).replace('-', '');
    this.rfqNumber = `RFQ-${yearMonth}-${randomSuffix}`;
  }
  next();
});

module.exports = mongoose.model('RFQ', rfqSchema);
