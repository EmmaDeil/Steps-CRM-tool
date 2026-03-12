const mongoose = require('mongoose');

/**
 * StockMovement — audit trail for every quantity change on an InventoryItem.
 * Types:
 *   'initial'    – created with stock
 *   'restock'    – manual restock (positive delta)
 *   'adjustment' – admin correction (pos or neg)
 *   'transfer'   – deducted via Internal Transfer (procurement)
 *   'deletion'   – item soft-deleted, remaining qty voided
 */
const StockMovementSchema = new mongoose.Schema(
  {
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['initial', 'restock', 'adjustment', 'transfer', 'deletion'],
      required: true,
    },
    quantityChange:   { type: Number, required: true },   // positive = stock in, negative = stock out
    previousQuantity: { type: Number, required: true },
    newQuantity:      { type: Number, required: true },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StockMovement', StockMovementSchema);
