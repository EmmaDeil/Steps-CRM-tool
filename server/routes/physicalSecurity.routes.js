const express = require('express');
const router = express.Router();
const { CameraFeed, SecurityLog, SecurityPersonnel } = require('../models/PhysicalSecurity');
const { checkSecurityRole } = require('../middleware/securityAuth'); // Reusing existing role check

// Protect all physical security routes. Assuming Admins and standard users with 'Security' access can view.
// In a real system, you might refine this.
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
router.post('/cameras', async (req, res) => {
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
router.put('/cameras/:id', async (req, res) => {
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
        // In a real app, you'd paginate this.
        const logs = await SecurityLog.find().sort({ createdAt: -1 }).limit(50);
        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/physical-security/logs (For guards logging visitor entry, or systems logging faults)
router.post('/logs', async (req, res) => {
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

module.exports = router;
