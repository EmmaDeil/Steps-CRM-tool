const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
  itemName:  { type: String, required: true },
  itemCode:  { type: String, default: '' },
  unit:      { type: String, default: 'pcs' },
  qty:       { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, default: 0 },
  totalPrice:{ type: Number, default: 0 },
  notes:     { type: String, default: '' },
}, { _id: false });

const InventoryIssueSchema = new mongoose.Schema({
  issueNumber: { type: String, unique: true },

  // Who/what is receiving the stock
  issuedTo:    { type: String, required: true }, // dept, person, project, etc.
  issuedToType:{ type: String, enum: ['department', 'person', 'project', 'other'], default: 'other' },

  // Who issued it
  issuedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  issuedByName: { type: String, default: '' },

  lineItems: { type: [lineItemSchema], default: [] },
  totalValue: { type: Number, default: 0 },

  // Linked source documents
  linkedMaterialRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaterialRequest', default: null },
  linkedStockTransferId:   { type: mongoose.Schema.Types.ObjectId, ref: 'StockTransfer', default: null },

  // Linked invoice (set when invoice is generated)
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },

  status: { type: String, enum: ['issued', 'invoiced', 'cancelled'], default: 'issued' },
  notes:  { type: String, default: '' },
}, { timestamps: true });

// Auto-generate issue number
InventoryIssueSchema.pre('save', async function (next) {
  if (!this.issueNumber) {
    const yearMonth = new Date().toISOString().slice(2, 7).replace('-', '');
    const count = await mongoose.model('InventoryIssue').countDocuments();
    this.issueNumber = `ISS-${yearMonth}-${String(count + 1).padStart(5, '0')}`;
  }
  // Recompute total
  this.totalValue = this.lineItems.reduce((sum, li) => sum + (li.totalPrice || li.qty * li.unitPrice || 0), 0);
  next();
});

module.exports = mongoose.model('InventoryIssue', InventoryIssueSchema);
