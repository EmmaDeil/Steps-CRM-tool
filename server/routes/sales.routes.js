const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal');
const Invoice = require('../models/Invoice');
const InventoryItem = require('../models/InventoryItem');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// ─────────────────────────────────────────────────────────────────────────────
// DEALS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/sales/deals
router.get('/deals', async (req, res) => {
  try {
    const deals = await Deal.find().sort({ createdAt: -1 }).lean();

    const totalDeals     = deals.length;
    const wonDeals       = deals.filter(d => d.stage === 'won');
    const wonValue       = wonDeals.reduce((s, d) => s + (d.totalRevenue || d.value || 0), 0);
    const activeDeals    = deals.filter(d => !['won', 'lost'].includes(d.stage));
    const pipelineValue  = activeDeals.reduce((s, d) => s + (d.totalRevenue || d.value || 0), 0);
    const conversionRate = totalDeals > 0 ? Math.round((wonDeals.length / totalDeals) * 100) : 0;
    const totalRevenue   = deals.reduce((s, d) => s + (d.totalRevenue || d.value || 0), 0);

    res.json({
      deals,
      stats: { totalDeals, wonValue, pipelineValue, conversionRate, activeCount: activeDeals.length, totalRevenue },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sales/deals
router.post('/deals', async (req, res) => {
  try {
    const { title, value, stage, customerName, customerEmail, customerPhone, assignedRep, closeDate, notes } = req.body;
    const deal = new Deal({
      title,
      value: Number(value) || 0,
      stage: stage || 'lead',
      customerName,
      customerEmail,
      customerPhone,
      assignedRep: assignedRep || req.user?.fullName || 'Sales Agent',
      closeDate: closeDate ? new Date(closeDate) : undefined,
      notes: notes || '',
    });
    await deal.save();
    res.status(201).json(deal);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/sales/deals/:id  — update general fields (stage, customer info, etc.)
router.patch('/deals/:id', async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    const { stage, value, title, customerName, customerEmail, customerPhone, assignedRep, closeDate, notes } = req.body;
    if (stage !== undefined)         deal.stage         = stage;
    if (value !== undefined)         deal.value         = Number(value) || 0;
    if (title !== undefined)         deal.title         = title;
    if (customerName !== undefined)  deal.customerName  = customerName;
    if (customerEmail !== undefined) deal.customerEmail = customerEmail;
    if (customerPhone !== undefined) deal.customerPhone = customerPhone;
    if (assignedRep !== undefined)   deal.assignedRep   = assignedRep;
    if (closeDate !== undefined)     deal.closeDate     = new Date(closeDate);
    if (notes !== undefined)         deal.notes         = notes;

    deal.updatedAt = new Date();
    await deal.save();
    res.json(deal);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/sales/deals/:id
router.delete('/deals/:id', async (req, res) => {
  try {
    const deal = await Deal.findByIdAndDelete(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    res.json({ message: 'Deal deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY PICKER  (for the item-selector in a deal)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/sales/inventory-items?search=&page=1&limit=40
router.get('/inventory-items', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 40 } = req.query;
    const filter = { isDeleted: false, quantity: { $gt: 0 } };
    if (search.trim()) {
      filter.$or = [
        { name:     { $regex: search.trim(), $options: 'i' } },
        { itemId:   { $regex: search.trim(), $options: 'i' } },
        { category: { $regex: search.trim(), $options: 'i' } },
      ];
    }
    const items = await InventoryItem.find(filter)
      .select('itemId name category unit unitPrice quantity location')
      .sort({ name: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DEAL LINE ITEMS  (inventory items + profit calculation)
// ─────────────────────────────────────────────────────────────────────────────

// PATCH /api/sales/deals/:id/line-items
router.patch('/deals/:id/line-items', async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    const raw = Array.isArray(req.body.lineItems) ? req.body.lineItems : [];

    const computed = raw.map(li => {
      const qty          = Math.max(1, Number(li.qty) || 1);
      const costPrice    = Math.max(0, Number(li.costPrice) || 0);
      const sellingPrice = Math.max(0, Number(li.sellingPrice) || 0);
      return {
        inventoryItemId: li.inventoryItemId || null,
        itemName:     String(li.itemName || '').trim(),
        itemCode:     String(li.itemCode || '').trim(),
        unit:         String(li.unit || 'pcs').trim(),
        qty,
        costPrice,
        sellingPrice,
        lineRevenue:  Math.round(qty * sellingPrice * 100) / 100,
        lineCost:     Math.round(qty * costPrice    * 100) / 100,
        lineProfit:   Math.round(qty * (sellingPrice - costPrice) * 100) / 100,
      };
    });

    const totalRevenue = Math.round(computed.reduce((s, li) => s + li.lineRevenue, 0) * 100) / 100;
    const totalCost    = Math.round(computed.reduce((s, li) => s + li.lineCost,    0) * 100) / 100;
    const totalProfit  = Math.round((totalRevenue - totalCost) * 100) / 100;
    const profitMargin = totalRevenue > 0
      ? Math.round((totalProfit / totalRevenue) * 10000) / 100
      : 0;

    deal.lineItems    = computed;
    deal.totalRevenue = totalRevenue;
    deal.totalCost    = totalCost;
    deal.totalProfit  = totalProfit;
    deal.profitMargin = profitMargin;
    deal.value        = totalRevenue; // keep deal.value in sync
    deal.updatedAt    = new Date();
    await deal.save();
    res.json(deal);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE GENERATION  (from a deal's line items)
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/sales/deals/:id/invoice
router.post('/deals/:id/invoice', async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal)                    return res.status(404).json({ error: 'Deal not found' });
    if (!deal.lineItems.length)   return res.status(400).json({ error: 'Add line items before generating an invoice' });
    if (deal.linkedInvoiceId) {
      // Return existing invoice
      const existing = await Invoice.findById(deal.linkedInvoiceId);
      if (existing) return res.json({ invoice: existing, deal, alreadyExists: true });
    }

    const { taxRate = 0, dueDate, paymentTerms = 'Net 30', notes = '' } = req.body;

    const lineItems = deal.lineItems.map(li => ({
      description:     li.itemName,
      qty:             li.qty,
      unitPrice:       li.sellingPrice,
      totalPrice:      li.lineRevenue,
      inventoryItemId: li.inventoryItemId || null,
    }));

    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const invoice = new Invoice({
      billTo:          deal.customerName,
      billToType:      'external',
      lineItems,
      taxRate:         Number(taxRate) || 0,
      dueDate:         dueDate ? new Date(dueDate) : thirtyDays,
      paymentTerms,
      notes,
      status:          'draft',
      linkedDealId:    deal._id,
      source:          'sales',
      generatedBy:     req.user?._id,
      generatedByName: req.user?.fullName || 'Sales',
    });
    await invoice.save();

    deal.linkedInvoiceId = invoice._id;
    deal.updatedAt       = new Date();
    await deal.save();

    res.status(201).json({ invoice, deal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// INVOICES  (list + status management)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/sales/invoices
router.get('/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.find({ source: 'sales' })
      .populate('linkedDealId', 'title stage customerName customerEmail assignedRep')
      .sort({ createdAt: -1 })
      .lean();
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/sales/invoices/:id/status
router.patch('/invoices/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['draft', 'sent', 'paid', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const wasPaid = invoice.status === 'paid';
    invoice.status = status;

    if (status === 'paid' && !wasPaid) {
      invoice.paidAt = new Date();
      // Deduct inventory stock for each line item now that sale is confirmed paid
      for (const li of invoice.lineItems) {
        if (li.inventoryItemId) {
          await InventoryItem.findByIdAndUpdate(li.inventoryItemId, {
            $inc: { quantity: -li.qty },
            $set: { lastUpdated: new Date() },
          });
        }
      }
    } else if (status !== 'paid') {
      invoice.paidAt = null;
    }

    await invoice.save();
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
