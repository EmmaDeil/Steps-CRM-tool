const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const Role = require('../models/Role');
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
// GET /api/admin/roles
// Fetch all system roles
// ============================================================
router.get('/roles', async (req, res) => {
    try {
        const roles = await Role.find().sort({ name: 1 });
        res.json(roles);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ message: 'Failed to fetch roles' });
    }
});

// ============================================================
// PUT /api/admin/roles/:id
// Update a specific role's permissions
// ============================================================
router.put('/roles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions } = req.body;

        const role = await Role.findById(id);
        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }

        // Only update permissions (name and isSystem are locked)
        role.permissions = permissions;
        await role.save();

        await AuditLog.create({
            actor: {
                userId: req.user._id.toString(),
                userName: req.user.fullName || req.user.email,
                userEmail: req.user.email,
                initials: (req.user.fullName || req.user.email).substring(0, 2).toUpperCase(),
            },
            action: 'Role Changed',
            actionColor: 'purple',
            ipAddress: req.ip || req.connection?.remoteAddress || '127.0.0.1',
            userAgent: req.headers['user-agent'],
            description: `Permissions updated for role: ${role.name}`,
            status: 'Success',
        });

        res.json({ message: 'Role updated successfully', role });
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ message: 'Failed to update role' });
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
// POST /api/admin/restore
// Restore database from a previously exported backup JSON
// ============================================================
router.post('/restore', express.json({ limit: '100mb' }), async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const db = mongoose.connection.db;
        const { exportedAt, collections } = req.body;

        if (!collections || typeof collections !== 'object') {
            return res.status(400).json({ message: 'Invalid backup file format' });
        }

        const collectionNames = Object.keys(collections);
        if (collectionNames.length === 0) {
            return res.status(400).json({ message: 'Backup file contains no collections' });
        }

        // Skip audit logs so we don't lose the restore audit trail
        const skipCollections = ['auditlogs'];
        const restored = [];
        const skipped = [];

        for (const colName of collectionNames) {
            if (skipCollections.includes(colName.toLowerCase())) {
                skipped.push(colName);
                continue;
            }

            const docs = collections[colName];
            if (!Array.isArray(docs)) {
                skipped.push(colName);
                continue;
            }

            const col = db.collection(colName);
            // Clear existing data
            await col.deleteMany({});
            // Insert backup data
            if (docs.length > 0) {
                await col.insertMany(docs);
            }
            restored.push({ name: colName, count: docs.length });
        }

        // Write a restore audit log entry
        await AuditLog.create({
            actor: {
                userId: req.user._id.toString(),
                userName: req.user.fullName || req.user.email,
                userEmail: req.user.email,
                initials: (req.user.fullName || req.user.email).substring(0, 2).toUpperCase(),
            },
            action: 'Restore',
            actionColor: 'orange',
            ipAddress: req.ip || req.connection?.remoteAddress || '127.0.0.1',
            userAgent: req.headers['user-agent'],
            description: `Database restore from backup (${exportedAt || 'unknown date'}) by ${req.user.email}. Restored ${restored.length} collections.`,
            status: 'Success',
        });

        res.json({
            message: 'Restore completed successfully',
            restored,
            skipped,
        });
    } catch (error) {
        console.error('Restore error:', error);
        res.status(500).json({ message: 'Restore failed: ' + error.message });
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

// ============================================================
// GET /api/admin/system-settings
// Fetch system settings
// ============================================================
const SystemSettings = require('../models/SystemSettings');

router.get('/system-settings', async (req, res) => {
    try {
        let settings = await SystemSettings.findOne();
        if (!settings) {
            settings = await SystemSettings.create({});
        }
        res.json(settings);
    } catch (error) {
        console.error('Error fetching system settings:', error);
        res.status(500).json({ message: 'Failed to fetch system settings' });
    }
});

// ============================================================
// PATCH /api/admin/system-settings
// Update system settings
// ============================================================
router.patch('/system-settings', async (req, res) => {
    try {
        let settings = await SystemSettings.findOne();
        if (!settings) {
            settings = new SystemSettings(req.body);
        } else {
            Object.assign(settings, req.body);
        }
        await settings.save();
        
        // Audit log for setting update
        await AuditLog.create({
            actor: {
                userId: req.user._id.toString(),
                userName: req.user.fullName || req.user.email,
                userEmail: req.user.email,
                initials: (req.user.fullName || req.user.email).substring(0, 2).toUpperCase(),
            },
            action: 'Config Update',
            actionColor: 'orange',
            ipAddress: req.ip || req.connection?.remoteAddress || '127.0.0.1',
            userAgent: req.headers['user-agent'],
            description: `System settings updated by ${req.user.email}`,
            status: 'Success',
        });

        res.json({ message: 'Settings updated successfully', settings });
    } catch (error) {
        console.error('Error updating system settings:', error);
        res.status(500).json({ message: 'Failed to update system settings' });
    }
});

module.exports = router;
