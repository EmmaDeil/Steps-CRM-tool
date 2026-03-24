/* eslint-disable */
const express = require('express');
const router = express.Router();
const InventoryIssue = require('../models/InventoryIssue');
const InventoryItem  = require('../models/InventoryItem');
const Invoice        = require('../models/Invoice');
const { authMiddleware } = require('../middleware/auth');
const { requireModuleAction } = require('../middleware/moduleAccess');
const { consumeBatchesFIFO, syncItemQuantityAndDates } = require('../utils/inventoryBatchUtils');

// ── GET all issues (paginated, filterable) ──────────────────────────────────
router.get('/', authMiddleware, requireModuleAction('inventory', 'view'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { issueNumber: { $regex: search, $options: 'i' } },
        { issuedTo:    { $regex: search, $options: 'i' } },
        { issuedByName:{ $regex: search, $options: 'i' } },
      ];
    }

    const [issues, total] = await Promise.all([
      InventoryIssue.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      InventoryIssue.countDocuments(query),
    ]);

    res.json({ issues, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error('Error fetching inventory issues:', err);
    res.status(500).json({ message: 'Failed to fetch inventory issues' });
  }
});

// ── GET single issue ────────────────────────────────────────────────────────
router.get('/:id', authMiddleware, requireModuleAction('inventory', 'view'), async (req, res) => {
  try {
    const issue = await InventoryIssue.findById(req.params.id)
      .populate('issuedBy', 'firstName lastName')
      .populate('invoiceId', 'invoiceNumber status totalAmount');
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    res.json(issue);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch issue' });
  }
});

// ── POST create a manual inventory issue ────────────────────────────────────
router.post('/', authMiddleware, requireModuleAction('inventory', 'create'), async (req, res) => {
  try {
    const { issuedTo, issuedToType, lineItems, notes } = req.body;
    if (!issuedTo) return res.status(400).json({ message: 'issuedTo is required' });
    if (!lineItems || lineItems.length === 0) return res.status(400).json({ message: 'At least one line item is required' });

    // Deduct stock from inventory and build line items
    const resolvedLines = [];
    for (const li of lineItems) {
      const item = await InventoryItem.findById(li.inventoryItemId);
      if (!item) return res.status(404).json({ message: `Item ${li.inventoryItemId} not found` });
      const availableBefore = item.quantity;
      const consumeResult = consumeBatchesFIFO(item, li.qty);
      if (consumeResult.remaining > 0) {
        return res.status(400).json({ message: `Insufficient stock for "${item.name}": ${availableBefore} available, ${li.qty} requested` });
      }
      syncItemQuantityAndDates(item);
      await item.save();

      const unitPrice  = li.unitPrice ?? item.unitPrice ?? 0;
      resolvedLines.push({
        inventoryItemId: item._id,
        itemName:  item.name,
        itemCode:  item.itemId,
        unit:      item.unit || 'pcs',
        qty:       li.qty,
        unitPrice,
        totalPrice: unitPrice * li.qty,
        notes: li.notes || '',
      });
    }

    const issue = new InventoryIssue({
      issuedTo,
      issuedToType: issuedToType || 'other',
      issuedBy:     req.user?._id,
      issuedByName: req.user ? `${req.user.firstName} ${req.user.lastName}` : '',
      lineItems:    resolvedLines,
      notes:        notes || '',
    });

    await issue.save();
    res.status(201).json({ message: 'Stock issued successfully', data: issue });
  } catch (err) {
    console.error('Error creating inventory issue:', err);
    res.status(500).json({ message: 'Failed to create inventory issue', error: err.message });
  }
});

// ── POST generate invoice from issue ───────────────────────────────────────
router.post('/:id/generate-invoice', authMiddleware, requireModuleAction('inventory', 'approve'), async (req, res) => {
  try {
    const issue = await InventoryIssue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    if (issue.status === 'invoiced') return res.status(400).json({ message: 'Invoice already generated for this issue' });
    if (issue.status === 'cancelled') return res.status(400).json({ message: 'Cannot generate invoice for a cancelled issue' });

    const { taxRate = 0, dueDate, notes, paymentTerms = 'Net 30' } = req.body;

    const invoice = new Invoice({
      billTo:      issue.issuedTo,
      billToType:  issue.issuedToType,
      lineItems:   issue.lineItems.map(li => ({
        description: `${li.itemName} (${li.itemCode || li.itemName})`,
        qty:         li.qty,
        unitPrice:   li.unitPrice,
        totalPrice:  li.totalPrice,
        inventoryItemId: li.inventoryItemId,
      })),
      taxRate:       Number(taxRate),
      dueDate:       dueDate ? new Date(dueDate) : null,
      notes:         notes || issue.notes,
      paymentTerms,
      linkedIssueId:   issue._id,
      generatedBy:     req.user?._id,
      generatedByName: req.user ? `${req.user.firstName} ${req.user.lastName}` : '',
    });

    await invoice.save();

    // Update the issue
    issue.invoiceId = invoice._id;
    issue.status = 'invoiced';
    await issue.save();

    res.status(201).json({
      message: 'Invoice generated successfully',
      data: invoice,
      printUrl: `/api/invoices/${invoice._id}/print`,
    });
  } catch (err) {
    console.error('Error generating invoice:', err);
    res.status(500).json({ message: 'Failed to generate invoice', error: err.message });
  }
});

// ── DELETE / cancel an issue ────────────────────────────────────────────────
router.post('/:id/cancel', authMiddleware, requireModuleAction('inventory', 'delete'), async (req, res) => {
  try {
    const issue = await InventoryIssue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    if (issue.status === 'invoiced') return res.status(400).json({ message: 'Cannot cancel — invoice already generated' });
    issue.status = 'cancelled';
    await issue.save();
    res.json({ message: 'Issue cancelled', data: issue });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel issue' });
  }
});

module.exports = router;
