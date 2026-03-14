const mongoose = require('mongoose');

const invoiceLineSchema = new mongoose.Schema({
  description: { type: String, required: true },
  qty:         { type: Number, required: true, min: 1 },
  unitPrice:   { type: Number, required: true, min: 0 },
  totalPrice:  { type: Number, required: true, min: 0 },
  inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', default: null },
}, { _id: false });

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },

  // Bill-to details
  billTo:     { type: String, required: true },
  billToType: { type: String, enum: ['department', 'person', 'project', 'external', 'other'], default: 'other' },

  lineItems:   { type: [invoiceLineSchema], default: [] },
  subtotal:    { type: Number, default: 0 },
  taxRate:     { type: Number, default: 0 },      // percentage e.g. 7.5
  taxAmount:   { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },

  status:  { type: String, enum: ['draft', 'sent', 'paid', 'cancelled'], default: 'draft' },
  dueDate: { type: Date, default: null },
  paidAt:  { type: Date, default: null },
  notes:   { type: String, default: '' },
  paymentTerms: { type: String, default: 'Net 30' },

  // Source / traceability
  linkedIssueId:   { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryIssue', default: null },
  generatedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  generatedByName: { type: String, default: '' },
}, { timestamps: true });

// Auto-generate invoice number and compute totals
InvoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const yearMonth = new Date().toISOString().slice(2, 7).replace('-', '');
    const count = await mongoose.model('Invoice').countDocuments();
    this.invoiceNumber = `INV-${yearMonth}-${String(count + 1).padStart(5, '0')}`;
  }
  this.subtotal   = this.lineItems.reduce((s, li) => s + li.totalPrice, 0);
  this.taxAmount  = Math.round(this.subtotal * (this.taxRate / 100) * 100) / 100;
  this.totalAmount = Math.round((this.subtotal + this.taxAmount) * 100) / 100;
  next();
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
