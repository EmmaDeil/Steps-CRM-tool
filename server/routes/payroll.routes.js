const express = require('express');
const router = express.Router();
const PayrollRun = require('../models/PayrollRun');
const Employee = require('../models/Employee');
const AdvanceRequest = require('../models/AdvanceRequest');
const JournalEntry = require('../models/JournalEntry');
const AuditLogModel = require('../models/AuditLog');
const { authMiddleware } = require('../middleware/auth');
const { checkSecurityRole } = require('../middleware/securityAuth');
const { sendPayslipEmail } = require('../utils/emailService');

// Every payroll route requires authentication
router.use(authMiddleware);

// Only these roles may approve / mark paid / cancel payroll runs
const PAYROLL_ADMIN_ROLES = ['Admin', 'Security Admin'];

const getClientIP = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.socket?.remoteAddress ||
  'unknown';

const auditPayroll = async (req, action, description, status = 'Success') => {
  try {
    const u = req.user || {};
    await AuditLogModel.create({
      actor: {
        userId: (u._id || '').toString(),
        userName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'Unknown',
        userEmail: u.email || '',
        initials: `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase(),
      },
      action,
      actionColor: status === 'Failed' ? 'red' : action === 'Approval' ? 'purple' : 'green',
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'] || '',
      description,
      status,
    });
  } catch (err) {
    console.error('Payroll audit log failed:', err);
  }
};

const normalizePayrollSchedule = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  const match = {
    monthly: 'Monthly',
    'semi-monthly': 'Semi-monthly',
    semimonthly: 'Semi-monthly',
    'bi-weekly': 'Bi-weekly',
    biweekly: 'Bi-weekly',
    weekly: 'Weekly',
  }[normalized.toLowerCase()];
  return match || normalized;
};

const buildPayrollEmployeeRow = (emp, overrides = {}) => {
  const mergedSalary = Number(overrides.baseSalary ?? emp.salary ?? 0);
  const mergedBonus = Number(overrides.bonus ?? emp.bonus ?? 0);
  const mergedAllowances = Number(overrides.allowances ?? emp.allowances ?? 0);

  return {
    id: emp._id,
    name: overrides.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email,
    department: overrides.department ?? emp.department ?? '',
    paySchedule: normalizePayrollSchedule(overrides.paySchedule ?? emp.paySchedule),
    baseSalary: mergedSalary,
    bonus: mergedBonus,
    allowances: mergedAllowances,
    regularHours: Number(overrides.regularHours ?? 0),
    overtime: Number(overrides.overtime ?? 0),
    commission: Number(overrides.commission ?? 0),
    personalDeductions: Number(overrides.personalDeductions ?? 0),
    advanceDeduction: Number(overrides.advanceDeduction ?? 0),
    status: mergedSalary > 0 ? 'Ready' : 'Incomplete',
  };
};

// Fetch approved salary advances for a set of employees and spread repayment across periods.
// repaymentPeriod (e.g. "3 months") splits the advance into equal installments.
const attachAdvanceDeductions = async (rows) => {
  const employeeIds = rows.map((r) => String(r.id));
  const advances = await AdvanceRequest.find({
    status: 'approved',
    hasRetirement: { $ne: true },
    employeeId: { $in: employeeIds },
  }).lean();

  const byEmployee = {};
  for (const adv of advances) {
    const months = parseInt(String(adv.repaymentPeriod || '1'), 10) || 1;
    const installment = Math.round((Number(adv.amount) / months) * 100) / 100;
    byEmployee[adv.employeeId] = (byEmployee[adv.employeeId] || 0) + installment;
  }

  return rows.map((row) => ({
    ...row,
    advanceDeduction: Math.round((byEmployee[String(row.id)] || 0) * 100) / 100,
  }));
};

const hydratePayrollEmployees = async (employees = []) => {
  const rows = Array.isArray(employees) ? employees : [];
  const hydrated = [];

  for (const row of rows) {
    const employeeId = String(row?.id || row?._id || '').trim();
    if (!employeeId) {
      hydrated.push({ ...row });
      continue;
    }

    const employee = await Employee.findById(employeeId).lean();
    if (!employee) {
      hydrated.push({ ...row });
      continue;
    }

    hydrated.push(buildPayrollEmployeeRow(employee, row));
  }

  return hydrated;
};

// GET prepared employee list for a new payroll run
// Query param: paymentSchedule (optional) — filters to matching employees only
router.get('/prepare', async (req, res) => {
  try {
    const { paymentSchedule } = req.query;

    // Build filter: only Active employees
    const filter = { status: 'Active' };

    // If a schedule is given, include employees that match or have no schedule set
    if (paymentSchedule) {
      filter.$or = [
        { paySchedule: paymentSchedule },
        { paySchedule: { $exists: false } },
        { paySchedule: null },
        { paySchedule: '' },
      ];
    }

    const employees = await Employee.find(filter).lean();

    const prepared = await attachAdvanceDeductions(employees.map((emp) => {
      const row = buildPayrollEmployeeRow(emp);
      const grossPay = row.baseSalary + row.bonus + row.allowances;

      return {
        ...row,
        grossPay,
      };
    }));

    res.json({ success: true, data: prepared });
  } catch (err) {
    console.error('Error preparing payroll employees:', err);
    res.status(500).json({ success: false, message: 'Failed to prepare payroll employees' });
  }
});


// GET all historical payroll runs
router.get('/runs', async (req, res) => {
  try {
    const runs = await PayrollRun.find().sort({ createdAt: -1 });
    res.json(runs);
  } catch (err) {
    console.error('Error fetching payroll runs:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// GET active draft for the current user (per-user drafts, so HR staff don't overwrite each other)
router.get('/draft', async (req, res) => {
  try {
    const draft = await PayrollRun.findOne({
      status: 'draft',
      processedBy: (req.user._id || '').toString(),
    }).sort({ updatedAt: -1 });
    res.json({ data: draft });
  } catch (err) {
    console.error('Error fetching draft:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// GET single payroll run by ID
router.get('/runs/:id', async (req, res) => {
  try {
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ success: false, message: 'Not found' });
    res.json(run);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// POST to save/update a draft (scoped to the current user)
router.post('/draft', async (req, res) => {
  try {
    const draftData = req.body;
    draftData.status = 'draft';
    draftData.processedBy = (req.user._id || '').toString();
    draftData.employees = await hydratePayrollEmployees(draftData.employees);

    // Update this user's existing draft, otherwise create a new one
    let draft = await PayrollRun.findOne({
      status: 'draft',
      processedBy: (req.user._id || '').toString(),
    });

    if (draft) {
      draft = await PayrollRun.findByIdAndUpdate(
        draft._id,
        { $set: draftData },
        { new: true, runValidators: true }
      );
    } else {
      draft = new PayrollRun(draftData);
      await draft.save();
    }

    res.json({ success: true, draft });
  } catch (err) {
    console.error('Error saving payroll draft:', err);
    res.status(400).json({ success: false, message: 'Error saving draft', error: err.message });
  }
});

// POST to submit a final run
router.post('/submit', async (req, res) => {
  try {
    const runData = req.body;
    runData.status = 'pending_approval';
    runData.processedBy = (req.user._id || '').toString();
    runData.employees = await hydratePayrollEmployees(runData.employees);

    // Block submission while any employee is missing salary information
    const incomplete = runData.employees.filter((e) => e.status === 'Incomplete');
    if (incomplete.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${incomplete.length} employee(s) have no base salary set: ${incomplete
          .map((e) => e.name)
          .slice(0, 5)
          .join(', ')}${incomplete.length > 5 ? '…' : ''}`,
      });
    }

    if (!runData.employees.length) {
      return res.status(400).json({ success: false, message: 'Cannot submit an empty payroll run' });
    }

    // Duplicate-period guard: one non-cancelled run per month/year/schedule
    const { month, year, paymentSchedule } = runData.period || {};
    const existing = await PayrollRun.findOne({
      'period.month': month,
      'period.year': year,
      'period.paymentSchedule': paymentSchedule,
      status: { $in: ['pending_approval', 'approved', 'paid'] },
      ...(runData._id || runData.id ? { _id: { $ne: runData._id || runData.id } } : {}),
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A ${paymentSchedule} payroll run for ${year}-${String(month + 1).padStart(2, '0')} already exists (status: ${existing.status}). Cancel it first or choose a different period.`,
      });
    }

    // For submitting, we either update the existing draft to pending_approval or create a new one
    let run;
    if (runData._id || runData.id) {
      run = await PayrollRun.findByIdAndUpdate(
        runData._id || runData.id,
        { $set: runData },
        { new: true, runValidators: true }
      );
    } else {
      run = new PayrollRun(runData);
      await run.save();
    }

    // Remove the submitter's draft once submitted
    await PayrollRun.deleteMany({
      status: 'draft',
      processedBy: (req.user._id || '').toString(),
      _id: { $ne: run._id },
    });

    await auditPayroll(
      req,
      'Approval Flow',
      `Payroll run submitted for approval — ${paymentSchedule} ${year}-${String(month + 1).padStart(2, '0')}, ${run.employees.length} employees, net ${run.totals?.totalNetPay}`,
    );

    res.status(201).json({ success: true, run });
  } catch (err) {
    console.error('Error submitting payroll:', err);
    res.status(400).json({ success: false, message: 'Error submitting payroll', error: err.message });
  }
});

// PUT to update status — Admin/Security Admin only, with enforced transitions
router.put('/runs/:id/status', checkSecurityRole(PAYROLL_ADMIN_ROLES), async (req, res) => {
  try {
    const { status } = req.body;
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ success: false, message: 'Not found' });

    // Enforce the state machine: draft → pending_approval → approved → paid (or cancelled)
    const allowed = {
      draft: ['pending_approval', 'cancelled'],
      pending_approval: ['approved', 'cancelled'],
      approved: ['paid', 'cancelled'],
      paid: [],
      cancelled: [],
    };
    if (!allowed[run.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition payroll from "${run.status}" to "${status}"`,
      });
    }

    const actor = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email;
    run.status = status;
    if (status === 'approved') {
      run.approvedBy = actor;
      run.approvedAt = new Date();
    }

    // Marking as paid — record who/when and post the accounting journal entry
    if (status === 'paid') {
      run.paidBy = actor;
      run.paidAt = new Date();
      run.employees.forEach((emp) => { emp.paidAt = run.paidAt; });

      if (!run.journalEntryId) {
        const ref = `PAY-${run.period?.year}-${String((run.period?.month ?? 0) + 1).padStart(2, '0')}-${run._id.toString().slice(-6).toUpperCase()}`;
        const gross = run.totals?.totalGrossPay || 0;
        const deductions = run.totals?.totalDeductions || 0;
        const net = run.totals?.totalNetPay || 0;
        const employerPension = run.totals?.totalEmployerPension || 0;
        const expenseTotal = Math.round((gross + employerPension) * 100) / 100;

        const journal = await JournalEntry.create({
          date: new Date(),
          referenceNumber: ref,
          memo: `Payroll ${run.period?.paymentSchedule} ${run.period?.year}-${String((run.period?.month ?? 0) + 1).padStart(2, '0')} (${run.employees.length} employees)`,
          lineItems: [
            { account: 'Salaries & Wages Expense', debit: gross, credit: 0, description: 'Gross payroll' },
            ...(employerPension > 0
              ? [{ account: 'Pension Expense (Employer)', debit: employerPension, credit: 0, description: 'Employer pension contribution' }]
              : []),
            { account: 'Payroll Taxes Payable', debit: 0, credit: deductions, description: 'PAYE, pension & statutory deductions' },
            { account: 'Cash / Bank', debit: 0, credit: net, description: 'Net salaries disbursed' },
          ],
          totalDebit: expenseTotal,
          totalCredit: Math.round((deductions + net) * 100) / 100,
          status: 'posted',
        });
        run.journalEntryId = journal._id;
      }

      await run.save();

      await auditPayroll(req, 'Approval', `Payroll run marked PAID by ${actor} — net disbursed ${run.totals?.totalNetPay}, journal ${run.journalEntryId}`);

      // Email payslips asynchronously — never block the payment response
      (async () => {
        for (const emp of run.employees) {
          try {
            const employeeDoc = await Employee.findById(emp.id).lean();
            if (employeeDoc?.email) {
              await sendPayslipEmail(employeeDoc, run, emp);
            }
          } catch (mailErr) {
            console.error(`Payslip email failed for ${emp.name}:`, mailErr);
          }
        }
      })();

      return res.json({ success: true, run, journalEntryId: run.journalEntryId });
    }

    if (status === 'approved') {
      await auditPayroll(req, 'Approval', `Payroll run APPROVED by ${actor} — ${run.totals?.totalNetPay} net`);
    }
    if (status === 'cancelled') {
      await auditPayroll(req, 'Approval', `Payroll run CANCELLED by ${actor}`, 'Warning');
    }

    await run.save();
    res.json({ success: true, run });
  } catch (err) {
    console.error('Error updating payroll status:', err);
    res.status(400).json({ success: false, message: 'Error updating status', error: err.message });
  }
});

