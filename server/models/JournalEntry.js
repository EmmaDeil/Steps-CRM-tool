const mongoose = require('mongoose');

const journalLineSchema = new mongoose.Schema({
  account: { type: String, required: true },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  description: { type: String }
}, { _id: false });

const journalEntrySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  referenceNumber: { type: String, required: true, unique: true },
  currency: { type: String, default: 'NGN' },
  memo: { type: String },
  lineItems: [journalLineSchema],
  totalDebit: { type: Number, required: true },
  totalCredit: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'posted'], default: 'posted' }
}, {
  timestamps: true
});

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
