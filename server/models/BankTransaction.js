const mongoose = require('mongoose');

const bankTransactionSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  checkNumber: { type: String, default: '' },
  matched: { type: Boolean, default: false },
  matchedWith: { type: mongoose.Schema.Types.ObjectId, default: null }, // Payment/Invoice/JournalEntry ID
  matchedType: { type: String, enum: ['Payment', 'Invoice', 'JournalEntry', null], default: null },
  importedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('BankTransaction', bankTransactionSchema);
