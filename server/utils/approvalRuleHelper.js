const ApprovalRule = require('../models/ApprovalRule');

/**
 * Find matching approval rule for a request
 * @param {String} moduleType - The type of request module (e.g., 'Material Requests', 'Advance Requests')
 * @param {Object} requestData - The request data to evaluate conditions against
 * @returns {Object|null} - The matching approval rule or null
 */
async function findMatchingApprovalRule(moduleType, requestData) {
  try {
    // Find all active rules for this module type
    const rules = await ApprovalRule.find({
      moduleType,
      status: 'Active'
    }).sort({ createdAt: -1 }); // Most recent first

    if (!rules || rules.length === 0) {
      return null;
    }

    // Check each rule to find the first match
    for (const rule of rules) {
      if (evaluateConditions(rule.condition, requestData)) {
        return rule;
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding approval rule:', error);
    return null;
  }
}

/**
 * Evaluate if request data matches rule conditions
 * @param {Array} conditions - Array of condition strings
 * @param {Object} requestData - The request data
 * @returns {Boolean} - True if conditions match
 */
function evaluateConditions(conditions, requestData) {
  // If no conditions or "All Requests", always match
  if (!conditions || conditions.length === 0 || conditions.includes('All Requests')) {
    return true;
  }

  // Evaluate each condition
  for (const condition of conditions) {
    if (condition === 'All Requests') {
      return true;
    }
    
    // Amount-based conditions
    if (condition === 'Amount > 1000' && requestData.amount > 1000) {
      return true;
    }
    if (condition === 'Amount > 5000' && requestData.amount > 5000) {
      return true;
    }

    // Duration-based conditions (for travel/leave requests)
    if (condition === 'Duration > 2 Days' && requestData.duration > 2) {
      return true;
    }
    if (condition === 'Duration > 5 Days' && requestData.duration > 5) {
      return true;
    }

    // Policy-based conditions
    if (condition === 'Out of Policy' && requestData.outOfPolicy === true) {
      return true;
    }
  }

  return false;
}

/**
 * Get role-based approver for a request
 * @param {String} approverRole - Role name (e.g., 'Direct Manager', 'Department Head')
 * @param {Object} requestData - Request data containing employee info
 * @returns {Object} - Approver info {id, name, email, role}
 */
async function getApproverByRole(approverRole, requestData) {
  const Employee = require('../models/Employee');
  const User = require('../models/User');

  try {
    let approver = null;

    switch (approverRole) {
      case 'Direct Manager':
        // Get employee's direct manager
        if (requestData.employeeId) {
          const employee = await Employee.findOne({ employeeId: requestData.employeeId });
          if (employee && employee.managerId) {
            const manager = await Employee.findOne({ employeeId: employee.managerId });
            if (manager) {
              approver = {
                id: manager.employeeId,
                name: manager.fullName,
                email: manager.email,
                role: 'Direct Manager'
              };
            }
          }
        }
        break;

      case 'Department Head':
        // Find department head for the request's department
        if (requestData.department) {
          const deptHead = await Employee.findOne({
            department: requestData.department,
            position: { $regex: /head|director|manager/i }
          }).sort({ position: 1 });
          
          if (deptHead) {
            approver = {
              id: deptHead.employeeId,
              name: deptHead.fullName,
              email: deptHead.email,
              role: 'Department Head'
            };
          }
        }
        break;

      case 'Finance Manager': {
        // Find user with Finance Manager role
        const financeManager = await User.findOne({ role: 'Finance' });
        if (financeManager) {
          approver = {
            id: financeManager._id,
            name: financeManager.fullName,
            email: financeManager.email,
            role: 'Finance Manager'
          };
        }
        break;
      }

      case 'HR Director': {
        // Find user with HR Director role
        const hrDirector = await User.findOne({ role: 'HR' });
        if (hrDirector) {
          approver = {
            id: hrDirector._id,
            name: hrDirector.fullName,
            email: hrDirector.email,
            role: 'HR Director'
          };
        }
        break;
      }

      case 'Admin': {
        // Find admin user
        const admin = await User.findOne({ role: 'Admin' });
        if (admin) {
          approver = {
            id: admin._id,
            name: admin.fullName,
            email: admin.email,
            role: 'Admin'
          };
        }
        break;
      }
    }

    return approver;
  } catch (error) {
    console.error('Error getting approver by role:', error);
    return null;
  }
}

/**
 * Build approval chain for a request based on matching rule
 * @param {String} moduleType - The module type
 * @param {Object} requestData - The request data
 * @returns {Object} - { rule, approvalChain: [{level, approver, status}] }
 */
async function buildApprovalChain(moduleType, requestData) {
  try {
    const rule = await findMatchingApprovalRule(moduleType, requestData);
    
    if (!rule) {
      return {
        rule: null,
        approvalChain: [],
        usesRuleBasedApproval: false
      };
    }

    // Build approval chain from rule levels
    const approvalChain = [];
    
    for (const level of rule.levels) {
      const approver = await getApproverByRole(level.approverRole, requestData);
      
      if (approver) {
        approvalChain.push({
          level: level.level,
          approverRole: level.approverRole,
          approverId: approver.id,
          approverName: approver.name,
          approverEmail: approver.email,
          status: level.level === 1 ? 'pending' : 'awaiting', // First level is pending, others await
          approvedAt: null,
          comments: ''
        });
      } else {
        console.warn(`Could not find approver for role: ${level.approverRole}`);
      }
    }

    return {
      rule,
      approvalChain,
      usesRuleBasedApproval: true,
      currentApprovalLevel: 1
    };
  } catch (error) {
    console.error('Error building approval chain:', error);
    return {
      rule: null,
      approvalChain: [],
      usesRuleBasedApproval: false
    };
  }
}

module.exports = {
  findMatchingApprovalRule,
  evaluateConditions,
  getApproverByRole,
  buildApprovalChain
};
