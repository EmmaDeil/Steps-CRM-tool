/* eslint-disable */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Customer = require('../models/Customer');
const SalesOrder = require('../models/SalesOrder');
const InventoryItem = require('../models/InventoryItem');
const StockMovement = require('../models/StockMovement');
const Invoice = require('../models/Invoice');
const { authMiddleware } = require('../middleware/auth');
const { consumeBatchesFIFO, syncItemQuantityAndDates } = require('../utils/inventoryBatchUtils');

// Helper to generate sequential Customer ID (e.g. CUST-00001)
async function generateCustomerId() {
  const last = await Customer.findOne({ customerId: /^CUST-\d+$/ })
    .sort({ customerId: -1 })
    .select('customerId')
    .lean();
  if (!last) return 'CUST-00001';
  const num = parseInt(last.customerId.replace('CUST-', ''), 10);
  return `CUST-${String(num + 1).padStart(5, '0')}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/sales/customers
router.get('/customers', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, type } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const query = { isDeleted: false };
    if (type && type !== 'all') query.type = type;
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { customerId: regex },
        { name: regex },
        { email: regex },
        { phone: regex },
        { contactPerson: regex },
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Customer.countDocuments(query),
    ]);

    res.json({
      customers,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ message: 'Failed to fetch customers', error: err.message });
  }
});

// GET /api/sales/customers/:id
router.get('/customers/:id', authMiddleware, async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, isDeleted: false }).lean();
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch customer', error: err.message });
  }
});

// POST /api/sales/customers
router.post('/customers', authMiddleware, async (req, res) => {
  try {
    const { name, type, email, phone, address, contactPerson, taxId, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Customer name is required' });
    }

    const customerId = await generateCustomerId();
    const customer = new Customer({
      customerId,
      name: name.trim(),
      type: type === 'individual' ? 'individual' : 'business',
      email: email ? email.trim().toLowerCase() : '',
      phone: phone ? phone.trim() : '',
      address: address ? address.trim() : '',
      contactPerson: contactPerson ? contactPerson.trim() : '',
      taxId: taxId ? taxId.trim() : '',
      notes: notes || '',
      createdBy: req.user?._id || null,
    });

    await customer.save();
    res.status(201).json({ message: 'Customer created successfully', data: customer });
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ message: 'Failed to create customer', error: err.message });
  }
});

// PUT /api/sales/customers/:id
router.put('/customers/:id', authMiddleware, async (req, res) => {
  try {
    const { name, type, email, phone, address, contactPerson, taxId, notes } = req.body;
    const customer = await Customer.findOne({ _id: req.params.id, isDeleted: false });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    if (name) customer.name = name.trim();
    if (type) customer.type = type;
    if (email !== undefined) customer.email = email.trim().toLowerCase();
    if (phone !== undefined) customer.phone = phone.trim();
    if (address !== undefined) customer.address = address.trim();
    if (contactPerson !== undefined) customer.contactPerson = contactPerson.trim();
    if (taxId !== undefined) customer.taxId = taxId.trim();
    if (notes !== undefined) customer.notes = notes;

    await customer.save();
    res.json({ message: 'Customer updated successfully', data: customer });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update customer', error: err.message });
  }
});

// DELETE /api/sales/customers/:id (Soft-delete)
router.delete('/customers/:id', authMiddleware, async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, isDeleted: false });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    customer.isDeleted = true;
    customer.deletedAt = new Date();
    customer.deletedBy = req.user?._id || null;
    await customer.save();

    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete customer', error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// SALES ORDERS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/sales/orders
router.get('/orders', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, customerId, paymentStatus } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (paymentStatus && paymentStatus !== 'all') query.paymentStatus = paymentStatus;
    if (customerId && mongoose.isValidObjectId(customerId)) query.customerId = customerId;
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { orderNumber: regex },
        { customerName: regex },
        { 'lineItems.itemName': regex },
      ];
    }

    const [orders, total] = await Promise.all([
      SalesOrder.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      SalesOrder.countDocuments(query),
    ]);

    res.json({
      orders,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error('Error fetching sales orders:', err);
    res.status(500).json({ message: 'Failed to fetch sales orders', error: err.message });
  }
});

// GET /api/sales/orders/:id
router.get('/orders/:id', authMiddleware, async (req, res) => {
  try {
    const order = await SalesOrder.findById(req.params.id)
      .populate('customerId')
      .populate('createdBy', 'firstName lastName email')
      .populate('fulfilledBy', 'firstName lastName')
      .populate('linkedInvoiceId', 'invoiceNumber status totalAmount')
      .lean();

    if (!order) return res.status(404).json({ message: 'Sales order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch sales order', error: err.message });
  }
});

// POST /api/sales/orders
router.post('/orders', authMiddleware, async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      lineItems,
      taxRate = 0,
      discount = 0,
      notes = '',
      dueDate = null,
      paymentMethod = '',
      status = 'draft',
    } = req.body;

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ message: 'Customer name is required' });
    }

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({ message: 'At least one line item is required' });
    }

    // Process & sanitize line items
    const resolvedLines = [];
    for (const item of lineItems) {
      const qty = Number(item.quantity);
      const price = Number(item.unitPrice);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ message: `Invalid quantity for item: ${item.itemName || 'Item'}` });
      }
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ message: `Invalid price for item: ${item.itemName || 'Item'}` });
      }

      resolvedLines.push({
        inventoryItemId: item.inventoryItemId || null,
        itemId: item.itemId || '',
        itemName: item.itemName.trim(),
        quantity: qty,
        unitPrice: price,
        totalPrice: Math.round(qty * price * 100) / 100,
        unit: item.unit || 'pcs',
        locationId: item.locationId || null,
        locationName: item.locationName || '',
      });
    }

    const order = new SalesOrder({
      customerId: customerId && mongoose.isValidObjectId(customerId) ? customerId : null,
      customerName: customerName.trim(),
      customerEmail: customerEmail ? customerEmail.trim() : '',
      customerPhone: customerPhone ? customerPhone.trim() : '',
      lineItems: resolvedLines,
      taxRate: Number(taxRate) || 0,
      discount: Number(discount) || 0,
      status: ['draft', 'confirmed'].includes(status) ? status : 'draft',
      paymentMethod: paymentMethod || '',
      dueDate: dueDate ? new Date(dueDate) : null,
      notes: notes || '',
      createdBy: req.user?._id || null,
      createdByName: req.user ? `${req.user.firstName} ${req.user.lastName}`.trim() : '',
      confirmedAt: status === 'confirmed' ? new Date() : null,
    });

    await order.save();
    res.status(201).json({ message: 'Sales order created successfully', data: order });
  } catch (err) {
    console.error('Error creating sales order:', err);
    res.status(500).json({ message: 'Failed to create sales order', error: err.message });
  }
});

// PUT /api/sales/orders/:id
router.put('/orders/:id', authMiddleware, async (req, res) => {
  try {
    const order = await SalesOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Sales order not found' });

    if (['fulfilled', 'invoiced', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ message: `Cannot modify an order with status "${order.status}"` });
    }

    const {
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      lineItems,
      taxRate,
      discount,
      notes,
      dueDate,
      paymentMethod,
    } = req.body;

    if (customerName) order.customerName = customerName.trim();
    if (customerEmail !== undefined) order.customerEmail = customerEmail.trim();
    if (customerPhone !== undefined) order.customerPhone = customerPhone.trim();
    if (customerId !== undefined) order.customerId = customerId && mongoose.isValidObjectId(customerId) ? customerId : null;
    if (taxRate !== undefined) order.taxRate = Number(taxRate) || 0;
    if (discount !== undefined) order.discount = Number(discount) || 0;
    if (notes !== undefined) order.notes = notes;
    if (dueDate !== undefined) order.dueDate = dueDate ? new Date(dueDate) : null;
    if (paymentMethod !== undefined) order.paymentMethod = paymentMethod;

    if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
      const resolvedLines = [];
      for (const item of lineItems) {
        const qty = Number(item.quantity);
        const price = Number(item.unitPrice);
        if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
          return res.status(400).json({ message: 'Invalid quantity or price in line items' });
        }
        resolvedLines.push({
          inventoryItemId: item.inventoryItemId || null,
          itemId: item.itemId || '',
          itemName: item.itemName.trim(),
          quantity: qty,
          unitPrice: price,
          totalPrice: Math.round(qty * price * 100) / 100,
          unit: item.unit || 'pcs',
          locationId: item.locationId || null,
          locationName: item.locationName || '',
        });
      }
      order.lineItems = resolvedLines;
    }

    await order.save();
    res.json({ message: 'Sales order updated successfully', data: order });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update sales order', error: err.message });
  }
});

// POST /api/sales/orders/:id/confirm
router.post('/orders/:id/confirm', authMiddleware, async (req, res) => {
  try {
    const order = await SalesOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Sales order not found' });
    if (order.status !== 'draft') {
      return res.status(400).json({ message: `Order cannot be confirmed from status "${order.status}"` });
    }

    order.status = 'confirmed';
    order.confirmedAt = new Date();
    await order.save();

    res.json({ message: 'Sales order confirmed', data: order });
  } catch (err) {
    res.status(500).json({ message: 'Failed to confirm order', error: err.message });
  }
});

// POST /api/sales/orders/:id/fulfill
// ── Core Inventory Integration: Deduct stock FIFO, update stockLevels, log StockMovement ──
router.post('/orders/:id/fulfill', authMiddleware, async (req, res) => {
  try {
    const order = await SalesOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Sales order not found' });

    if (order.status === 'fulfilled' || order.status === 'invoiced') {
      return res.status(400).json({ message: 'Order is already fulfilled' });
    }
    if (order.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot fulfill a cancelled order' });
    }

    // Step 1: Pre-validation - Ensure all inventory-linked items have sufficient stock
    for (const li of order.lineItems) {
      if (!li.inventoryItemId) continue;
      const item = await InventoryItem.findOne({ _id: li.inventoryItemId, isDeleted: false });
      if (!item) {
        return res.status(404).json({ message: `Inventory item "${li.itemName}" not found` });
      }
      if (item.quantity < li.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${item.name}". Required: ${li.quantity}, Available: ${item.quantity}`,
        });
      }
    }

    // Step 2: Deduct stock from InventoryItem batches and stockLevels, log movements
    const movements = [];
    for (const li of order.lineItems) {
      if (!li.inventoryItemId) continue;
      const item = await InventoryItem.findOne({ _id: li.inventoryItemId, isDeleted: false });
      if (!item) continue;

      const prevQty = item.quantity;
      const consumeResult = consumeBatchesFIFO(item, li.quantity, {
        locationName: li.locationName || undefined,
      });

      if (consumeResult.remaining > 0) {
        return res.status(400).json({
          message: `Stock consumption error for "${item.name}". Unable to allocate full quantity.`,
        });
      }

      // Deduct from stockLevels if matched location or first stockLevel
      if (item.stockLevels && item.stockLevels.length > 0) {
        let deductedRemaining = li.quantity;
        if (li.locationName) {
          const locLevel = item.stockLevels.find(
            (sl) => String(sl.locationName).toLowerCase() === String(li.locationName).toLowerCase()
          );
          if (locLevel) {
            const take = Math.min(locLevel.quantity, deductedRemaining);
            locLevel.quantity -= take;
            deductedRemaining -= take;
          }
        }
        if (deductedRemaining > 0) {
          for (const sl of item.stockLevels) {
            if (deductedRemaining <= 0) break;
            const take = Math.min(sl.quantity, deductedRemaining);
            sl.quantity -= take;
            deductedRemaining -= take;
          }
        }
      }

      syncItemQuantityAndDates(item);
      await item.save();

      // Log StockMovement audit record
      movements.push({
        inventoryItemId: item._id,
        type: 'sales',
        quantityChange: -li.quantity,
        previousQuantity: prevQty,
        newQuantity: item.quantity,
        fromLocationName: li.locationName || item.location || '',
        performedBy: req.user?._id || null,
        notes: `Fulfilled Sales Order #${order.orderNumber} for ${order.customerName}`,
      });
    }

    if (movements.length > 0) {
      await StockMovement.insertMany(movements);
    }

    // Step 3: Update Sales Order status
    order.status = 'fulfilled';
    order.fulfilledAt = new Date();
    order.fulfilledBy = req.user?._id || null;
    order.fulfilledByName = req.user ? `${req.user.firstName} ${req.user.lastName}`.trim() : '';

    await order.save();

    res.json({
      message: 'Sales order fulfilled successfully and inventory stock deducted',
      data: order,
    });
  } catch (err) {
    console.error('Error fulfilling sales order:', err);
    res.status(500).json({ message: 'Failed to fulfill sales order', error: err.message });
  }
});

