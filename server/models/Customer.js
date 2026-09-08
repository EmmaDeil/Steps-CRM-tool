const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, unique: true, index: true },
    name:        { type: String, required: true, trim: true },
    type:        { type: String, enum: ['individual', 'business'], default: 'business' },
    email:       { type: String, default: '', trim: true, lowercase: true },
    phone:       { type: String, default: '', trim: true },
    address:     { type: String, default: '', trim: true },
    contactPerson: { type: String, default: '', trim: true },
    taxId:       { type: String, default: '', trim: true },
    notes:       { type: String, default: '' },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Soft delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

CustomerSchema.index({ isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model('Customer', CustomerSchema);
