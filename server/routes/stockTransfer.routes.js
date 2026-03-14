/* eslint-disable */
const express = require('express');
const router = express.Router();
const StockTransfer = require('../models/StockTransfer');
const InventoryItem = require('../models/InventoryItem');
const StockMovement = require('../models/StockMovement');
const { authMiddleware } = require('../middleware/auth');
const {
  getStockAtLocation,
  updateStockLevel,
  generateWaybillNumber,
  buildWaybillHTML,
} = require('../utils/stockTransferHelpers');

// ── Routes ────────────────────────────────────────────────────────────────────

// GET all transfers (paginated)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, fromLocationId, toLocationId, search } = req.query;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (fromLocationId) query.fromLocationId = fromLocationId;
    if (toLocationId) query.toLocationId = toLocationId;
    if (search) {
      query.$or = [
        { transferNumber: { $regex: search, $options: 'i' } },
        { waybillNumber:  { $regex: search, $options: 'i' } },
        { fromLocationName: { $regex: search, $options: 'i' } },
        { toLocationName: { $regex: search, $options: 'i' } },
      ];
    }

    const [transfers, total] = await Promise.all([
      StockTransfer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      StockTransfer.countDocuments(query),
    ]);

    res.json({ transfers, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error('Error fetching transfers:', err);
    res.status(500).json({ message: 'Failed to fetch stock transfers' });
  }
});

// GET single transfer
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const transfer = await StockTransfer.findById(req.params.id)
      .populate('requestedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .populate('linkedMaterialRequestId', 'requestId requestTitle');
    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
    res.json(transfer);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch transfer' });
  }
});

// POST create a new transfer request
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { fromLocationId, fromLocationName, toLocationId, toLocationName, lineItems, notes } = req.body;

    if (!fromLocationId || !toLocationId) {
      return res.status(400).json({ message: 'fromLocationId and toLocationId are required' });
    }
    if (fromLocationId === toLocationId) {
      return res.status(400).json({ message: 'Source and destination locations cannot be the same' });
    }
    if (!lineItems || lineItems.length === 0) {
      return res.status(400).json({ message: 'At least one line item is required' });
    }

    // Validate stock availability at source location
    const errors = [];
    for (const li of lineItems) {
      const item = await InventoryItem.findById(li.inventoryItemId);
      if (!item) { errors.push(`Item ${li.inventoryItemId} not found`); continue; }
      const available = getStockAtLocation(item, fromLocationId);
      if (available < li.requestedQty) {
        errors.push(`${item.name}: only ${available} available at ${fromLocationName}, requested ${li.requestedQty}`);
      }
    }
    if (errors.length) {
      return res.status(400).json({ message: 'Insufficient stock', errors });
    }

    const transfer = new StockTransfer({
      fromLocationId,
      fromLocationName,
      toLocationId,
      toLocationName,
      requestedBy: req.user?._id,
      requestedByName: req.user ? `${req.user.firstName} ${req.user.lastName}` : '',
      lineItems: lineItems.map(li => ({
        inventoryItemId: li.inventoryItemId,
        itemName: li.itemName,
        itemCode: li.itemCode,
        unit: li.unit || 'pcs',
        requestedQty: li.requestedQty,
        notes: li.notes || '',
      })),
      status: 'pending',
      notes: notes || '',
    });

    await transfer.save();
    res.status(201).json({ message: 'Transfer request created', data: transfer });
  } catch (err) {
    console.error('Error creating transfer:', err);
    res.status(500).json({ message: 'Failed to create transfer' });
  }
});

// POST approve & execute a transfer
router.post('/:id/approve', authMiddleware, async (req, res) => {
  try {
    const transfer = await StockTransfer.findById(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
    if (!['pending', 'draft'].includes(transfer.status)) {
      return res.status(400).json({ message: `Cannot approve a transfer with status "${transfer.status}"` });
    }

    // Execute each line item: deduct from source, add to destination
    const movementLogs = [];
    for (const li of transfer.lineItems) {
      const item = await InventoryItem.findById(li.inventoryItemId);
      if (!item) throw new Error(`Item ${li.inventoryItemId} not found during approval`);

      const available = getStockAtLocation(item, transfer.fromLocationId);
      if (available < li.requestedQty) {
        return res.status(400).json({
          message: `Insufficient stock for "${item.name}" at ${transfer.fromLocationName}. Available: ${available}, Requested: ${li.requestedQty}`,
        });
      }

      const prevQty = item.quantity;
      // Deduct from source location
      updateStockLevel(item, transfer.fromLocationId, transfer.fromLocationName, -li.requestedQty);
      // Add to destination location
      updateStockLevel(item, transfer.toLocationId, transfer.toLocationName, +li.requestedQty);

      await item.save();
      li.transferredQty = li.requestedQty;

      movementLogs.push({
        inventoryItemId: item._id,
        type: 'location_transfer',
        quantityChange: 0, // net zero — stock moved not created/destroyed
        previousQuantity: prevQty,
        newQuantity: item.quantity,
        fromLocationId: transfer.fromLocationId,
        fromLocationName: transfer.fromLocationName,
        toLocationId: transfer.toLocationId,
        toLocationName: transfer.toLocationName,
        stockTransferId: transfer._id,
        performedBy: req.user?._id,
        notes: `Transfer ${transfer.transferNumber}: ${li.requestedQty} ${li.unit} moved`,
      });
    }

    // Save movement logs
    if (movementLogs.length) await StockMovement.insertMany(movementLogs).catch(() => {});

    // Generate waybill
    const waybillNumber = await generateWaybillNumber();
    transfer.waybillNumber = waybillNumber;
    transfer.waybillGeneratedAt = new Date();
    transfer.status = 'completed';
    transfer.completedAt = new Date();
    transfer.approvedBy = req.user?._id;
    transfer.approvedByName = req.user ? `${req.user.firstName} ${req.user.lastName}` : '';

    await transfer.save();

    res.json({
      message: 'Transfer approved and completed',
      data: transfer,
      waybillNumber,
      waybillUrl: `/api/stock-transfers/${transfer._id}/waybill`,
    });
  } catch (err) {
    console.error('Error approving transfer:', err);
    res.status(500).json({ message: 'Failed to approve transfer', error: err.message });
  }
});

// POST cancel a transfer
router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const transfer = await StockTransfer.findById(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
    if (transfer.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel a completed transfer' });
    }
    transfer.status = 'cancelled';
    transfer.cancelReason = req.body.reason || '';
    await transfer.save();
    res.json({ message: 'Transfer cancelled', data: transfer });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel transfer' });
  }
});

// GET waybill — returns printable HTML
router.get('/:id/waybill', authMiddleware, async (req, res) => {
  try {
    const transfer = await StockTransfer.findById(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
    if (!transfer.waybillNumber) {
      return res.status(400).json({ message: 'No waybill has been generated for this transfer yet' });
    }
    const html = buildWaybillHTML(transfer);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error('Error generating waybill:', err);
    res.status(500).json({ message: 'Failed to generate waybill' });
  }
});

module.exports = router;
