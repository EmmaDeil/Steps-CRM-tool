const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { authMiddleware, requireRole } = require('../middleware/auth');

// All admin routes require authentication and Admin role
router.use(authMiddleware);
router.use(requireRole('Admin'));

// ============================================================
// GET /api/admin/logs
// Fetch audit logs with optional filtering and pagination
// ============================================================
router.get('/logs', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            action,
            status,
            userId,
            from,
            to,
        } = req.query;

        const filter = {};

        if (action) filter.action = action;
        if (status) filter.status = status;
        if (userId) filter['actor.userId'] = userId;

        if (from || to) {
            filter.timestamp = {};
            if (from) filter.timestamp.$gte = new Date(from);
            if (to) filter.timestamp.$lte = new Date(to);
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(Number(limit)),
            AuditLog.countDocuments(filter),
        ]);

        res.json({
            logs,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
});

// ============================================================
// POST /api/admin/backup
// Trigger a JSON export/backup of all core collections
// ============================================================
router.get('/backup', async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const db = mongoose.connection.db;

        // Discover all collections in the current database
        const collections = await db.listCollections().toArray();

        const backup = {
            exportedAt: new Date().toISOString(),
            databaseName: db.databaseName,
            collections: {},
        };

        for (const col of collections) {
            const docs = await db.collection(col.name).find({}).toArray();
            backup.collections[col.name] = docs;
        }

        // Write a backup audit log entry
        await AuditLog.create({
            actor: {
                userId: req.user._id.toString(),
                userName: req.user.fullName || req.user.email,
                userEmail: req.user.email,
                initials: (req.user.fullName || req.user.email).substring(0, 2).toUpperCase(),
            },
            action: 'Backup',
            actionColor: 'blue',
            ipAddress: req.ip || req.connection?.remoteAddress || '127.0.0.1',
            userAgent: req.headers['user-agent'],
            description: `Database backup initiated by ${req.user.email}`,
            status: 'Success',
        });

        const filename = `backup-${new Date().toISOString().slice(0, 10)}.json`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(backup, null, 2));
    } catch (error) {
        console.error('Backup error:', error);
        res.status(500).json({ message: 'Backup failed' });
    }
});

// ============================================================
// GET /api/budget/categories
// Returns the list of budget category names for dropdowns
// This endpoint is accessible by all authenticated users
// ============================================================
router.get('/categories', async (req, res) => {
    try {
        // Default categories (static for now — extend to DB model later)
        const categories = [
            { id: 1, name: "Salaries & Benefits" },
            { id: 2, name: "Operations" },
            { id: 3, name: "Marketing" },
            { id: 4, name: "IT & Infrastructure" },
            { id: 5, name: "Travel & Events" },
            { id: 6, name: "Procurement" },
        ];
        res.json(categories);
    } catch (error) {
        console.error('Error fetching budget categories:', error);
        res.status(500).json({ message: 'Failed to fetch budget categories' });
    }
});

module.exports = router;
