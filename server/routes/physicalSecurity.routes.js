const express = require('express');
const router = express.Router();
const { CameraFeed, SecurityLog, SecurityPersonnel, SecurityBadge } = require('../models/PhysicalSecurity');
const { authMiddleware } = require('../middleware/auth');
const { checkSecurityRole } = require('../middleware/securityAuth'); // Reusing existing role check
const { requireModuleAction } = require('../middleware/moduleAccess');

// Protect all physical security routes. Assuming Admins and standard users with 'Security' access can view.
// In a real system, you might refine this.
router.use(authMiddleware);
router.use(requireModuleAction('security', 'view'));
router.use(checkSecurityRole(['Admin', 'Employee', 'Manager'])); 

// No mock data seeding. Database starts empty until cameras are configured.

// --- CAMERA ROUTES ---

// GET /api/physical-security/cameras 
router.get('/cameras', async (req, res) => {
    try {
        const cameras = await CameraFeed.find().sort({ createdAt: -1 });
        res.json(cameras);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/physical-security/cameras (Configure a new feed)
router.post('/cameras', requireModuleAction('security', 'create'), async (req, res) => {
    try {
        const newCamera = new CameraFeed({
            name: req.body.name,
            status: req.body.status || 'online',
            lastMotion: req.body.lastMotion || 'Just now'
        });
        const savedCamera = await newCamera.save();
        res.status(201).json(savedCamera);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error adding camera' });
    }
});

// PUT /api/physical-security/cameras/:id (For status updates or motion alerts)
router.put('/cameras/:id', requireModuleAction('security', 'edit'), async (req, res) => {
    try {
        const camera = await CameraFeed.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!camera) return res.status(404).json({ message: 'Camera not found' });
        res.json(camera);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- LOG ROUTES ---

// GET /api/physical-security/logs
router.get('/logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const logs = await SecurityLog.find().sort({ createdAt: -1 }).limit(limit);
        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/physical-security/logs/all - Get all logs for audit trail
router.get('/logs/all', async (req, res) => {
    try {
        const logs = await SecurityLog.find().sort({ createdAt: -1 });
        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/physical-security/logs (For guards logging visitor entry, or systems logging faults)
router.post('/logs', requireModuleAction('security', 'create'), async (req, res) => {
    try {
        const newLog = new SecurityLog(req.body);
        const savedLog = await newLog.save();
        res.status(201).json(savedLog);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- PERSONNEL ROUTES ---

// GET /api/physical-security/personnel
router.get('/personnel', async (req, res) => {
    try {
        const personnel = await SecurityPersonnel.find({ status: 'On Duty' });
        res.json(personnel);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- VISITOR PASS ROUTES ---
const VisitorPass = require('../models/VisitorPass');

// POST /api/physical-security/visitor-passes - Create a new visitor pass (generates QR token)
router.post('/visitor-passes', requireModuleAction('security', 'create'), async (req, res) => {
    try {
        const pass = new VisitorPass({
            createdBy: req.body.createdBy || 'Security Officer',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        });
        await pass.save();

        // Log the visitor pass creation
        await SecurityLog.create({
            time: new Date().toLocaleTimeString(),
            type: 'Visitor',
            details: `Visitor pass generated (Token: ...${pass.token.slice(-6)})`,
            severity: 'info',
        });

        res.status(201).json(pass);
    } catch (error) {
        console.error('Error creating visitor pass:', error);
        res.status(500).json({ message: 'Failed to create visitor pass' });
    }
});

// GET /api/physical-security/visitor-passes - List recent visitor passes
router.get('/visitor-passes', async (req, res) => {
    try {
        const passes = await VisitorPass.find().sort({ createdAt: -1 }).limit(50);
        res.json(passes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/physical-security/visitor-passes/:id/checkout - Check out a visitor
router.put('/visitor-passes/:id/checkout', requireModuleAction('security', 'edit'), async (req, res) => {
    try {
        const pass = await VisitorPass.findByIdAndUpdate(
            req.params.id,
            { status: 'checked-out', checkedOutAt: new Date() },
            { new: true }
        );
        if (!pass) return res.status(404).json({ message: 'Pass not found' });

        await SecurityLog.create({
            time: new Date().toLocaleTimeString(),
            type: 'Visitor',
            details: `Visitor ${pass.visitorName || 'Unknown'} checked out`,
            severity: 'info',
        });

        res.json(pass);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- BADGE ROUTES ---

// GET /api/physical-security/badges - List all badges
router.get('/badges', async (req, res) => {
    try {
        const badges = await SecurityBadge.find().sort({ createdAt: -1 });
        res.json(badges);
    } catch (error) {
        console.error('Error fetching badges:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/physical-security/badges - Issue a new badge
router.post('/badges', requireModuleAction('security', 'create'), async (req, res) => {
    try {
        const { holderName, department, badgeType, accessLevel, expiresAt, notes, issuedBy } = req.body;
        if (!holderName) return res.status(400).json({ message: 'Holder name is required' });

        // Generate unique badge number: BDG-YYYYMMDD-XXXX
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await SecurityBadge.countDocuments();
        const badgeNumber = `BDG-${dateStr}-${String(count + 1).padStart(4, '0')}`;

        const badge = new SecurityBadge({
            badgeNumber,
            holderName,
            department: department || '',
            badgeType: badgeType || 'Employee',
            accessLevel: accessLevel || 'Restricted',
            issuedBy: issuedBy || 'Security Officer',
            expiresAt: expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            notes: notes || '',
        });
        await badge.save();

        // Log the badge issuance
        await SecurityLog.create({
            time: new Date().toLocaleTimeString(),
            type: 'Access',
            details: `Badge ${badgeNumber} issued to ${holderName} (${badgeType}, ${accessLevel} access)`,
            severity: 'info',
        });

        res.status(201).json(badge);
    } catch (error) {
        console.error('Error issuing badge:', error);
        res.status(500).json({ message: 'Failed to issue badge' });
    }
});

// PUT /api/physical-security/badges/:id/revoke - Revoke a badge
router.put('/badges/:id/revoke', requireModuleAction('security', 'edit'), async (req, res) => {
    try {
        const badge = await SecurityBadge.findByIdAndUpdate(
            req.params.id,
            { status: 'Revoked' },
            { new: true }
        );
        if (!badge) return res.status(404).json({ message: 'Badge not found' });

        await SecurityLog.create({
            time: new Date().toLocaleTimeString(),
            type: 'Access',
            details: `Badge ${badge.badgeNumber} for ${badge.holderName} has been revoked`,
            severity: 'warning',
        });

        res.json(badge);
    } catch (error) {
        console.error('Error revoking badge:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
