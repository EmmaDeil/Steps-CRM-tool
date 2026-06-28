const mongoose = require('mongoose');

const reconciliationSchema = new mongoose.Schema({
  account: { type: String, required: true },
  period: {
    start: { type: String, required: true },
    end: { type: String, required: true }
  },
  statementEnd: { type: Number, required: true },
  clearedBalance: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'completed'], default: 'draft' },
  completedAt: { type: Date },
  bankTransactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BankTransaction' }],
  ledgerTransactions: [{ type: mongoose.Schema.Types.ObjectId }] // matched ledger IDs (like Payment/Invoice/JournalEntry IDs)
}, {
  timestamps: true
});

module.exports = mongoose.model('Reconciliation', reconciliationSchema);
