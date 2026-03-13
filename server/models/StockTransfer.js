const mongoose = require('mongoose');

const TransferLineItemSchema = new mongoose.Schema({
  inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  itemName:        { type: String, required: true },
  itemCode:        { type: String, required: true },   // the INV-XXXXX code
  unit:            { type: String, default: 'pcs' },
  requestedQty:    { type: Number, required: true, min: 1 },
  transferredQty:  { type: Number, default: 0 },       // set on approval/completion
  notes:           { type: String, default: '' },
});

const StockTransferSchema = new mongoose.Schema(
  {
    transferNumber: { type: String, required: true, unique: true, index: true },

    fromLocationId:   { type: mongoose.Schema.Types.ObjectId, ref: 'StoreLocation', required: true },
    fromLocationName: { type: String, required: true },
    toLocationId:     { type: mongoose.Schema.Types.ObjectId, ref: 'StoreLocation', required: true },
    toLocationName:   { type: String, required: true },

    requestedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    requestedByName: { type: String, default: '' },
    approvedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedByName: { type: String, default: '' },

    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'in_transit', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },

    lineItems: [TransferLineItemSchema],

    /** Populated when this transfer was auto-created from an Internal Transfer Material Request */
    linkedMaterialRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaterialRequest',
      default: null,
    },

    waybillNumber:    { type: String, default: null, index: true },
    waybillGeneratedAt: { type: Date, default: null },

    notes:     { type: String, default: '' },
    cancelReason: { type: String, default: '' },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-generate transfer number before validation
StockTransferSchema.pre('validate', async function (next) {
  if (!this.transferNumber) {
    const yearMonth = new Date().toISOString().slice(2, 7).replace('-', '');
    const count = await mongoose.models.StockTransfer.countDocuments();
    this.transferNumber = `TRF-${yearMonth}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('StockTransfer', StockTransferSchema);
