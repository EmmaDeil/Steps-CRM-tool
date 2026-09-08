const mongoose = require('mongoose');

const poReceiptSchema = new mongoose.Schema(
  {
    receiptNumber: {
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
    receivedBy: {
      userId: { type: String, required: true },
      userName: { type: String, required: true },
      userEmail: { type: String },
      department: { type: String },
    },
    receivedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    deliveryDate: Date,
    receivedItems: [
      {
        itemName: { type: String, required: true },
        poLineItemId: String, // Reference to specific line item in PO
        quantityOrdered: { type: Number, required: true },
        quantityReceived: { type: Number, required: true },
        quantityType: { type: String, required: true },
        unitPrice: { type: Number },
        totalPrice: { type: Number },
        condition: {
          type: String,
          enum: ['excellent', 'good', 'fair', 'damaged'],
          default: 'excellent',
        },
        notes: { type: String },
        batchNumber: { type: String },
        expiryDate: Date,
        serialNumbers: [String],
      },
    ],
    storeLocation: {
      locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreLocation' },
      locationName: { type: String, required: true },
    },
    qualityInspection: {
      inspectBy: {
        userId: { type: String },
        userName: { type: String },
      },
      inspectedAt: Date,
      passed: { type: Boolean, default: true },
      comments: { type: String },
      damageReport: { type: String },
    },
    status: {
      type: String,
      enum: ['pending', 'received', 'inspected', 'accepted', 'rejected', 'partially_received'],
      default: 'received',
    },
    inventoryUpdated: {
      type: Boolean,
      default: false,
    },
    inventoryUpdateDate: Date,
    invoiceChecking: {
      invoiceNumber: { type: String },
      invoiceAmount: { type: Number },
      invoiceCurrency: { type: String, default: 'NGN' },
      checkedBy: {
        userId: { type: String },
        userName: { type: String },
      },
      checkedAt: Date,
      discrepancies: { type: String },
      status: {
        type: String,
        enum: ['pending', 'verified', 'discrepancy', 'approved'],
        default: 'pending',
      },
    },
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
    notes: { type: String },
    activities: [
      {
        type: {
          type: String,
          enum: ['received', 'inspected', 'accepted', 'rejected', 'inventory_updated', 'invoice_checked'],
          default: 'received',
        },
        author: { type: String, required: true },
        authorId: { type: String },
        timestamp: { type: Date, default: Date.now },
        description: { type: String },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate Receipt Number
poReceiptSchema.pre('validate', async function (next) {
  if (!this.receiptNumber) {
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const yearMonth = new Date().toISOString().slice(2, 7).replace('-', '');
    this.receiptNumber = `REC-${yearMonth}-${randomSuffix}`;
  }
  next();
});

module.exports = mongoose.model('POReceipt', poReceiptSchema);
