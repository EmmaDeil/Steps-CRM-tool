const mongoose = require('mongoose');

/** Per-location stock entry — one per store where this item is held */
const StockLevelSchema = new mongoose.Schema({
  locationId:   { type: mongoose.Schema.Types.ObjectId, ref: 'StoreLocation', required: true },
  locationName: { type: String, required: true },
  quantity:     { type: Number, default: 0, min: 0 },
  maxStock:     { type: Number, default: 100, min: 1 },
  reorderPoint: { type: Number, default: 20, min: 0 },
}, { _id: false });

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
    unit:        { type: String, default: 'pcs' },

    /**
     * Per-location stock breakdown. The source of truth for multi-location tracking.
     * Use stockLevels for display; use top-level fields for legacy/aggregate queries.
     */
    stockLevels: { type: [StockLevelSchema], default: [] },

    // ── Aggregate / legacy fields (kept for backwards compatibility) ──────────
    /** Sum of quantity across all stockLevels. Updated on every transfer/restock. */
    quantity:     { type: Number, required: true, default: 0, min: 0 },
    maxStock:     { type: Number, required: true, default: 100, min: 1 },
    reorderPoint: { type: Number, default: 20, min: 0 },
    /** Primary / default location (first stockLevel or the original single location) */
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
