/* eslint-disable */
const express = require('express');
const router = express.Router();
const StockTransfer = require('../models/StockTransfer');
const InventoryItem = require('../models/InventoryItem');
const StockMovement = require('../models/StockMovement');
const { authMiddleware } = require('../middleware/auth');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get the quantity available for a specific item at a specific location.
 * Returns 0 if no stock level entry found for that location.
 */
function getStockAtLocation(item, locationId) {
  const level = item.stockLevels.find(sl => sl.locationId.toString() === locationId.toString());
  return level ? level.quantity : 0;
}

/**
 * Update (or create) a stock level entry for a location on an item.
 * Returns the updated item (unsaved — caller must .save()).
 */
function updateStockLevel(item, locationId, locationName, delta) {
  const idx = item.stockLevels.findIndex(sl => sl.locationId.toString() === locationId.toString());
  if (idx >= 0) {
    item.stockLevels[idx].quantity = Math.max(0, item.stockLevels[idx].quantity + delta);
  } else {
    if (delta > 0) {
      item.stockLevels.push({ locationId, locationName, quantity: delta });
    }
  }
  // Recompute aggregate
  item.quantity = item.stockLevels.reduce((s, sl) => s + sl.quantity, 0);
  item.lastUpdated = new Date();
}

/** Build and return wabill HTML string */
function buildWaybillHTML(transfer, companyName = 'Steps CRM') {
  const rows = transfer.lineItems.map(li => `
    <tr>
      <td>${li.itemCode}</td>
      <td>${li.itemName}</td>
      <td style="text-align:center">${li.transferredQty || li.requestedQty}</td>
      <td style="text-align:center">${li.unit}</td>
      <td>${li.notes || ''}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Waybill ${transfer.waybillNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .company { font-size: 22px; font-weight: bold; color: #1d4ed8; }
    .doc-info { text-align: right; }
    .doc-info h2 { font-size: 18px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; color: #374151; }
    .doc-info p { margin-top: 4px; color: #6b7280; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .meta-item label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #6b7280; display: block; margin-bottom: 2px; }
    .meta-item span { font-size: 13px; font-weight: 600; }
    .route { background: #dbeafe; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 16px; }
    .route-box { flex: 1; }
    .route-box label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #1d4ed8; }
    .route-box span { display: block; font-size: 14px; font-weight: bold; }
    .arrow { font-size: 24px; color: #1d4ed8; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
    th { background: #1d4ed8; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
    td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f9fafb; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 32px; }
    .sig-box { border-top: 2px solid #111; padding-top: 8px; }
    .sig-box label { font-size: 10px; text-transform: uppercase; color: #6b7280; }
    .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    @media print {
      button { display: none !important; }
      body { padding: 16px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">${companyName}</div>
      <div style="color:#6b7280;margin-top:4px;">Stock Transfer Waybill</div>
    </div>
    <div class="doc-info">
      <h2>Waybill</h2>
      <p><strong>${transfer.waybillNumber}</strong></p>
      <p>Transfer: ${transfer.transferNumber}</p>
      <p>Date: ${new Date(transfer.completedAt || transfer.updatedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</p>
    </div>
  </div>

  <div class="route">
    <div class="route-box">
      <label>From</label>
      <span>${transfer.fromLocationName}</span>
    </div>
    <div class="arrow">&#10132;</div>
    <div class="route-box">
      <label>To</label>
      <span>${transfer.toLocationName}</span>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><label>Requested By</label><span>${transfer.requestedByName || '—'}</span></div>
    <div class="meta-item"><label>Approved By</label><span>${transfer.approvedByName || '—'}</span></div>
    <div class="meta-item"><label>Status</label><span style="text-transform:capitalize">${transfer.status}</span></div>
    <div class="meta-item"><label>Notes</label><span>${transfer.notes || '—'}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item Code</th><th>Item Name</th><th style="text-align:center">Qty</th><th style="text-align:center">Unit</th><th>Notes</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="sig-grid">
    <div class="sig-box"><label>Issued By</label><br/><br/><br/><span style="font-size:10px;color:#6b7280">Name &amp; Signature / Date</span></div>
    <div class="sig-box"><label>Received By</label><br/><br/><br/><span style="font-size:10px;color:#6b7280">Name &amp; Signature / Date</span></div>
    <div class="sig-box"><label>Logistics / Driver</label><br/><br/><br/><span style="font-size:10px;color:#6b7280">Name &amp; Signature / Date</span></div>
  </div>

  <div class="footer">
    This document was generated by ${companyName} &bull; ${transfer.waybillNumber} &bull; Generated ${new Date().toLocaleString()}
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;
}

/** Auto-generate a waybill number */
async function generateWaybillNumber() {
  const yearMonth = new Date().toISOString().slice(2, 7).replace('-', '');
  const count = await StockTransfer.countDocuments({ waybillNumber: { $ne: null } });
  return `WB-${yearMonth}-${String(count + 1).padStart(5, '0')}`;
}

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
module.exports.buildWaybillHTML = buildWaybillHTML;
module.exports.generateWaybillNumber = generateWaybillNumber;
module.exports.updateStockLevel = updateStockLevel;
module.exports.getStockAtLocation = getStockAtLocation;
