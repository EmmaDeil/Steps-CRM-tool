const express = require("express");
const router = express.Router();
const Asset = require("../models/Asset");
const MaintenanceTicket = require("../models/MaintenanceTicket");
const PreventiveMaintenanceSchedule = require("../models/PreventiveMaintenanceSchedule");
const { verifyToken } = require("../middleware/auth");
const { requireMaintenanceAction } = require("../middleware/maintenanceAccess");

// Get all assets with filtering and pagination
router.get("/", verifyToken, async (req, res) => {
  try {
    const {
      category,
      status,
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter = { isActive: true };
    if (category) filter.category = category;
    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { assetTag: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { serialNumber: { $regex: search, $options: "i" } },
        { "location.building": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    const [assets, total] = await Promise.all([
      Asset.find(filter)
        .populate("custodian", "firstName lastName email")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Asset.countDocuments(filter),
    ]);

    res.json({
      assets,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching assets:", error);
    res.status(500).json({ error: "Failed to fetch assets" });
  }
});

// Get asset statistics
router.get("/stats", verifyToken, async (req, res) => {
  try {
    const [total, operational, underMaintenance, outOfService, categoryBreakdown] = await Promise.all([
      Asset.countDocuments({ isActive: true }),
      Asset.countDocuments({ isActive: true, status: "Operational" }),
      Asset.countDocuments({ isActive: true, status: "Under Maintenance" }),
      Asset.countDocuments({ isActive: true, status: "Out of Service" }),
      Asset.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      summary: { total, operational, underMaintenance, outOfService },
      breakdowns: { category: categoryBreakdown },
    });
  } catch (error) {
    console.error("Error fetching asset statistics:", error);
    res.status(500).json({ error: "Failed to fetch asset statistics" });
  }
});

// Get single asset by ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id).populate(
      "custodian",
      "firstName lastName email department"
    );

    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    res.json(asset);
  } catch (error) {
    console.error("Error fetching asset:", error);
    res.status(500).json({ error: "Failed to fetch asset" });
  }
});

// Get asset maintenance history (tickets + preventive maintenance schedules)
router.get("/:id/history", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [tickets, schedules] = await Promise.all([
      MaintenanceTicket.find({ relatedAsset: id })
        .select("ticketNumber title status priority category createdAt completedDate")
        .sort({ createdAt: -1 })
        .lean(),
      PreventiveMaintenanceSchedule.find({ asset: id })
        .select("scheduleNumber title frequency nextDueDate lastCompletedDate isActive")
        .sort({ nextDueDate: 1 })
        .lean(),
    ]);

    res.json({ tickets, schedules });
  } catch (error) {
    console.error("Error fetching asset history:", error);
    res.status(500).json({ error: "Failed to fetch asset history" });
  }
});

// Create new asset
router.post("/", verifyToken, requireMaintenanceAction("canManageAssets"), async (req, res) => {
  try {
    const assetData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const asset = new Asset(assetData);
    await asset.save();
    await asset.populate("custodian", "firstName lastName email");

    res.status(201).json({
      message: "Asset created successfully",
      asset,
    });
  } catch (error) {
    console.error("Error creating asset:", error);
    res.status(500).json({ error: "Failed to create asset" });
  }
});

// Update asset
router.put("/:id", verifyToken, requireMaintenanceAction("canManageAssets"), async (req, res) => {
  try {
    const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("custodian", "firstName lastName email");

    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    res.json({
      message: "Asset updated successfully",
      asset,
    });
  } catch (error) {
    console.error("Error updating asset:", error);
    res.status(500).json({ error: "Failed to update asset" });
  }
});

// Delete (deactivate) asset
router.delete("/:id", verifyToken, requireMaintenanceAction("canDeleteRecords"), async (req, res) => {
  try {
    const asset = await Asset.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    res.json({ message: "Asset deleted successfully" });
  } catch (error) {
    console.error("Error deleting asset:", error);
    res.status(500).json({ error: "Failed to delete asset" });
  }
});

module.exports = router;
