const express = require("express");
const router = express.Router();
const MaintenanceTicket = require("../models/MaintenanceTicket");
const User = require('../models/User');
const { verifyToken } = require("../middleware/auth");
const { requireModuleAction } = require('../middleware/moduleAccess');
const { transporter } = require('../utils/emailService');
const { hasModuleAction } = require('../utils/moduleAccess');

// Get all maintenance tickets with filtering and pagination
router.get("/", verifyToken, requireModuleAction('facility', 'view'), async (req, res) => {
  try {
    const {
      status,
      priority,
      category,
      assignedTo,
      reportedBy,
      mine,
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (reportedBy) filter.reportedBy = reportedBy;
    if (mine === 'true') filter.reportedBy = req.user._id;

    // Add search functionality
    if (search) {
      filter.$or = [
        { ticketNumber: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { "location.building": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    const [tickets, total] = await Promise.all([
      MaintenanceTicket.find(filter)
        .populate("reportedBy", "firstName lastName email")
        .populate("assignedTo", "firstName lastName email")
        .populate("comments.user", "firstName lastName")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      MaintenanceTicket.countDocuments(filter),
    ]);

    res.json({
      tickets,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching maintenance tickets:", error);
    res.status(500).json({ error: "Failed to fetch maintenance tickets" });
  }
});

// Get dashboard statistics
router.get("/stats", verifyToken, requireModuleAction('facility', 'view'), async (req, res) => {
  try {
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      completedTickets,
      urgentTickets,
      statusBreakdown,
      priorityBreakdown,
      categoryBreakdown,
    ] = await Promise.all([
      MaintenanceTicket.countDocuments(),
      MaintenanceTicket.countDocuments({ status: "Open" }),
      MaintenanceTicket.countDocuments({ status: "In Progress" }),
      MaintenanceTicket.countDocuments({ status: "Completed" }),
      MaintenanceTicket.countDocuments({ priority: "Urgent" }),
      MaintenanceTicket.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      MaintenanceTicket.aggregate([
        {
          $group: {
            _id: "$priority",
            count: { $sum: 1 },
          },
        },
      ]),
      MaintenanceTicket.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // Calculate average completion time
    const completedWithDates = await MaintenanceTicket.find({
      status: "Completed",
      completedDate: { $exists: true },
    })
      .select("createdAt completedDate")
      .lean();

    const avgCompletionTime = completedWithDates.length
      ? completedWithDates.reduce((sum, ticket) => {
          const duration = ticket.completedDate - ticket.createdAt;
          return sum + duration;
        }, 0) / completedWithDates.length
      : 0;

    // Convert to days
    const avgDays = Math.round(avgCompletionTime / (1000 * 60 * 60 * 24));

    res.json({
      summary: {
        totalTickets,
        openTickets,
        inProgressTickets,
        completedTickets,
        urgentTickets,
        avgCompletionDays: avgDays,
      },
      breakdowns: {
        status: statusBreakdown,
        priority: priorityBreakdown,
        category: categoryBreakdown,
      },
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// Get per-ticket timeline analytics (time to assign, in-progress, completion)
router.get("/analytics/times", verifyToken, requireModuleAction('facility', 'view'), async (req, res) => {
  try {
    const tickets = await MaintenanceTicket.find()
      .select('ticketNumber title createdAt completedDate workLog status')
      .lean();

    const rows = tickets.map((t) => {
      const createdAt = t.createdAt ? new Date(t.createdAt) : null;

      // Worklog entries may include actions like 'Assigned', 'In Progress', 'Completed'
      const assignedEntry = (t.workLog || []).find(w => /assign(ed)?/i.test(w.action));
      const inProgressEntry = (t.workLog || []).find(w => /in progress/i.test(w.action) || /start(ed)?/i.test(w.action));
      const completedEntry = (t.workLog || []).find(w => /complete(d)?/i.test(w.action));

      const assignedAt = assignedEntry ? new Date(assignedEntry.timestamp) : null;
      const inProgressAt = inProgressEntry ? new Date(inProgressEntry.timestamp) : null;
      const completedAt = t.completedDate ? new Date(t.completedDate) : (completedEntry ? new Date(completedEntry.timestamp) : null);

      const durToAssign = assignedAt && createdAt ? (assignedAt - createdAt) : null;
      const durToInProgress = inProgressAt && (assignedAt || createdAt) ? (inProgressAt - (assignedAt || createdAt)) : null;
      const durToComplete = completedAt && createdAt ? (completedAt - createdAt) : null;
      const durInProgressToComplete = completedAt && inProgressAt ? (completedAt - inProgressAt) : null;

      return {
        _id: t._id,
        ticketNumber: t.ticketNumber,
        title: t.title,
        createdAt,
        assignedAt,
        inProgressAt,
        completedAt,
        durToAssign,
        durToInProgress,
        durToComplete,
        durInProgressToComplete,
        status: t.status,
      };
    });

    // Summary averages (ms)
    const nonNull = (arr) => arr.filter(x => x != null);
    const avg = (arr) => {
      const a = nonNull(arr);
      if (a.length === 0) return null;
      return Math.round(a.reduce((s,v) => s + v, 0) / a.length);
    };

    const avgToAssign = avg(rows.map(r => r.durToAssign));
    const avgToComplete = avg(rows.map(r => r.durToComplete));
    const avgInProgressToComplete = avg(rows.map(r => r.durInProgressToComplete));

    res.json({
      tickets: rows,
      summary: {
        avgToAssign,
        avgToComplete,
        avgInProgressToComplete,
        totalTickets: rows.length,
        completedCount: rows.filter(r => r.completedAt != null).length,
      }
    });
  } catch (error) {
    console.error('Error generating ticket timeline analytics:', error);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

// Get single ticket by ID
router.get("/:id", verifyToken, requireModuleAction('facility', 'view'), async (req, res) => {
  try {
    const ticket = await MaintenanceTicket.findById(req.params.id)
      .populate("reportedBy", "firstName lastName email department")
      .populate("assignedTo", "firstName lastName email department")
      .populate("comments.user", "firstName lastName")
      .populate("workLog.user", "firstName lastName");

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    res.json(ticket);
  } catch (error) {
    console.error("Error fetching ticket:", error);
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
});

// Create new maintenance ticket
router.post("/", verifyToken, requireModuleAction('facility', 'create'), async (req, res) => {
  try {
    const ticketData = {
      ...req.body,
      reportedBy: req.user._id,
    };

    const ticket = new MaintenanceTicket(ticketData);
    await ticket.save();

    // Populate before sending response
    await ticket.populate("reportedBy", "firstName lastName email");

    res.status(201).json({
      message: "Maintenance ticket created successfully",
      ticket,
    });

    // Add initial work log entry and save asynchronously (don't block response)
    (async () => {
      try {
        ticket.workLog = ticket.workLog || [];
        ticket.workLog.push({
          user: req.user._id,
          action: 'Created',
          description: `Ticket created by ${req.user.firstName || ''} ${req.user.lastName || ''}`,
          timestamp: new Date(),
        });
        // Save the workLog change, ignore errors
        await ticket.save();
      } catch (e) {
        console.error('Error adding initial workLog entry:', e);
      }
    })();

    // Send notification emails asynchronously (don't block response)
    (async () => {
      try {
        const requesterEmail = ticket.reportedBy?.email || req.user.email;

        // Find facility staff by role or department (case-insensitive match)
        const facilityStaff = await User.find({
          status: 'Active',
          $or: [
            { role: { $regex: /facility/i } },
            { department: { $regex: /facility/i } },
          ],
        }).select('email firstName lastName');

        const facilityEmails = facilityStaff.map((u) => u.email).filter(Boolean);

        const recipients = Array.from(new Set([requesterEmail, ...facilityEmails]));

        if (recipients.length > 0 && transporter) {
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipients.join(', '),
            subject: `New Maintenance Ticket: ${ticket.ticketNumber || ''} - ${ticket.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto;">
                <h2 style="color: #0d6efd;">New Maintenance Ticket Created</h2>
                <p>A new maintenance ticket has been submitted.</p>
                <p><strong>Ticket:</strong> ${ticket.ticketNumber || 'N/A'}</p>
                <p><strong>Title:</strong> ${ticket.title}</p>
                <p><strong>Priority:</strong> ${ticket.priority}</p>
                <p><strong>Category:</strong> ${ticket.category}</p>
                <p><strong>Location:</strong> ${ticket.location?.building || ''} ${ticket.location?.floor ? '- ' + ticket.location.floor : ''} ${ticket.location?.room ? '- ' + ticket.location.room : ''}</p>
                <p><strong>Reported By:</strong> ${ticket.reportedBy?.firstName || req.user.firstName} ${ticket.reportedBy?.lastName || req.user.lastName} (${requesterEmail})</p>
                <p style="margin-top: 12px;">${ticket.description || ''}</p>
                <p style="margin-top:20px; font-size:12px; color:#666;">This is an automated notification from the StepsProject system.</p>
              </div>
            `,
          };

          if (process.env.NODE_ENV !== 'production') {
            console.log('📧 Maintenance notification (dev mode) would be sent to:', recipients);
            console.log('Mail subject:', mailOptions.subject);
          } else {
            await transporter.sendMail(mailOptions);
          }
        }
      } catch (err) {
        console.error('Error sending maintenance notification emails:', err);
      }
    })();
  } catch (error) {
    console.error("Error creating ticket:", error);
    // Surface validation and duplicate-key errors to the client for debugging
    if (error && error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error && (error.code === 11000 || error.code === '11000')) {
      return res.status(409).json({ error: 'Duplicate key error', details: error.keyValue || error.keyValues || {} });
    }

    res.status(500).json({ error: "Failed to create ticket" });
  }
});

// Update maintenance ticket
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Fetch ticket to check ownership and current state
    const ticket = await MaintenanceTicket.findById(id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const isOwner = ticket.reportedBy && ticket.reportedBy.toString() === req.user._id.toString();
    const hasEditPerm = hasModuleAction(req.user, 'facility', 'edit');

    if (!isOwner && !hasEditPerm) {
      return res.status(403).json({ error: 'Insufficient permissions to update ticket' });
    }

    // Detect and record meaningful changes into workLog (assignedTo, status changes, updates)
    ticket.workLog = ticket.workLog || [];

    // If assignedTo changed
    if (updateData.assignedTo && (!ticket.assignedTo || ticket.assignedTo.toString() !== updateData.assignedTo.toString())) {
      ticket.workLog.push({
        user: req.user._id,
        action: 'Assigned',
        description: `Assigned to ${updateData.assignedTo}`,
        timestamp: new Date(),
      });
    }

    // If status is being updated to Completed, set completedDate and log
    if (updateData.status && updateData.status === 'Completed' && !ticket.completedDate) {
      updateData.completedDate = new Date();
      ticket.workLog.push({
        user: req.user._id,
        action: 'Completed',
        description: `Marked completed by ${req.user.firstName} ${req.user.lastName}`,
        timestamp: new Date(),
      });
    }

    // If status is being updated to In Progress
    if (updateData.status && /in progress/i.test(updateData.status) && !/in progress/i.test(ticket.status || '')) {
      ticket.workLog.push({
        user: req.user._id,
        action: 'In Progress',
        description: `Marked In Progress by ${req.user.firstName} ${req.user.lastName}`,
        timestamp: new Date(),
      });
    }

    // Apply remaining updates
    Object.assign(ticket, updateData);

    // Generic update entry
    ticket.workLog.push({
      user: req.user._id,
      action: 'Updated',
      description: `Ticket updated by ${req.user.firstName} ${req.user.lastName}`,
      timestamp: new Date(),
    });

    await ticket.save();
    await ticket.populate("reportedBy", "firstName lastName email");
    await ticket.populate("assignedTo", "firstName lastName email");

    res.json({
      message: "Ticket updated successfully",
      ticket,
    });
  } catch (error) {
    console.error("Error updating ticket:", error);
    res.status(500).json({ error: "Failed to update ticket" });
  }
});

// Add comment to ticket
router.post("/:id/comments", verifyToken, requireModuleAction('facility', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: "Comment cannot be empty" });
    }

    const ticket = await MaintenanceTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    ticket.comments.push({
      user: req.user._id,
      comment: comment.trim(),
      timestamp: new Date(),
    });

    await ticket.save();
    await ticket.populate("comments.user", "firstName lastName");

    res.json({
      message: "Comment added successfully",
      comments: ticket.comments,
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// Assign ticket to technician
router.post("/:id/assign", verifyToken, requireModuleAction('facility', 'approve'), async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo, assignedTeam } = req.body;

    const ticket = await MaintenanceTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    if (assignedTo) ticket.assignedTo = assignedTo;
    if (assignedTeam) ticket.assignedTeam = assignedTeam;
    
    if (ticket.status === "Open") {
      ticket.status = "Assigned";
    }

    // Add to work log
    ticket.workLog.push({
      user: req.user._id,
      action: "Assigned",
      description: `Ticket assigned by ${req.user.firstName} ${req.user.lastName}`,
      timestamp: new Date(),
    });

    await ticket.save();
    await ticket.populate("assignedTo", "firstName lastName email");

    res.json({
      message: "Ticket assigned successfully",
      ticket,
    });
  } catch (error) {
    console.error("Error assigning ticket:", error);
    res.status(500).json({ error: "Failed to assign ticket" });
  }
});

// Delete maintenance ticket
router.delete("/:id", verifyToken, requireModuleAction('facility', 'delete'), async (req, res) => {
  try {
    const ticket = await MaintenanceTicket.findByIdAndDelete(req.params.id);

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    res.json({ message: "Ticket deleted successfully" });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    res.status(500).json({ error: "Failed to delete ticket" });
  }
});

module.exports = router;
