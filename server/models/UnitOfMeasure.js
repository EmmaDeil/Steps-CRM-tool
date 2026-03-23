const mongoose = require('mongoose');

const UnitOfMeasureSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameKey: { type: String, required: true, unique: true, index: true },
    symbol: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
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
  next();
});

module.exports = mongoose.model('UnitOfMeasure', UnitOfMeasureSchema);
