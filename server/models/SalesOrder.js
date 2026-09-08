const mongoose = require('mongoose');

const SalesLineItemSchema = new mongoose.Schema(
  {
    inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', default: null },
    itemId:    { type: String, default: '' }, // Human-readable INV-xxxxx
    itemName:  { type: String, required: true, trim: true },
    quantity:  { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    unit:      { type: String, default: 'pcs' },
    locationId:   { type: mongoose.Schema.Types.ObjectId, ref: 'StoreLocation', default: null },
    locationName: { type: String, default: '' },
  },
  { _id: false }
);

const SalesOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },

    // Customer
    customerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    customerName: { type: String, required: true, trim: true },
    customerEmail:{ type: String, default: '' },
    customerPhone:{ type: String, default: '' },

    // Line items
    lineItems: { type: [SalesLineItemSchema], default: [] },

    // Financials
    subtotal:    { type: Number, default: 0, min: 0 },
    taxRate:     { type: Number, default: 0, min: 0 },   // percentage, e.g. 7.5
    taxAmount:   { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    discount:    { type: Number, default: 0, min: 0 },   // flat discount in currency

    // Order lifecycle
    status: {
      type: String,
      enum: ['draft', 'confirmed', 'fulfilled', 'invoiced', 'cancelled'],
      default: 'draft',
      index: true,
    },

    // Payment tracking
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid',
      index: true,
    },
    paymentMethod: { type: String, default: '' },
    paidAmount:    { type: Number, default: 0, min: 0 },
    paidAt:        { type: Date, default: null },

    // Dates
    dueDate:     { type: Date, default: null },
    confirmedAt: { type: Date, default: null },
    fulfilledAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },

    // Staff
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdByName: { type: String, default: '' },
    fulfilledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    fulfilledByName: { type: String, default: '' },

    // Linked invoice (set after generate-invoice)
    linkedInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },

    notes:         { type: String, default: '' },
    cancellationReason: { type: String, default: '' },
  },
  { timestamps: true }
);

// Auto-generate order number and compute totals before save
SalesOrderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const yearMonth = new Date().toISOString().slice(2, 7).replace('-', '');
    const count = await mongoose.model('SalesOrder').countDocuments();
    this.orderNumber = `SO-${yearMonth}-${String(count + 1).padStart(5, '0')}`;
  }
  this.subtotal    = this.lineItems.reduce((s, li) => s + (li.totalPrice || 0), 0);
  this.subtotal    = Math.round(this.subtotal * 100) / 100;
  const discounted = Math.max(0, this.subtotal - (this.discount || 0));
  this.taxAmount   = Math.round(discounted * (this.taxRate / 100) * 100) / 100;
  this.totalAmount = Math.round((discounted + this.taxAmount) * 100) / 100;
  next();
});

SalesOrderSchema.index({ status: 1, createdAt: -1 });
SalesOrderSchema.index({ customerId: 1, createdAt: -1 });

module.exports = mongoose.model('SalesOrder', SalesOrderSchema);
