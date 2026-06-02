const mongoose = require("mongoose");

const maintenanceTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      unique: true,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "HVAC",
        "Plumbing",
        "Electrical",
        "Carpentry",
        "Painting",
        "Cleaning",
        "Landscaping",
        "IT Equipment",
        "Safety & Security",
        "General Maintenance",
        "Item Movement",
        "Other",
      ],
    },
    location: {
      building: {
        type: String,
        required: true,
      },
      floor: {
        type: String,
      },
      room: {
        type: String,
      },
      specificLocation: {
        type: String,
      },
    },
    priority: {
      type: String,
      required: true,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    status: {
      type: String,
      required: true,
      enum: ["Open", "Assigned", "In Progress", "On Hold", "Completed", "Cancelled"],
      default: "Open",
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedTeam: {
      type: String,
      enum: ["HVAC Team", "Plumbing Team", "Electrical Team", "General Maintenance", "IT Support", "Security Team", "Unassigned"],
      default: "Unassigned",
    },
    estimatedCost: {
      type: Number,
      min: 0,
    },
    actualCost: {
      type: Number,
      min: 0,
    },
    scheduledDate: {
      type: Date,
    },
    completedDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
    },
    attachments: [
      {
        filename: String,
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        comment: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    workLog: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        action: String,
        description: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    recurrence: {
      isRecurring: {
        type: Boolean,
        default: false,
      },
      frequency: {
        type: String,
        enum: ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"],
      },
      nextScheduledDate: Date,
    },
    isEmergency: {
      type: Boolean,
      default: false,
    },
    resolutionNotes: {
      type: String,
    },
    movementType: {
      type: String,
      enum: ["Temporary", "Permanent"],
    },
    returnDate: {
      type: Date,
    },
    fromLocation: {
      type: String,
    },
    toLocation: {
      type: String,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique ticket number before validation so required validation passes
maintenanceTicketSchema.pre("validate", async function (next) {
  if (!this.isNew || this.ticketNumber) return next();

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `MT-${year}${month}-`;

    // Find the latest ticket with this prefix (highest sequence number)
    const latestTicket = await mongoose.model("MaintenanceTicket")
      .findOne({ ticketNumber: new RegExp(`^${prefix}`) })
      .sort({ ticketNumber: -1 })
      .exec();

    let sequence = 1;
    if (latestTicket && latestTicket.ticketNumber) {
      const parts = latestTicket.ticketNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    this.ticketNumber = `${prefix}${String(sequence).padStart(4, "0")}`;
    next();
  } catch (error) {
    next(error);
  }
});

// Add indexes for better query performance
maintenanceTicketSchema.index({ ticketNumber: 1 });
maintenanceTicketSchema.index({ status: 1 });
maintenanceTicketSchema.index({ priority: 1 });
maintenanceTicketSchema.index({ assignedTo: 1 });
maintenanceTicketSchema.index({ reportedBy: 1 });
maintenanceTicketSchema.index({ category: 1 });
maintenanceTicketSchema.index({ createdAt: -1 });

const MaintenanceTicket = mongoose.model("MaintenanceTicket", maintenanceTicketSchema);

module.exports = MaintenanceTicket;
