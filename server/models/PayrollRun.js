const mongoose = require('mongoose');

const EmployeePayrollSchema = new mongoose.Schema({
  id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  department: {
    type: String
  },
  paySchedule: {
    type: String,
    enum: ['Monthly', 'Semi-monthly', 'Bi-weekly', 'Weekly'],
  },
  // Salary-based fields (from employee profile)
  baseSalary: {
    type: Number,
    default: 0
  },
  bonus: {
    type: Number,
    default: 0
  },
  allowances: {
    type: Number,
    default: 0
  },
  // Hours-based fields (for hourly workers / manual adjustments)
  regularHours: {
    type: Number,
    default: 0
  },
  overtime: {
    type: Number,
    default: 0
  },
  commission: {
    type: Number,
    default: 0
  },
  // Per-employee flat deductions (salary advances, loans, union dues, etc.)
  personalDeductions: {
    type: Number,
    default: 0
  },
  // Auto-computed from approved AdvanceRequest records at prepare-time
  advanceDeduction: {
    type: Number,
    default: 0
  },
  // Computed per-employee breakdown (filled by pre-validate hook)
  taxAmount: {
    type: Number,
    default: 0
  },
  pensionAmount: {
    type: Number,
    default: 0
  },
  grossPay: {
    type: Number,
    default: 0
  },
  netPay: {
    type: Number,
    default: 0
  },
  paidAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['Ready', 'Incomplete'],
    default: 'Ready'
  }
});

const PayrollRunSchema = new mongoose.Schema({
  period: {
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    paymentSchedule: { type: String, required: true, enum: ["Weekly", "Bi-weekly", "Semi-monthly", "Monthly"] }
  },
  payRates: {
    regularRate: { type: Number, required: true, default: 0 },
    overtimeRate: { type: Number, required: true, default: 0 }
  },
  deductions: {
    taxRate: { type: Number, default: 0 },
    pensionRate: { type: Number, default: 0 },
    employerPensionRate: { type: Number, default: 0 }, // company contribution — expense, not deducted from net
    usePayeBrackets: { type: Boolean, default: false }, // Nigerian graduated PAYE instead of flat taxRate
    healthInsurance: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 }
  },
  employees: [EmployeePayrollSchema],
  totals: {
    totalGrossPay: { type: Number, default: 0 },
    totalNetPay: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    totalEmployerPension: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'paid', 'cancelled'],
    default: 'draft'
  },
  currentStep: {
    type: Number,
    default: 1
  },
  approvedBy: {
    type: String,
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  paidAt: {
    type: Date,
    default: null
  },
  paidBy: {
    type: String,
    default: null
  },
  journalEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry',
    default: null
  },
  processedBy: {
    type: String // We can store user name or ID here
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Nigerian PAYE graduated brackets (annual, NGN) — Finance Act 2020 rates
// after Consolidated Relief Allowance: higher of ₦200,000 or 1% of gross, plus 20% of gross.
const PAYE_BRACKETS = [
  { limit: 300000, rate: 0.07 },
  { limit: 300000, rate: 0.11 },
  { limit: 500000, rate: 0.15 },
  { limit: 500000, rate: 0.19 },
  { limit: 1600000, rate: 0.21 },
  { limit: Infinity, rate: 0.24 },
];

function calculateAnnualPAYE(annualGross) {
  if (annualGross <= 0) return 0;
  const cra = Math.max(200000, annualGross * 0.01) + annualGross * 0.2;
  let taxable = Math.max(0, annualGross - cra);
  let tax = 0;
  for (const bracket of PAYE_BRACKETS) {
    if (taxable <= 0) break;
    const chunk = Math.min(taxable, bracket.limit);
    tax += chunk * bracket.rate;
    taxable -= chunk;
  }
  return tax;
}

// Calculate gross/net pay for every employee BEFORE validating/saving
PayrollRunSchema.pre('validate', function (next) {
  if (!this.employees) return next();

  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;
  let totalEmployerPension = 0;

  const { taxRate, pensionRate, employerPensionRate, usePayeBrackets, healthInsurance, otherDeductions } = this.deductions || {};
  const periodMonths = this.period?.paymentSchedule === 'Weekly' ? 12 / 52
    : this.period?.paymentSchedule === 'Bi-weekly' ? 12 / 26
      : this.period?.paymentSchedule === 'Semi-monthly' ? 0.5
        : 1; // Monthly

  this.employees.forEach(emp => {
    // Prefer salary-based calculation if baseSalary is set on the employee profile.
    // Fall back to hours-based calculation for hourly/manual workers.
    const hasSalary = (emp.baseSalary || 0) > 0;

    if (hasSalary) {
      // Salary-based gross: base salary + bonus + allowances + overtime + commission
      emp.grossPay = (emp.baseSalary || 0) + (emp.bonus || 0) + (emp.allowances || 0)
        + (emp.overtime || 0) * (this.payRates.overtimeRate || 0)
        + (emp.commission || 0);
    } else {
      // Hours-based gross: regularHours * rate + overtime * overtimeRate + commission
      emp.grossPay =
        (emp.regularHours || 0) * (this.payRates.regularRate || 0) +
        (emp.overtime || 0) * (this.payRates.overtimeRate || 0) +
        (emp.commission || 0);
    }

    totalGross += emp.grossPay;

    // Tax: graduated Nigerian PAYE (annualized, pro-rated to the period) or flat rate
    if (usePayeBrackets) {
      const monthlyEquivalent = emp.grossPay / periodMonths;
      const annualTax = calculateAnnualPAYE(monthlyEquivalent * 12);
      emp.taxAmount = Math.round((annualTax / 12) * periodMonths * 100) / 100;
    } else {
      emp.taxAmount = emp.grossPay * ((taxRate || 0) / 100);
    }

    // Employee pension (% of gross) — deducted from net pay
    emp.pensionAmount = emp.grossPay * ((pensionRate || 0) / 100);

    // Employer pension — company expense, does NOT reduce the employee's net
    const employerPension = emp.grossPay * ((employerPensionRate || 0) / 100);
    totalEmployerPension += employerPension;

    const empTotalDeductions =
      emp.taxAmount +
      emp.pensionAmount +
      (healthInsurance || 0) +
      (otherDeductions || 0) +
      (emp.personalDeductions || 0) +
      (emp.advanceDeduction || 0);

    emp.netPay = Math.round((emp.grossPay - empTotalDeductions) * 100) / 100;

    totalDeductions += empTotalDeductions;
    totalNet += emp.netPay;
  });

  this.totals = {
    totalGrossPay: Math.round(totalGross * 100) / 100,
    totalNetPay: Math.round(totalNet * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    totalEmployerPension: Math.round(totalEmployerPension * 100) / 100
  };

  next();
});

module.exports = mongoose.model('PayrollRun', PayrollRunSchema);
