const express = require('express');
const router = express.Router();
const EmployeeModel = require('../models/Employee');
const UserModel = require('../models/User');
const crypto = require('crypto');

// ================= EMPLOYEES (Live DB) =================
router.get('/employees', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { department: { $regex: search, $options: 'i' } }
        ]
      };
    }
    const employees = await EmployeeModel.find(query).sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ message: 'Failed to fetch employees' });
  }
});

router.post('/employees', async (req, res) => {
  try {
    const { name, role, ...rest } = req.body;
    let firstName = req.body.firstName;
    let lastName = req.body.lastName;

    // Handle single 'name' payloads from frontend
    if (name && (!firstName || !lastName)) {
      const parts = name.split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ') || 'User';
    }

    // Check for duplicate email before creating
    const email = rest.email || req.body.email;
    if (email) {
      const existingEmp = await EmployeeModel.findOne({ email: email.toLowerCase ? email.toLowerCase() : email });
      if (existingEmp) {
        return res.status(400).json({ message: 'An employee with this email already exists' });
      }
    }

    // Map UI jobTitle to Role if available
    const appliedRole = role || req.body.jobTitle || 'Employee';

    const newEmp = await EmployeeModel.create({
      firstName: firstName || 'Unknown',
      lastName: lastName,
      role: appliedRole,
      ...rest
    });

    // Auto-create or link a corresponding User account
    try {
      const email = rest.email || req.body.email;
      if (email) {
        let existingUser = await UserModel.findOne({ email: email.toLowerCase() });
        if (existingUser) {
          // Link existing user to this employee
          existingUser.employeeRef = newEmp._id;
          if (!existingUser.department && rest.department) existingUser.department = rest.department;
          if (!existingUser.jobTitle && rest.jobTitle) existingUser.jobTitle = rest.jobTitle;
          if (!existingUser.phoneNumber && rest.phone) existingUser.phoneNumber = rest.phone;
          await existingUser.save();
          newEmp.userRef = existingUser._id;
          await newEmp.save();
        } else {
          // Create new user account with a random temp password
          const tempPassword = crypto.randomBytes(16).toString('hex');
          const newUser = await UserModel.create({
            firstName: firstName || 'Unknown',
            lastName: lastName || 'User',
            fullName: `${firstName || 'Unknown'} ${lastName || 'User'}`,
            email: email.toLowerCase(),
            password: tempPassword,
            role: 'user',
            status: 'Active',
            department: rest.department || null,
            jobTitle: rest.jobTitle || null,
            phoneNumber: rest.phone || null,
            employeeRef: newEmp._id,
          });
          newEmp.userRef = newUser._id;
          await newEmp.save();
        }
      }
    } catch (linkErr) {
      console.error('Error linking employee to user:', linkErr);
      // Don't fail the employee creation if user linking fails
    }

    res.status(201).json({ message: 'Created successfully', data: newEmp });
  } catch (err) {
    console.error('Error creating employee:', err);
    res.status(500).json({ message: 'Failed to create employee' });
  }
});

router.put('/employees/bulk-update', async (req, res) => {
  try {
    const { employeeIds, updates } = req.body;
    if (!employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({ success: false, message: 'Invalid employeeIds' });
    }
    
    const result = await EmployeeModel.updateMany(
      { _id: { $in: employeeIds } },
      { $set: { ...updates, updatedAt: new Date() } }
    );
    
    res.json({ success: true, message: 'Bulk update successful', modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error('Error in bulk update:', err);
    res.status(500).json({ success: false, message: 'Failed to perform bulk update' });
  }
});

router.put('/employees/:id', async (req, res) => {
  try {
    // If name is passed as part of the update, split it back out
    if (req.body.name && (!req.body.firstName || !req.body.lastName)) {
        const parts = req.body.name.split(' ');
        req.body.firstName = parts[0];
        req.body.lastName = parts.slice(1).join(' ') || 'User';
        delete req.body.name;
    }

    const updated = await EmployeeModel.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Employee not found' });

    // Sync shared fields to linked User account
    try {
      if (updated.userRef) {
        const syncData = {};
        if (req.body.firstName || req.body.lastName) {
          syncData.firstName = updated.firstName;
          syncData.lastName = updated.lastName;
          syncData.fullName = `${updated.firstName} ${updated.lastName}`;
        }
        if (req.body.email) syncData.email = req.body.email.toLowerCase();
        if (req.body.department) syncData.department = req.body.department;
        if (req.body.jobTitle) syncData.jobTitle = req.body.jobTitle;
        if (req.body.phone) syncData.phoneNumber = req.body.phone;
        if (Object.keys(syncData).length > 0) {
          await UserModel.findByIdAndUpdate(updated.userRef, syncData);
        }
      }
    } catch (syncErr) {
      console.error('Error syncing employee update to user:', syncErr);
    }

    res.json({ message: 'Updated successfully', data: updated });
  } catch (err) {
    console.error('Error updating employee:', err);
    res.status(500).json({ message: 'Failed to update employee' });
  }
});

router.delete('/employees/:id', async (req, res) => {
  try {
    const deleted = await EmployeeModel.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Employee not found' });

    // Also remove linked User account
    try {
      if (deleted.userRef) {
        await UserModel.findByIdAndDelete(deleted.userRef);
      }
    } catch (linkErr) {
      console.error('Error deleting linked user:', linkErr);
    }

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('Error deleting employee:', err);
    res.status(500).json({ message: 'Failed to delete employee' });
  }
});

// ================= MOCK ENDPOINTS FOR UI GRAPHS =================
// Provide realistic mock arrays so the graphs and UI don't break/404 out

router.get('/requisitions', (req, res) => {
  res.json([
    { id: 1, title: 'Senior React Developer', candidates: 12, progressPct: 65 },
    { id: 2, title: 'HR Manager', candidates: 4, progressPct: 20 },
  ]);
});

router.get('/analytics', (req, res) => {
  res.json({ 
    turnoverRates: [2.1, 2.5, 1.8, 1.2, 2.6, 2.0], 
    months: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], 
    newHires: 14 
  });
});

router.get('/leave-requests', (req, res) => {
  res.json([
    { id: 'lr1', name: 'Alice Smith', type: 'Annual', range: 'Oct 12 - Oct 15', status: 'pending' },
    { id: 'lr2', name: 'Bob Jones', type: 'Sick', range: 'Oct 02 - Oct 03', status: 'pending' },
  ]);
});

router.get('/performance', (req, res) => {
  res.json({ 
    q3CompletedPct: 88, 
    pending: { selfReviews: 4, managerReviews: 2 } 
  });
});

router.get('/training', (req, res) => {
  res.json([
    { id: 1, name: 'Security Awareness 2026', dueInDays: 3, completionPercent: 0, icon: 'shield' },
    { id: 2, name: 'Harassment Prevention', dueInDays: 12, completionPercent: 40, icon: 'user-shield' }
  ]);
});

router.get('/payroll-next', (req, res) => {
  res.json({ 
    date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(), 
    runApproved: false 
  });
});

router.get('/leave-allocations', (req, res) => {
  res.json([]);
});

router.post('/leave-requests/:id/approve', (req, res) => res.json({ message: 'Approved' }));
router.post('/leave-requests/:id/reject', (req, res) => res.json({ message: 'Rejected' }));

module.exports = router;