// GET payslips — admins see all; regular users see only their own
router.get('/payslips', async (req, res) => {
  try {
    const isAdmin = PAYROLL_ADMIN_ROLES.includes(req.user.role);
    const query = { status: 'paid' };

    let employeeObjectId = null;
    if (!isAdmin) {
      const employee = await Employee.findOne({ userRef: req.user._id }).lean();
      if (!employee) return res.json({ success: true, data: [] });
      employeeObjectId = employee._id;
      query['employees.id'] = employeeObjectId;
    }

    const runs = await PayrollRun.find(query).sort({ paidAt: -1 }).lean();

    const payslips = [];
    for (const run of runs) {
      const rows = isAdmin
        ? run.employees
        : run.employees.filter((e) => String(e.id) === String(employeeObjectId));
      for (const emp of rows) {
        payslips.push({
          runId: run._id,
          period: run.period,
          employee: emp,
          deductionsConfig: run.deductions,
          paidAt: run.paidAt,
        });
      }
    }

    res.json({ success: true, data: payslips });
  } catch (err) {
    console.error('Error fetching payslips:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch payslips' });
  }
});

// GET single payslip detail — admin or the employee who owns it
router.get('/payslips/:runId/:employeeId', async (req, res) => {
  try {
    const run = await PayrollRun.findById(req.params.runId).lean();
    if (!run) return res.status(404).json({ success: false, message: 'Payroll run not found' });

    const isAdmin = PAYROLL_ADMIN_ROLES.includes(req.user.role);
    if (!isAdmin) {
      const employee = await Employee.findOne({ userRef: req.user._id }).lean();
      if (!employee || String(employee._id) !== String(req.params.employeeId)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const slip = run.employees.find((e) => String(e.id) === String(req.params.employeeId));
    if (!slip) return res.status(404).json({ success: false, message: 'Payslip not found' });

    res.json({
      success: true,
      data: { runId: run._id, period: run.period, employee: slip, deductionsConfig: run.deductions, paidAt: run.paidAt },
    });
  } catch (err) {
    console.error('Error fetching payslip:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch payslip' });
  }
});

// GET bank transfer file (CSV) for an approved/paid run — Admin only
router.get('/runs/:id/bank-file', checkSecurityRole(PAYROLL_ADMIN_ROLES), async (req, res) => {
  try {
    const run = await PayrollRun.findById(req.params.id).lean();
    if (!run) return res.status(404).json({ success: false, message: 'Not found' });
    if (!['approved', 'paid'].includes(run.status)) {
      return res.status(400).json({ success: false, message: 'Bank file is only available for approved or paid runs' });
    }

    const rows = [['Employee Name', 'Department', 'Net Pay', 'Period']];
    for (const emp of run.employees) {
      rows.push([
        `"${emp.name}"`,
        `"${emp.department || ''}"`,
        emp.netPay,
        `${run.period?.year}-${String((run.period?.month ?? 0) + 1).padStart(2, '0')}`,
      ]);
    }
    rows.push(['"TOTAL"', '', run.totals?.totalNetPay || 0, '']);

    const csv = rows.map((r) => r.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=payroll-${run.period?.year}-${String((run.period?.month ?? 0) + 1).padStart(2, '0')}.csv`);
    res.send(csv);
  } catch (err) {
    console.error('Error generating bank file:', err);
    res.status(500).json({ success: false, message: 'Failed to generate bank file' });
  }
});

module.exports = router;
