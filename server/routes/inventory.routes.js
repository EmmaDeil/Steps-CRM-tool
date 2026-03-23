/* eslint-disable */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');
const UnitOfMeasure = require('../models/UnitOfMeasure');
const StoreLocation = require('../models/StoreLocation');
const { authMiddleware } = require('../middleware/auth');
const {
  addBatch,
  consumeBatchesFIFO,
  parseOptionalDate,
  syncItemQuantityAndDates,
} = require('../utils/inventoryBatchUtils');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate the next sequential inventory ID, e.g. INV-00042
 * Uses the highest existing numeric suffix so deletions don't reset counters.
 */
async function generateNextId() {
  const last = await InventoryItem.findOne({
    itemId: /^INV-\d+$/,
    isDeleted: false,
  })
    .sort({ itemId: -1 })
    .select('itemId')
    .lean();

  if (!last) return 'INV-00001';
  const num = parseInt(last.itemId.replace('INV-', ''), 10);
  return `INV-${String(num + 1).padStart(5, '0')}`;
}

/** Validate the common inventory fields from req.body */
function validateInventoryBody(body, requireAllFields = true) {
  const errors = [];

  if (requireAllFields || body.name !== undefined) {
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      errors.push('name is required and must be a non-empty string');
    }
  }

  if (requireAllFields || body.category !== undefined) {
    if (!body.category || typeof body.category !== 'string' || !body.category.trim()) {
      errors.push('category is required and must be a non-empty string');
    }
  }

  if (requireAllFields || body.location !== undefined) {
    if (!body.location || typeof body.location !== 'string' || !body.location.trim()) {
      errors.push('location is required and must be a non-empty string');
    }
  }

  if (requireAllFields || body.quantity !== undefined) {
    const qty = Number(body.quantity);
    if (isNaN(qty) || !Number.isInteger(qty) || qty < 0) {
      errors.push('quantity must be a non-negative integer');
    }
  }

  if (requireAllFields || body.maxStock !== undefined) {
    const max = Number(body.maxStock);
    if (isNaN(max) || !Number.isInteger(max) || max < 1) {
      errors.push('maxStock must be a positive integer');
    }
  }

  if (body.reorderPoint !== undefined) {
    const rp = Number(body.reorderPoint);
    if (isNaN(rp) || !Number.isInteger(rp) || rp < 0) {
      errors.push('reorderPoint must be a non-negative integer');
    }
  }

  ['productionDate', 'manufacturingDate', 'expiryDate'].forEach((field) => {
    if (body[field] !== undefined && body[field] !== null && body[field] !== '') {
      const dt = new Date(body[field]);
      if (Number.isNaN(dt.getTime())) {
        errors.push(`${field} must be a valid date`);
      }
    }
  });

  return errors;
}

function isAdminUser(user) {
  const role = String(user?.role || '').trim().toLowerCase();
  return role === 'admin' || role === 'administrator';
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET fast lookup by barcode/SKU
router.get('/scan/:code', authMiddleware, async (req, res) => {
  try {
    const code = req.params.code.trim();
    // Search by exact itemId or exact name (case-insensitive)
    const item = await InventoryItem.findOne({
      isDeleted: false,
      $or: [
        { itemId: new RegExp(`^${code}$`, 'i') },
        { name: new RegExp(`^${code}$`, 'i') }
      ]
    });

    if (!item) {
      // Also check SkuItems as a fallback to help auto-fill the Add modal
      const SkuItem = require('../models/SkuItem');
      const skuMatch = await SkuItem.findOne({
        isActive: true,
        $or: [
          { sku: new RegExp(`^${code}$`, 'i') },
          { name: new RegExp(`^${code}$`, 'i') }
        ]
      });

      if (skuMatch) {
        return res.json({ found: false, isNewSku: true, skuData: skuMatch });
      }

      return res.status(404).json({ message: 'Barcode clear, no matching item found.' });
    }

    res.json({ found: true, item });
  } catch (err) {
    console.error('Error scanning barcode:', err);
    res.status(500).json({ message: 'Failed to process barcode scan' });
  }
});

// GET all inventory items (paginated, filtered)
// /api/inventory?page=1&limit=20&category=Electronics&search=laptop
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, category } = req.query;
    const pageNum   = Math.max(1, parseInt(page));
    const limitNum  = Math.min(200, Math.max(1, parseInt(limit)));
    const skip      = (pageNum - 1) * limitNum;

    const query = { isDeleted: false };

    if (search) {
      query.$or = [
        { name:   { $regex: search, $options: 'i' } },
        { itemId: { $regex: search, $options: 'i' } },
      ];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    const [items, total] = await Promise.all([
      InventoryItem.find(query).sort({ lastUpdated: -1 }).skip(skip).limit(limitNum),
      InventoryItem.countDocuments(query),
    ]);

    res.json({
      items,
      total,
      page:       pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ message: 'Failed to fetch inventory items' });
  }
});