// POST /api/sales/orders/:id/generate-invoice
router.post('/orders/:id/generate-invoice', authMiddleware, async (req, res) => {
  try {
    const order = await SalesOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Sales order not found' });
    if (order.linkedInvoiceId) {
      return res.status(400).json({ message: 'An invoice has already been generated for this order' });
    }

    const { paymentTerms = 'Net 30', notes = '' } = req.body;

    const invoiceLines = order.lineItems.map((li) => ({
      description: li.itemName,
      qty: li.quantity,
      unitPrice: li.unitPrice,
      totalPrice: li.totalPrice,
      inventoryItemId: li.inventoryItemId || null,
    }));

    const invoice = new Invoice({
      billTo: order.customerName,
      billToType: 'external',
      lineItems: invoiceLines,
      taxRate: order.taxRate || 0,
      dueDate: order.dueDate || null,
      paymentTerms,
      notes: notes || order.notes || `Generated from Sales Order ${order.orderNumber}`,
      status: 'draft',
      generatedBy: req.user?._id || null,
      generatedByName: req.user ? `${req.user.firstName} ${req.user.lastName}`.trim() : '',
    });

    await invoice.save();

    order.linkedInvoiceId = invoice._id;
    if (order.status !== 'fulfilled') {
      order.status = 'invoiced';
    }
    await order.save();

    res.status(201).json({
      message: 'Invoice created and linked successfully',
      data: { order, invoice },
    });
  } catch (err) {
    console.error('Error generating invoice from sales order:', err);
    res.status(500).json({ message: 'Failed to generate invoice', error: err.message });
  }
});

