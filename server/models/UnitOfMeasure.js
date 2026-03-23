const mongoose = require('mongoose');

const UnitOfMeasureSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameKey: { type: String, required: true, unique: true, index: true },
    symbol: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    unitCategory: {
      type: String,
      enum: ['count', 'volume', 'weight', 'length', 'area', 'custom'],
      default: 'custom',
    },
    baseQuantity: { type: Number, default: 1, min: 0.000001 },
    baseUnitLabel: { type: String, default: 'unit', trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

UnitOfMeasureSchema.pre('validate', function normalizeName(next) {
  const normalizedName = String(this.name || '').trim();
  this.name = normalizedName;
  this.nameKey = normalizedName.toLowerCase();

  // Best-effort parser for labels like "Pack of 12" or "Gallon of 50L".
  const parsed = String(normalizedName)
    .match(/\bof\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\b/i);
  if (parsed) {
    const qty = Number(parsed[1]);
    const unit = String(parsed[2] || '').trim().toLowerCase();
    if ((!this.baseQuantity || this.baseQuantity === 1) && Number.isFinite(qty) && qty > 0) {
      this.baseQuantity = qty;
    }
    if (!String(this.baseUnitLabel || '').trim() && unit) {
      this.baseUnitLabel = unit;
    }
  }

  if (!String(this.baseUnitLabel || '').trim()) {
    this.baseUnitLabel = String(this.symbol || 'unit').trim() || 'unit';
  }
  next();
});

module.exports = mongoose.model('UnitOfMeasure', UnitOfMeasureSchema);
