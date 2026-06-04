const mongoose = require('mongoose');

const dealLineItemSchema = new mongoose.Schema({
  inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', default: null },
  itemName:     { type: String, required: true },
  itemCode:     { type: String, default: '' },
  unit:         { type: String, default: 'pcs' },
  qty:          { type: Number, required: true, min: 1 },
  costPrice:    { type: Number, default: 0, min: 0 },    // read-only from inventory
  sellingPrice: { type: Number, required: true, min: 0 }, // user-set
  lineRevenue:  { type: Number, default: 0 },
  lineCost:     { type: Number, default: 0 },
  lineProfit:   { type: Number, default: 0 },
}, { _id: false });

const dealSchema = new mongoose.Schema({
  title:         { type: String, required: true },
  value:         { type: Number, required: true },
  stage:         { type: String, enum: ['lead', 'contacted', 'proposal', 'negotiation', 'won', 'lost'], default: 'lead' },
  customerName:  { type: String, required: true },
  customerEmail: { type: String },
  customerPhone: { type: String },
  assignedRep:   { type: String, required: true },
  closeDate:     { type: Date },
  notes:         { type: String, default: '' },

  // Inventory line items being sold in this deal
  lineItems:    { type: [dealLineItemSchema], default: [] },

  // Profit metrics (recomputed on every lineItems save)
  totalCost:    { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  totalProfit:  { type: Number, default: 0 },
  profitMargin: { type: Number, default: 0 }, // percentage

  // Linked invoice once generated
  linkedInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, {
  collection: 'sales_deals'
});

module.exports = mongoose.model('Deal', dealSchema);
