const mongoose = require('mongoose');

const poLineItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  quantity: { type: Number, required: true },
  quantityType: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String }
});

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      required: true,
      unique: true,
    },
    vendor: {
      type: String,
      required: true,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: [
        'draft',
        'issued',
        'approved',
        'payment_pending',
        'paid',
        'received',
        'closed',
        'cancelled',
      ],
      default: 'draft',
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    expectedDelivery: {
      type: Date,
    },
    notes: {
      type: String,
    },
    linkedMaterialRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaterialRequest',
    },
    lineItems: [poLineItemSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Auto-generate PO Number if not provided
purchaseOrderSchema.pre('validate', async function (next) {
  if (!this.poNumber) {
    // Generate a secure sequence
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const yearMonth = new Date().toISOString().slice(2, 7).replace('-', '');
    this.poNumber = `PO-${yearMonth}-${randomSuffix}`;

    // Loop until unique
    let attempt = 0;
    while (attempt < 5) {
      const exists = await mongoose.models.PurchaseOrder.findOne({ poNumber: this.poNumber });
      if (!exists) break;
      this.poNumber = `PO-${yearMonth}-${Math.floor(1000 + Math.random() * 9000)}`;
      attempt++;
    }
  }
  next();
});

// Virtual ID to match frontend formatting
purchaseOrderSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
