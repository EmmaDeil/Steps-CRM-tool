/* eslint-disable */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');
const StoreLocation = require('../models/StoreLocation');
const { authMiddleware } = require('../middleware/auth');

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
    const allowed = ['Electronics', 'Furniture', 'Supplies', 'Network'];
    if (!body.category || !allowed.includes(body.category)) {
      errors.push(`category must be one of: ${allowed.join(', ')}`);
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

  return errors;
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

    const newItem = await InventoryItem.create({
      itemId,
      name:         req.body.name.trim(),
      category:     req.body.category,
      quantity:     Number(req.body.quantity),
      maxStock:     Number(req.body.maxStock),
      reorderPoint: req.body.reorderPoint !== undefined ? Number(req.body.reorderPoint) : Math.floor(Number(req.body.maxStock) * 0.2),
      location:     locName,
      stockLevels,
      createdBy:    req.user?._id,
    });

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
    const allowedFields = ['name', 'category', 'maxStock', 'reorderPoint', 'location'];
    const updates = {};
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) {
        updates[f] = typeof req.body[f] === 'string' ? req.body[f].trim() : Number(req.body[f]);
      }
    });
    updates.lastUpdated = new Date();

    const updated = await InventoryItem.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      updates,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Item not found' });

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
    const newQty = Math.min(item.quantity + addQty, item.maxStock); // cap at maxStock
    const actualAdded = newQty - previousQty;

    item.quantity    = newQty;
    item.lastUpdated = new Date();
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
    const newQty = Math.max(0, item.quantity + delta);

    item.quantity    = newQty;
    item.lastUpdated = new Date();
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
