/* eslint-disable */
const express = require('express');
const router = express.Router();
const StoreLocation = require('../models/StoreLocation');
const { authMiddleware } = require('../middleware/auth');

// GET all active store locations
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const query = { isDeleted: false };
    if (!includeInactive) query.isActive = true;
    const locations = await StoreLocation.find(query).sort({ name: 1 });
    res.json(locations);
  } catch (err) {
    console.error('Error fetching store locations:', err);
    res.status(500).json({ message: 'Failed to fetch store locations' });
  }
});

// POST create new store location
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { code, name, address, description } = req.body;
    if (!code || !name) {
      return res.status(400).json({ message: 'code and name are required' });
    }
    const location = await StoreLocation.create({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      address: address || '',
      description: description || '',
      createdBy: req.user?._id,
    });
    res.status(201).json({ message: 'Store location created', data: location });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'A location with this code already exists' });
    console.error('Error creating store location:', err);
    res.status(500).json({ message: 'Failed to create store location' });
  }
});

// PUT update store location
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const updates = {};
    ['name', 'address', 'description', 'isActive'].forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    const location = await StoreLocation.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      updates,
      { new: true, runValidators: true }
    );
    if (!location) return res.status(404).json({ message: 'Location not found' });
    res.json({ message: 'Location updated', data: location });
  } catch (err) {
    console.error('Error updating store location:', err);
    res.status(500).json({ message: 'Failed to update store location' });
  }
});

// DELETE (soft delete) store location
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const location = await StoreLocation.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true, isActive: false },
      { new: true }
    );
    if (!location) return res.status(404).json({ message: 'Location not found' });
    res.json({ message: 'Location deleted' });
  } catch (err) {
    console.error('Error deleting store location:', err);
    res.status(500).json({ message: 'Failed to delete store location' });
  }
});

module.exports = router;
