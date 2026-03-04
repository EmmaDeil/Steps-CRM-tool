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
  grossPay: {
    type: Number,
    default: 0
  },
  netPay: {
    type: Number,
    default: 0
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
    healthInsurance: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 }
  },
  employees: [EmployeePayrollSchema],
  totals: {
    totalGrossPay: { type: Number, default: 0 },
    totalNetPay: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 }
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
  processedBy: {
    type: String // We can store user name or ID here
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Calculate missing amounts like Net Pay for every employee BEFORE validating/saving
PayrollRunSchema.pre('validate', function(next) {
    if (!this.employees) return next();

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    const { taxRate, pensionRate, healthInsurance, otherDeductions } = this.deductions || {};
    // Let's assume tax & pension are percentages, while health and other are flat amounts per employee. Or we can just calculate them as values.
    // To match Payroll.jsx's likely math: tax is usually % of gross. Pension % of gross.

    this.employees.forEach(emp => {
      // Recalculate gross if missing
      emp.grossPay = 
        (emp.regularHours * (this.payRates.regularRate || 0)) + 
        (emp.overtime * (this.payRates.overtimeRate || 0)) +
        (emp.commission || 0);
      totalGross += emp.grossPay;

      // Calculate deductibles
      const empTax = emp.grossPay * ((taxRate || 0) / 100);
      const empPension = emp.grossPay * ((pensionRate || 0) / 100);
      const empTotalDeductions = empTax + empPension + (healthInsurance || 0) + (otherDeductions || 0);
      
      emp.netPay = emp.grossPay - empTotalDeductions;
      
      totalDeductions += empTotalDeductions;
      totalNet += emp.netPay;
    });

    this.totals = {
      totalGrossPay: totalGross,
      totalNetPay: totalNet,
      totalDeductions: totalDeductions
    };

    next();
});

module.exports = mongoose.model('PayrollRun', PayrollRunSchema);
