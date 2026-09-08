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
  },
  {
    timestamps: true,
  }
);

// Generate unique ticket number before saving
maintenanceTicketSchema.pre("save", async function (next) {
  if (this.isNew && !this.ticketNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    
    // Count today's tickets to generate sequential number
    const count = await mongoose.model("MaintenanceTicket").countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
      },
    });
    
    this.ticketNumber = `MT-${year}${month}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
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
