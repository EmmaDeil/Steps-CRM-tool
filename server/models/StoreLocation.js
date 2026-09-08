const mongoose = require('mongoose');

const StoreLocationSchema = new mongoose.Schema(
  {
    code:        { type: String, required: true, unique: true, trim: true, uppercase: true }, // e.g. WH-A
    name:        { type: String, required: true, trim: true },   // e.g. Warehouse A
    address:     { type: String, default: '' },
    description: { type: String, default: '' },
    isActive:    { type: Boolean, default: true, index: true },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isDeleted:   { type: Boolean, default: false },
  },
  { timestamps: true }
);

StoreLocationSchema.index({ isDeleted: 1, isActive: 1 });

module.exports = mongoose.model('StoreLocation', StoreLocationSchema);
