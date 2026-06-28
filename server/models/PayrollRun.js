const mongoose = require('mongoose');

const payrollRunSchema = new mongoose.Schema({
  period: { type: String, required: true }, // e.g. "2026-06"
  paymentDate: { type: Date, required: true },
  status: { type: String, enum: ['draft', 'approved', 'paid'], default: 'draft' },
  totalGrossPay: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  totalNetPay: { type: Number, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model('PayrollRun', payrollRunSchema);