// GET low-stock items (below their reorderPoint) — MUST be before /:id route
router.get('/alerts/low-stock', authMiddleware, async (req, res) => {
  try {
    const items = await InventoryItem.find({
      isDeleted: false,
      $expr: { $lte: ['$quantity', '$reorderPoint'] },
    }).sort({ quantity: 1 });
    res.json({ count: items.length, items });
  } catch (err) {
    console.error('Error fetching low-stock alerts:', err);
    res.status(500).json({ message: 'Failed to fetch low-stock alerts' });
  }
});

// GET expiring inventory batches/items
router.get('/alerts/expiring', authMiddleware, async (req, res) => {
  try {
    const days = Math.max(1, parseInt(req.query.days || 30, 10));
    const now = new Date();
    const cutoff = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

    const items = await InventoryItem.find({ isDeleted: false });
    const expiring = [];

    items.forEach((item) => {
      const batches = Array.isArray(item.batches) ? item.batches : [];
      const activeBatches = batches.filter((b) => Number(b.quantity || 0) > 0 && b.expiryDate);
      const matched = activeBatches.filter((b) => {
        const expiry = new Date(b.expiryDate);
        return expiry >= now && expiry <= cutoff;
      });

      if (matched.length > 0) {
        const nextExpiry = matched
          .map((b) => new Date(b.expiryDate))
          .sort((a, b) => a - b)[0];
        expiring.push({
          _id: item._id,
          itemId: item.itemId,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          nextExpiry,
          batches: matched,
        });
      }
    });

    expiring.sort((a, b) => new Date(a.nextExpiry) - new Date(b.nextExpiry));
    res.json({ count: expiring.length, days, items: expiring });
  } catch (err) {
    console.error('Error fetching expiring inventory alerts:', err);
    res.status(500).json({ message: 'Failed to fetch expiring inventory alerts' });
  }
});

// GET inventory summary for analytics dashboards
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const days = Math.max(1, parseInt(req.query.days || 30, 10));
    const now = new Date();
    const cutoff = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

    const items = await InventoryItem.find({ isDeleted: false }).select('quantity reorderPoint batches');
    let totalUnits = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let expiringSoon = 0;

    items.forEach((item) => {
      totalUnits += Number(item.quantity || 0);
      if (Number(item.quantity || 0) <= 0) outOfStock += 1;
      else if (Number(item.quantity || 0) <= Number(item.reorderPoint || 20)) lowStock += 1;

      const batches = Array.isArray(item.batches) ? item.batches : [];
      const hasExpiringBatch = batches.some((batch) => {
        if (Number(batch.quantity || 0) <= 0 || !batch.expiryDate) return false;
        const expiry = new Date(batch.expiryDate);
        return expiry >= now && expiry <= cutoff;
      });

      if (hasExpiringBatch) expiringSoon += 1;
    });

    res.json({
      totalItems: items.length,
      totalUnits,
      lowStock,
      outOfStock,
      expiringSoon,
      expiryWindowDays: days,
    });
  } catch (err) {
    console.error('Error fetching inventory summary:', err);
    res.status(500).json({ message: 'Failed to fetch inventory summary' });
  }
});

// GET list of Unit of Measure options
router.get('/units', authMiddleware, async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || '').toLowerCase() === 'true';
    const canViewInactive = includeInactive && isAdminUser(req.user);
    const query = canViewInactive ? {} : { isActive: true };

    const units = await UnitOfMeasure.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .select('_id name symbol description sortOrder isActive')
      .lean();

    res.json({ items: units });
  } catch (err) {
    console.error('Error fetching units of measure:', err);
    res.status(500).json({ message: 'Failed to fetch units of measure' });
  }
});

