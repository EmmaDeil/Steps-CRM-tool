/* eslint-disable */
const express = require('express');
const router = express.Router();
const StockMovement = require('../models/StockMovement');
const { authMiddleware } = require('../middleware/auth');
const { requireModuleAction } = require('../middleware/moduleAccess');

// GET all stock movements (paginated)
router.get('/', authMiddleware, requireModuleAction('inventory', 'view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const query = {};

    const [movements, total] = await Promise.all([
      StockMovement.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('inventoryItemId', 'name')
        .populate('performedBy', 'firstName lastName')
        .lean(),
      StockMovement.countDocuments(query),
    ]);

    res.json({
      movements,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Error fetching stock movements:', err);
    res.status(500).json({ message: 'Failed to fetch stock movements history' });
  }
});

module.exports = router;
