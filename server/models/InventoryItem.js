const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema(
  {
    itemId:   { type: String, required: true, unique: true, index: true },
    name:     { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['Electronics', 'Furniture', 'Supplies', 'Network'],
    },
    description: { type: String, default: '' },
    unit:        { type: String, default: 'pcs' },   // e.g. pcs, kg, litre
    quantity:    { type: Number, required: true, default: 0, min: 0 },
    maxStock:    { type: Number, required: true, default: 100, min: 1 },
    /** Per-item low-stock threshold. Defaults to 20% of maxStock on creation. */
    reorderPoint: { type: Number, default: 20, min: 0 },
    location:     { type: String, required: true, trim: true },
    lastUpdated:  { type: Date, default: Date.now },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // ── Soft delete ──────────────────────────────────────────────────────────
    isDeleted:  { type: Boolean, default: false, index: true },
    deletedAt:  { type: Date, default: null },
    deletedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Compound index for common query: non-deleted items sorted by lastUpdated
InventoryItemSchema.index({ isDeleted: 1, lastUpdated: -1 });

module.exports = mongoose.model('InventoryItem', InventoryItemSchema);
