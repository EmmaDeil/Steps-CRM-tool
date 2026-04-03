const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const AuditLog = require('../models/AuditLog');
const { authMiddleware } = require('../middleware/auth');

// All contact routes require authentication
router.use(authMiddleware);

// ============================================================
// GET /api/contacts
// Fetch all contacts with optional filtering and pagination
// ============================================================
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      category = '',
      status = '',
      sort = '-createdAt',
    } = req.query;

    const filter = {};

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (status && status !== 'All') {
      filter.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const pageLimit = Math.min(Number(limit), 100);

    const [contacts, total] = await Promise.all([
      Contact.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Contact.countDocuments(filter),
    ]);

    res.json({
      contacts,
      pagination: {
        total,
        page: Number(page),
        limit: pageLimit,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ message: 'Failed to fetch contacts' });
  }
});

// ============================================================
// GET /api/contacts/:id
// Fetch a specific contact by ID
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findById(id).lean();

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ message: 'Failed to fetch contact' });
  }
});

// ============================================================
// POST /api/contacts
// Create a new contact
// ============================================================
router.post('/', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      jobTitle,
      category,
      status,
      ...rest
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({
        message: 'firstName, lastName, email, and phone are required',
      });
    }

    // Check for duplicate email
    const existingContact = await Contact.findOne({ email: email.toLowerCase() });
    if (existingContact) {
      return res.status(400).json({
        message: 'A contact with this email already exists',
      });
    }

    const newContact = new Contact({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      company: company?.trim() || '',
      jobTitle: jobTitle?.trim() || '',
      category: category || 'Other',
      status: status || 'Active',
      createdBy: req.user.fullName || req.user.email,
      ...rest,
    });

    const savedContact = await newContact.save();

    // Log the action
    await AuditLog.create({
      actor: {
        userId: req.user._id.toString(),
        userName: req.user.fullName || req.user.email,
      },
      action: 'CREATE_CONTACT',
      resourceType: 'Contact',
      resourceId: savedContact._id.toString(),
      details: {
        email: savedContact.email,
        name: `${savedContact.firstName} ${savedContact.lastName}`,
      },
      status: 'SUCCESS',
      timestamp: new Date(),
    });

    res.status(201).json(savedContact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ message: 'Failed to create contact' });
  }
});

// ============================================================
// PUT /api/contacts/:id
// Update a specific contact
// ============================================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Prevent changing contactId
    delete updateData.contactId;

    // If email is being updated, check for duplicates
    if (updateData.email) {
      const existingContact = await Contact.findOne({
        email: updateData.email.toLowerCase(),
        _id: { $ne: id },
      });

      if (existingContact) {
        return res.status(400).json({
          message: 'A contact with this email already exists',
        });
      }
      updateData.email = updateData.email.toLowerCase().trim();
    }

    const updatedContact = await Contact.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedContact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    // Log the action
    await AuditLog.create({
      actor: {
        userId: req.user._id.toString(),
        userName: req.user.fullName || req.user.email,
      },
      action: 'UPDATE_CONTACT',
      resourceType: 'Contact',
      resourceId: id,
      details: {
        email: updatedContact.email,
        name: `${updatedContact.firstName} ${updatedContact.lastName}`,
      },
      status: 'SUCCESS',
      timestamp: new Date(),
    });

    res.json(updatedContact);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ message: 'Failed to update contact' });
  }
});

// ============================================================
// DELETE /api/contacts/:id
// Delete a specific contact
// ============================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedContact = await Contact.findByIdAndDelete(id);

    if (!deletedContact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    // Log the action
    await AuditLog.create({
      actor: {
        userId: req.user._id.toString(),
        userName: req.user.fullName || req.user.email,
      },
      action: 'DELETE_CONTACT',
      resourceType: 'Contact',
      resourceId: id,
      details: {
        email: deletedContact.email,
        name: `${deletedContact.firstName} ${deletedContact.lastName}`,
      },
      status: 'SUCCESS',
      timestamp: new Date(),
    });

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ message: 'Failed to delete contact' });
  }
});

// ============================================================
// GET /api/contacts/by-category/:category
// Fetch contacts by category
// ============================================================
router.get('/by-category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 50 } = req.query;

    const contacts = await Contact.find({ category, status: 'Active' })
      .limit(Number(limit))
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts by category:', error);
    res.status(500).json({ message: 'Failed to fetch contacts' });
  }
});

// ============================================================
// POST /api/contacts/bulk
// Bulk actions on contacts
// ============================================================
router.post('/bulk', async (req, res) => {
  try {
    const { action, contactIds, payload } = req.body;

    if (!action || !contactIds || contactIds.length === 0) {
      return res.status(400).json({
        message: 'action and contactIds are required',
      });
    }

    let result;

    if (action === 'delete') {
      result = await Contact.deleteMany({ _id: { $in: contactIds } });

      // Log bulk delete
      await AuditLog.create({
        actor: {
          userId: req.user._id.toString(),
          userName: req.user.fullName || req.user.email,
        },
        action: 'BULK_DELETE_CONTACTS',
        resourceType: 'Contact',
        details: {
          count: contactIds.length,
        },
        status: 'SUCCESS',
        timestamp: new Date(),
      });
    } else if (action === 'update') {
      result = await Contact.updateMany(
        { _id: { $in: contactIds } },
        { ...payload, updatedAt: new Date() }
      );

      // Log bulk update
      await AuditLog.create({
        actor: {
          userId: req.user._id.toString(),
          userName: req.user.fullName || req.user.email,
        },
        action: 'BULK_UPDATE_CONTACTS',
        resourceType: 'Contact',
        details: {
          count: contactIds.length,
          fields: Object.keys(payload),
        },
        status: 'SUCCESS',
        timestamp: new Date(),
      });
    } else {
      return res.status(400).json({
        message: 'Invalid bulk action type',
      });
    }

    res.json({
      message: `Bulk ${action} completed successfully`,
      result,
    });
  } catch (error) {
    console.error('Error in bulk operation:', error);
    res.status(500).json({ message: 'Failed to perform bulk operation' });
  }
});

module.exports = router;
