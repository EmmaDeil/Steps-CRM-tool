const mongoose = require('mongoose');

const skuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    unitPrice: {
      type: Number,
      default: 0,
    },
    unit: {
      type: String,
      default: 'Pieces',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SkuItem', skuItemSchema);