// POST create Unit of Measure (admin only)
router.post('/units', authMiddleware, async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({ message: 'Only admins can create units of measure' });
    }

    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ message: 'name is required' });

    const existing = await UnitOfMeasure.findOne({ nameKey: name.toLowerCase() }).select('_id').lean();
    if (existing) {
      return res.status(409).json({ message: 'A unit with this name already exists' });
    }

    const unit = await UnitOfMeasure.create({
      name,
      symbol: String(req.body?.symbol || '').trim(),
      description: String(req.body?.description || '').trim(),
      sortOrder: Number.isFinite(Number(req.body?.sortOrder)) ? Number(req.body.sortOrder) : 0,
      isActive: req.body?.isActive !== false,
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    res.status(201).json({ message: 'Unit of measure created', data: unit });
  } catch (err) {
    console.error('Error creating unit of measure:', err);
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'A unit with this name already exists' });
    }
    res.status(500).json({ message: 'Failed to create unit of measure' });
  }
});

// PUT update Unit of Measure (admin only)
router.put('/units/:unitId', authMiddleware, async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({ message: 'Only admins can update units of measure' });
    }

    const updates = {};
    if (req.body?.name !== undefined) {
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ message: 'name cannot be empty' });
      updates.name = name;
      updates.nameKey = name.toLowerCase();
    }
    if (req.body?.symbol !== undefined) updates.symbol = String(req.body.symbol || '').trim();
    if (req.body?.description !== undefined) updates.description = String(req.body.description || '').trim();
    if (req.body?.sortOrder !== undefined) {
      const sortOrder = Number(req.body.sortOrder);
      if (!Number.isFinite(sortOrder)) return res.status(400).json({ message: 'sortOrder must be a number' });
      updates.sortOrder = sortOrder;
    }
    if (req.body?.isActive !== undefined) updates.isActive = !!req.body.isActive;
    updates.updatedBy = req.user?._id;

    const unit = await UnitOfMeasure.findByIdAndUpdate(req.params.unitId, updates, {
      new: true,
      runValidators: true,
    });
    if (!unit) return res.status(404).json({ message: 'Unit not found' });

    res.json({ message: 'Unit of measure updated', data: unit });
  } catch (err) {
    console.error('Error updating unit of measure:', err);
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'A unit with this name already exists' });
    }
    res.status(500).json({ message: 'Failed to update unit of measure' });
  }
});

// DELETE deactivate Unit of Measure (admin only)
router.delete('/units/:unitId', authMiddleware, async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({ message: 'Only admins can deactivate units of measure' });
    }

    const unit = await UnitOfMeasure.findByIdAndUpdate(
      req.params.unitId,
      { isActive: false, updatedBy: req.user?._id },
      { new: true }
    );
    if (!unit) return res.status(404).json({ message: 'Unit not found' });

    res.json({ message: 'Unit of measure deactivated', data: unit });
  } catch (err) {
    console.error('Error deactivating unit of measure:', err);
    res.status(500).json({ message: 'Failed to deactivate unit of measure' });
  }
});

// GET single inventory item
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const item = await InventoryItem.findOne({ _id: req.params.id, isDeleted: false });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch inventory item' });
  }
});

