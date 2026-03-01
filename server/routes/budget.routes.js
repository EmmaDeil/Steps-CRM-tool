const express = require('express');
const router = express.Router();
const BudgetCategory = require('../models/BudgetCategory');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// ── GET /api/budget/categories?period=Q1 2025 ─────────────
router.get('/categories', async (req, res) => {
    try {
        const { period } = req.query;
        const filter = period ? { period } : {};
        const categories = await BudgetCategory.find(filter).sort({ createdAt: 1 });
        res.json(categories);
    } catch (err) {
        console.error('Error fetching budget categories:', err);
        res.status(500).json({ message: 'Failed to fetch budget categories' });
    }
});

// ── POST /api/budget/categories ────────────────────────────
router.post('/categories', async (req, res) => {
    try {
        const { name, allocated, spent, period, description, icon, color, bar } = req.body;
        if (!name || allocated === undefined) {
            return res.status(400).json({ message: 'Name and allocated amount are required' });
        }
        const category = new BudgetCategory({
            name: name.trim(),
            allocated: parseFloat(allocated) || 0,
            spent: parseFloat(spent) || 0,
            period: period || 'Q1 2025',
            description: description || '',
            icon: icon || 'fa-wallet',
            color: color || 'text-blue-600',
            bar: bar || 'bg-blue-500',
            createdBy: req.user?.fullName || req.user?.email || 'System',
        });
        await category.save();
        res.status(201).json(category);
    } catch (err) {
        console.error('Error creating budget category:', err);
        res.status(500).json({ message: 'Failed to create budget category' });
    }
});

// ── PUT /api/budget/categories/:id ─────────────────────────
router.put('/categories/:id', async (req, res) => {
    try {
        const updated = await BudgetCategory.findByIdAndUpdate(
            req.params.id,
            { ...req.body },
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ message: 'Category not found' });
        res.json(updated);
    } catch (err) {
        console.error('Error updating budget category:', err);
        res.status(500).json({ message: 'Failed to update budget category' });
    }
});

// ── DELETE /api/budget/categories/:id ──────────────────────
router.delete('/categories/:id', async (req, res) => {
    try {
        const deleted = await BudgetCategory.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Category not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error('Error deleting budget category:', err);
        res.status(500).json({ message: 'Failed to delete category' });
    }
});

// ── GET /api/budget/export?period=Q1 2025&format=csv ───────
router.get('/export', async (req, res) => {
    try {
        const { period, format = 'csv' } = req.query;
        const filter = period ? { period } : {};
        const categories = await BudgetCategory.find(filter).lean();

        if (format === 'csv') {
            const lines = [
                'Name,Allocated,Spent,Remaining,Utilisation (%),Period,Description',
                ...categories.map(c => {
                    const remaining = c.allocated - c.spent;
                    const pct = c.allocated > 0 ? ((c.spent / c.allocated) * 100).toFixed(1) : '0.0';
                    return `"${c.name}",${c.allocated},${c.spent},${remaining},${pct},"${c.period || ''}","${c.description || ''}"`;
                }),
            ];
            const csv = lines.join('\n');
            const filename = `budget-${period || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`;
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(csv);
        }

        // JSON fallback
        const filename = `budget-${period || 'all'}-${new Date().toISOString().slice(0, 10)}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(categories);
    } catch (err) {
        console.error('Error exporting budget:', err);
        res.status(500).json({ message: 'Failed to export budget data' });
    }
});

// ── POST /api/budget/import ────────────────────────────────
// Accepts JSON body with { categories: [...], period, replace }
router.post('/import', async (req, res) => {
    try {
        const { categories = [], period, replace = false } = req.body;
        if (!Array.isArray(categories) || categories.length === 0) {
            return res.status(400).json({ message: 'No categories provided for import' });
        }

        if (replace && period) {
            await BudgetCategory.deleteMany({ period });
        }

        const docs = categories.map(c => ({
            name: String(c.name || '').trim(),
            allocated: parseFloat(c.allocated || c.Allocated) || 0,
            spent: parseFloat(c.spent || c.Spent) || 0,
            period: c.period || period || 'Q1 2025',
            description: c.description || c.Description || '',
            icon: c.icon || 'fa-wallet',
            color: c.color || 'text-blue-600',
            bar: c.bar || 'bg-blue-500',
            createdBy: req.user?.fullName || req.user?.email || 'Import',
        }));

        const inserted = await BudgetCategory.insertMany(docs);
        res.status(201).json({ imported: inserted.length, categories: inserted });
    } catch (err) {
        console.error('Error importing budget:', err);
        res.status(500).json({ message: 'Failed to import budget data' });
    }
});

module.exports = router;
