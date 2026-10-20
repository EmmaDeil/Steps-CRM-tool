const express = require("express");
const router = express.Router();
const PreventiveMaintenanceSchedule = require("../models/PreventiveMaintenanceSchedule");
const MaintenanceTicket = require("../models/MaintenanceTicket");
const Asset = require("../models/Asset");
const NotificationModel = require("../models/Notification");
const { verifyToken } = require("../middleware/auth");
const { requireMaintenanceAction } = require("../middleware/maintenanceAccess");

const PM_TICKET_CATEGORY_BY_ASSET_CATEGORY = {
  HVAC: "HVAC",
  Electrical: "Electrical",
  Plumbing: "Plumbing",
  "IT Equipment": "IT Equipment",
  Vehicle: "General Maintenance",
  Furniture: "General Maintenance",
  "Safety Equipment": "Safety & Security",
  Machinery: "General Maintenance",
  Other: "General Maintenance",
};

// Generates a MaintenanceTicket for a due preventive maintenance cycle,
// records it on the schedule, and advances nextDueDate. Shared between the
// manual "generate-now" endpoint and the automated daily job in index.js.
const generateTicketForSchedule = async (schedule, userId) => {
  const asset = await Asset.findById(schedule.asset);

  const ticket = new MaintenanceTicket({
    title: `[Preventive Maintenance] ${schedule.title}`,
    description:
      schedule.description ||
      `Scheduled preventive maintenance for ${asset?.name || "asset"} (${schedule.scheduleNumber}).`,
    category: PM_TICKET_CATEGORY_BY_ASSET_CATEGORY[asset?.category] || "General Maintenance",
    location: asset?.location || { building: "Unspecified" },
    priority: "Medium",
    reportedBy: userId,
    assignedTeam: schedule.assignedTeam,
    assignedTo: schedule.assignedTo || undefined,
    relatedAsset: schedule.asset,
    relatedPMSchedule: schedule._id,
    dueDate: schedule.nextDueDate,
  });
  await ticket.save();

  schedule.generatedTickets.push({
    ticket: ticket._id,
    generatedAt: new Date(),
    cycleDueDate: schedule.nextDueDate,
  });
  schedule.lastCompletedDate = schedule.nextDueDate;
  schedule.nextDueDate = PreventiveMaintenanceSchedule.computeNextDueDate(
    schedule.nextDueDate,
    schedule.frequency,
    schedule.customIntervalDays
  );
  await schedule.save();

  await NotificationModel.create({
    title: `Preventive maintenance ticket created: ${ticket.ticketNumber}`,
    message: `${schedule.title} generated ticket ${ticket.ticketNumber} for ${asset?.name || "asset"}.`,
    type: "info",
    category: "maintenance",
    source: "preventive-maintenance-job",
    sourceKey: `pm-ticket-${schedule._id}-${ticket._id}`,
    metadata: {
      scheduleId: schedule._id,
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
    },
  }).catch((err) => console.error("Error creating PM notification:", err));

  return ticket;
};

// Get all preventive maintenance schedules
router.get("/", verifyToken, async (req, res) => {
  try {
    const { asset, isActive, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (asset) filter.asset = asset;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [schedules, total] = await Promise.all([
      PreventiveMaintenanceSchedule.find(filter)
        .populate("asset", "assetTag name category")
        .populate("assignedTo", "firstName lastName email")
        .sort({ nextDueDate: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      PreventiveMaintenanceSchedule.countDocuments(filter),
    ]);

    res.json({
      schedules,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching preventive maintenance schedules:", error);
    res.status(500).json({ error: "Failed to fetch preventive maintenance schedules" });
  }
});

// Get schedules due within the next N days (default 30)
router.get("/upcoming", verifyToken, async (req, res) => {
  try {
    const days = Number(req.query.days || 30);
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const schedules = await PreventiveMaintenanceSchedule.find({
      isActive: true,
      nextDueDate: { $lte: cutoff },
    })
      .populate("asset", "assetTag name category location")
      .sort({ nextDueDate: 1 })
      .lean();

    res.json({ schedules });
  } catch (error) {
    console.error("Error fetching upcoming preventive maintenance:", error);
    res.status(500).json({ error: "Failed to fetch upcoming preventive maintenance" });
  }
});

// Get single schedule
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const schedule = await PreventiveMaintenanceSchedule.findById(req.params.id)
      .populate("asset", "assetTag name category location")
      .populate("assignedTo", "firstName lastName email")
      .populate("generatedTickets.ticket", "ticketNumber status");

    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }

    res.json(schedule);
  } catch (error) {
    console.error("Error fetching schedule:", error);
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});

// Create schedule
router.post("/", verifyToken, requireMaintenanceAction("canManagePreventiveMaintenance"), async (req, res) => {
  try {
    const { frequency, customIntervalDays, startDate } = req.body;
    const nextDueDate =
      req.body.nextDueDate ||
      PreventiveMaintenanceSchedule.computeNextDueDate(startDate || new Date(), frequency, customIntervalDays);

    const schedule = new PreventiveMaintenanceSchedule({
      ...req.body,
      nextDueDate,
      createdBy: req.user._id,
    });
    await schedule.save();
    await schedule.populate("asset", "assetTag name category");

    res.status(201).json({
      message: "Preventive maintenance schedule created successfully",
      schedule,
    });
  } catch (error) {
    console.error("Error creating schedule:", error);
    res.status(500).json({ error: "Failed to create schedule" });
  }
});

// Update schedule
router.put("/:id", verifyToken, requireMaintenanceAction("canManagePreventiveMaintenance"), async (req, res) => {
  try {
    const schedule = await PreventiveMaintenanceSchedule.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("asset", "assetTag name category");

    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }

    res.json({
      message: "Schedule updated successfully",
      schedule,
    });
  } catch (error) {
    console.error("Error updating schedule:", error);
    res.status(500).json({ error: "Failed to update schedule" });
  }
});

// Manually trigger ticket generation for the current cycle
router.post(
  "/:id/generate-now",
  verifyToken,
  requireMaintenanceAction("canManagePreventiveMaintenance"),
  async (req, res) => {
    try {
      const schedule = await PreventiveMaintenanceSchedule.findById(req.params.id);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      const ticket = await generateTicketForSchedule(schedule, req.user._id);

      res.json({ message: "Maintenance ticket generated successfully", ticket });
    } catch (error) {
      console.error("Error generating ticket from schedule:", error);
      res.status(500).json({ error: "Failed to generate ticket from schedule" });
    }
  }
);

// Delete (deactivate) schedule
router.delete("/:id", verifyToken, requireMaintenanceAction("canDeleteRecords"), async (req, res) => {
  try {
    const schedule = await PreventiveMaintenanceSchedule.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }

    res.json({ message: "Schedule deleted successfully" });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    res.status(500).json({ error: "Failed to delete schedule" });
  }
});

module.exports = router;
module.exports.generateTicketForSchedule = generateTicketForSchedule;