// POST create new inventory item
router.post('/', authMiddleware, async (req, res) => {
  try {
    const errors = validateInventoryBody(req.body, true);
    if (errors.length) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    // Attempt to map the location string to an actual StoreLocation ID
    const locName = req.body.location.trim();
    const storeLoc = await StoreLocation.findOne({ name: new RegExp(`^${locName}$`, 'i') });
    
    // Automatically initialize stockLevels if a location was found/provided
    const stockLevels = [];
    if (storeLoc || locName) {
      stockLevels.push({
        locationId: storeLoc ? storeLoc._id : new mongoose.Types.ObjectId(), // fallback if created on-the-fly without real location UI
        locationName: storeLoc ? storeLoc.name : locName,
        quantity: Number(req.body.quantity) || 0,
        maxStock: Number(req.body.maxStock) || 100,
        reorderPoint: req.body.reorderPoint !== undefined ? Number(req.body.reorderPoint) : Math.floor(Number(req.body.maxStock) * 0.2),
      });
    }

    const newItemId = await generateNextId();
    const manufacturingDate = parseOptionalDate(req.body.manufacturingDate || req.body.productionDate);

    const newItem = await InventoryItem.create({
      itemId:       newItemId,
      name:         req.body.name.trim(),
      category:     req.body.category,
      description:  req.body.description || '',
      unit:         req.body.unit || 'pcs',
      quantity:     Number(req.body.quantity),
      maxStock:     Number(req.body.maxStock),
      reorderPoint: req.body.reorderPoint !== undefined ? Number(req.body.reorderPoint) : Math.floor(Number(req.body.maxStock) * 0.2),
      location:     locName,
      stockLevels,
      lotNumber: typeof req.body.lotNumber === 'string' ? req.body.lotNumber.trim() : '',
      refNumber: typeof req.body.refNumber === 'string' ? req.body.refNumber.trim() : '',
      productionDate: manufacturingDate,
      manufacturingDate,
      expiryDate: parseOptionalDate(req.body.expiryDate),
      createdBy:    req.user?._id,
    });

    addBatch(newItem, {
      quantity: Number(req.body.quantity) || 0,
      lotNumber: req.body.lotNumber,
      refNumber: req.body.refNumber,
      manufacturingDate: req.body.manufacturingDate || req.body.productionDate,
      expiryDate: req.body.expiryDate,
      locationId: storeLoc ? storeLoc._id : null,
      locationName: locName,
      receivedDate: new Date(),
    });
    await newItem.save();

    // Log initial stock movement
    await logMovement(newItem._id, 'initial', newItem.quantity, 0, req.user?._id, 'Item created');

    res.status(201).json({ message: 'Item created successfully', data: newItem });
  } catch (err) {
    console.error('Error creating inventory item:', err);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'An item with this ID already exists' });
    }
    res.status(500).json({ message: 'Failed to create inventory item' });
  }
});

// PUT update inventory item (edit mode — does NOT change quantity via this route)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const errors = validateInventoryBody(req.body, false);
    if (errors.length) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    // Build a safe update object — never allow direct quantity change here
    // (quantity changes must go through /restock or /adjust)
    const allowedFields = ['name', 'category', 'maxStock', 'reorderPoint', 'location', 'description', 'unit', 'lotNumber', 'refNumber', 'productionDate', 'manufacturingDate', 'expiryDate'];
    const updates = {};
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) {
        if (['maxStock', 'reorderPoint'].includes(f)) {
          updates[f] = Number(req.body[f]);
        } else if (['productionDate', 'manufacturingDate', 'expiryDate'].includes(f)) {
          updates[f] = parseOptionalDate(req.body[f]);
        } else {
          updates[f] = typeof req.body[f] === 'string' ? req.body[f].trim() : req.body[f];
        }
      }
    });

    // Keep production/manufacturing dates aligned as a single concept.
    if (req.body.manufacturingDate !== undefined || req.body.productionDate !== undefined) {
      const manufacturingDate = parseOptionalDate(req.body.manufacturingDate || req.body.productionDate);
      updates.manufacturingDate = manufacturingDate;
      updates.productionDate = manufacturingDate;
    }

    updates.lastUpdated = new Date();

    let updated = await InventoryItem.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      updates,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Item not found' });

    // Sync root changes to the first stock level if it is a single-location item to maintain consistency
    if (updated.stockLevels && updated.stockLevels.length === 1) {
      const StoreLocation = require('../models/StoreLocation');
      let locId = updated.stockLevels[0].locationId;
      if (req.body.location) {
        const storeLoc = await StoreLocation.findOne({ name: new RegExp(`^${req.body.location.trim()}$`, 'i') });
        if (storeLoc) locId = storeLoc._id;
      }
      
      updated.stockLevels[0].locationName = updated.location;
      updated.stockLevels[0].locationId = locId;
      updated.stockLevels[0].maxStock = updated.maxStock;
      updated.stockLevels[0].reorderPoint = updated.reorderPoint;
      await updated.save();
    }

    res.json({ message: 'Item updated successfully', data: updated });
  } catch (err) {
    console.error('Error updating inventory item:', err);
    res.status(500).json({ message: 'Failed to update inventory item' });
  }
});

