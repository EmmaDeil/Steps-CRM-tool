const { body, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

// Common validation rules
const validationRules = {
  email: body('to').isEmail().normalizeEmail(),
  employeeName: body('employeeName').trim().notEmpty().withMessage('Employee name is required'),
  employeeId: body('employeeId').trim().notEmpty().withMessage('Employee ID is required'),
  department: body('department').trim().notEmpty().withMessage('Department is required'),
  amount: body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  approver: body('approver').trim().notEmpty().withMessage('Approver name is required'),
  approverEmail: body('approverEmail').isEmail().normalizeEmail(),
  reason: body('reason').trim().notEmpty().isLength({ min: 5 }).withMessage('Reason must be at least 5 characters'),
  repaymentPeriod: body('repaymentPeriod').trim().notEmpty().withMessage('Repayment period is required'),
};

module.exports = {
  validate,
  validationRules,
};
