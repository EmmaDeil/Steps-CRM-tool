const mongoose = require("mongoose");

const FREQUENCY_DAYS = {
  Daily: 1,
  Weekly: 7,
  Monthly: 30,
  Quarterly: 91,
  "Semi-Annually": 182,
  Yearly: 365,
};

const preventiveMaintenanceScheduleSchema = new mongoose.Schema(
  {
    scheduleNumber: {
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
    },
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },
    frequency: {
      type: String,
      required: true,
      enum: ["Daily", "Weekly", "Monthly", "Quarterly", "Semi-Annually", "Yearly", "Custom"],
    },
    customIntervalDays: {
      type: Number,
      min: 1,
      required: function () {
        return this.frequency === "Custom";
      },
    },
    checklist: [
      {
        item: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
    assignedTeam: {
      type: String,
      trim: true,
      default: "Unassigned",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    startDate: {
      type: Date,
      required: true,
    },
    nextDueDate: {
      type: Date,
      required: true,
    },
    lastCompletedDate: {
      type: Date,
    },
    leadTimeDays: {
      type: Number,
      default: 7,
      min: 0,
    },
    autoGenerateTicket: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    estimatedDuration: {
      type: Number,
      min: 0,
    },
    estimatedCost: {
      type: Number,
      min: 0,
    },
    generatedTickets: [
      {
        ticket: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MaintenanceTicket",
        },
        generatedAt: {
          type: Date,
          default: Date.now,
        },
        cycleDueDate: Date,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Compute the next due date given a reference date and frequency
preventiveMaintenanceScheduleSchema.statics.computeNextDueDate = function (fromDate, frequency, customIntervalDays) {
  const base = new Date(fromDate);
  const days = frequency === "Custom" ? Number(customIntervalDays || 0) : FREQUENCY_DAYS[frequency];
  if (!days || days <= 0) return base;
  base.setDate(base.getDate() + days);
  return base;
};

// Generate unique schedule number before saving
preventiveMaintenanceScheduleSchema.pre("save", async function (next) {
  if (this.isNew && !this.scheduleNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    const count = await mongoose.model("PreventiveMaintenanceSchedule").countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
      },
    });

    this.scheduleNumber = `PM-${year}${month}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

preventiveMaintenanceScheduleSchema.index({ scheduleNumber: 1 });
preventiveMaintenanceScheduleSchema.index({ asset: 1 });
preventiveMaintenanceScheduleSchema.index({ nextDueDate: 1 });
preventiveMaintenanceScheduleSchema.index({ isActive: 1 });

const PreventiveMaintenanceSchedule = mongoose.model(
  "PreventiveMaintenanceSchedule",
  preventiveMaintenanceScheduleSchema
);

module.exports = PreventiveMaintenanceSchedule;