// POST restock — INCREMENTS quantity by the supplied amount (not overwrite)
router.post('/:id/restock', authMiddleware, async (req, res) => {
  try {
    const addQty = Number(req.body.addQuantity);
    if (isNaN(addQty) || !Number.isInteger(addQty) || addQty <= 0) {
      return res.status(400).json({ message: 'addQuantity must be a positive integer' });
    }

    const item = await InventoryItem.findOne({ _id: req.params.id, isDeleted: false });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const previousQty = item.quantity;
    const newQty = item.quantity + addQty; // no longer capped at maxStock
    const actualAdded = addQty;

    // Automatically bump up maxStock if the user's restock amount exceeds it
    if (newQty > item.maxStock) {
      item.maxStock = newQty;
      // also update the first stock level to match if it's a single location item
      if (item.stockLevels && item.stockLevels.length === 1) {
        item.stockLevels[0].maxStock = newQty;
      }
    }

    item.quantity    = newQty;
    item.lastUpdated = new Date();

    const restockLocationName = req.body.locationName || item.location;
    let locationId = null;
    if (restockLocationName) {
      const loc = await StoreLocation.findOne({ name: new RegExp(`^${String(restockLocationName).trim()}$`, 'i') }).select('_id');
      locationId = loc?._id || null;
    }
    addBatch(item, {
      quantity: addQty,
      lotNumber: req.body.lotNumber,
      refNumber: req.body.refNumber,
      manufacturingDate: req.body.manufacturingDate || req.body.productionDate,
      expiryDate: req.body.expiryDate,
      receivedDate: new Date(),
      locationId,
      locationName: restockLocationName || '',
    });
    syncItemQuantityAndDates(item);
    await item.save();

    await logMovement(item._id, 'restock', actualAdded, previousQty, req.user?._id,
      req.body.notes || 'Manual restock'
    );

    res.json({
      message: `Restocked ${actualAdded} unit(s). New quantity: ${newQty}`,
      data: item,
      actualAdded,
    });
  } catch (err) {
    console.error('Error restocking inventory item:', err);
    res.status(500).json({ message: 'Failed to restock item' });
  }
});

// POST adjust — manual quantity adjustment (positive or negative delta), audit logged
router.post('/:id/adjust', authMiddleware, async (req, res) => {
  try {
    const delta  = Number(req.body.delta);
    const reason = req.body.reason || 'Manual adjustment';

    if (isNaN(delta) || !Number.isInteger(delta) || delta === 0) {
      return res.status(400).json({ message: 'delta must be a non-zero integer' });
    }

    const item = await InventoryItem.findOne({ _id: req.params.id, isDeleted: false });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const previousQty = item.quantity;
    if (delta < 0) {
      const consumeResult = consumeBatchesFIFO(item, Math.abs(delta));
      if (consumeResult.remaining > 0) {
        return res.status(400).json({
          message: `Insufficient stock for adjustment. Available: ${consumeResult.consumedQty}, requested: ${Math.abs(delta)}`,
        });
      }
    } else {
      addBatch(item, { quantity: delta, receivedDate: new Date(), locationName: item.location });
    }

    const newQty = item.quantity;
    await item.save();

    await logMovement(item._id, 'adjustment', delta, previousQty, req.user?._id, reason);

    res.json({ message: `Quantity adjusted from ${previousQty} to ${newQty}`, data: item });
  } catch (err) {
    console.error('Error adjusting inventory item:', err);
    res.status(500).json({ message: 'Failed to adjust item' });
  }
});

// GET movement history for a single item
router.get('/:id/movements', authMiddleware, async (req, res) => {
  try {
    const StockMovement = require('../models/StockMovement');
    const movements = await StockMovement.find({ inventoryItemId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('performedBy', 'firstName lastName');
    res.json(movements);
  } catch (err) {
    console.error('Error fetching movements:', err);
    res.status(500).json({ message: 'Failed to fetch movement history' });
  }
});

// DELETE (soft delete) inventory item
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const item = await InventoryItem.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true, deletedAt: new Date(), deletedBy: req.user?._id, lastUpdated: new Date() },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Item not found' });

    await logMovement(item._id, 'deletion', -item.quantity, item.quantity, req.user?._id, 'Item deleted');

    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Error deleting inventory item:', err);
    res.status(500).json({ message: 'Failed to delete item' });
  }
});

// ── Internal helper (not exposed as route) ─────────────────────────────────

async function logMovement(inventoryItemId, type, quantityChange, previousQuantity, performedBy, notes) {
  try {
    const StockMovement = require('../models/StockMovement');
    await StockMovement.create({
      inventoryItemId,
      type,
      quantityChange,
      previousQuantity,
      newQuantity: previousQuantity + quantityChange,
      performedBy,
      notes,
    });
  } catch (e) {
    // Logging failure should never crash the main operation
    console.error('Stock movement log failed:', e.message);
  }
}

// Export helper so procurement route can use it inside its transaction
module.exports = router;
module.exports.logMovement = logMovement;