// POST /api/sales/orders/:id/cancel
router.post('/orders/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const order = await SalesOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Sales order not found' });

    if (order.status === 'fulfilled') {
      return res.status(400).json({ message: 'Cannot cancel an order that has already been fulfilled' });
    }
    if (order.status === 'cancelled') {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = req.body.reason || 'Cancelled by user';
    await order.save();

    res.json({ message: 'Sales order cancelled', data: order });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel order', error: err.message });
  }
});

// POST /api/sales/orders/:id/record-payment
router.post('/orders/:id/record-payment', authMiddleware, async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    const order = await SalesOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Sales order not found' });

    const payAmt = Number(amount);
    if (isNaN(payAmt) || payAmt <= 0) {
      return res.status(400).json({ message: 'Valid payment amount is required' });
    }

    order.paidAmount = (order.paidAmount || 0) + payAmt;
    if (paymentMethod) order.paymentMethod = paymentMethod;

    if (order.paidAmount >= order.totalAmount) {
      order.paymentStatus = 'paid';
      order.paidAt = new Date();
    } else {
      order.paymentStatus = 'partial';
    }

    await order.save();
    res.json({ message: 'Payment recorded', data: order });
  } catch (err) {
    res.status(500).json({ message: 'Failed to record payment', error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// STATS & METRICS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/sales/stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const [totalOrders, fulfilledOrders, confirmedOrders, draftOrders, totalCustomers] =
      await Promise.all([
        SalesOrder.countDocuments(),
        SalesOrder.countDocuments({ status: 'fulfilled' }),
        SalesOrder.countDocuments({ status: 'confirmed' }),
        SalesOrder.countDocuments({ status: 'draft' }),
        Customer.countDocuments({ isDeleted: false }),
      ]);

    // Aggregate total revenue and paid amounts
    const revenueAgg = await SalesOrder.aggregate([
      { $match: { status: { $nin: ['cancelled'] } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
        },
      },
    ]);

    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
    const totalPaid = revenueAgg[0]?.totalPaid || 0;

    // Recent orders
    const recentOrders = await SalesOrder.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderNumber customerName totalAmount status paymentStatus createdAt')
      .lean();

    // Top selling items
    const topItemsAgg = await SalesOrder.aggregate([
      { $match: { status: { $in: ['confirmed', 'fulfilled', 'invoiced'] } } },
      { $unwind: '$lineItems' },
      {
        $group: {
          _id: '$lineItems.itemName',
          totalQty: { $sum: '$lineItems.quantity' },
          totalSales: { $sum: '$lineItems.totalPrice' },
        },
      },
      { $sort: { totalSales: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      stats: {
        totalOrders,
        fulfilledOrders,
        confirmedOrders,
        draftOrders,
        totalCustomers,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        unpaidAmount: Math.round(Math.max(0, totalRevenue - totalPaid) * 100) / 100,
      },
      recentOrders,
      topItems: topItemsAgg.map((item) => ({
        name: item._id,
        quantity: item.totalQty,
        revenue: Math.round(item.totalSales * 100) / 100,
      })),
    });
  } catch (err) {
    console.error('Error fetching sales stats:', err);
    res.status(500).json({ message: 'Failed to fetch sales stats', error: err.message });
  }
});

module.exports = router;
