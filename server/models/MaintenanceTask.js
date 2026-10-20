const mongoose = require("mongoose");

const maintenanceTaskSchema = new mongoose.Schema(
  {
    taskNumber: {
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
    category: {
      type: String,
      enum: ["Inspection", "Cleaning", "Repair", "Administrative", "Safety Check", "Other"],
      default: "Other",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "Cancelled"],
      default: "Pending",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedTeam: {
      type: String,
      trim: true,
      default: "Unassigned",
    },
    relatedAsset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
    },
    dueDate: {
      type: Date,
    },
    completedDate: {
      type: Date,
    },
    checklist: [
      {
        item: {
          type: String,
          required: true,
          trim: true,
        },
        isDone: {
          type: Boolean,
          default: false,
        },
        completedAt: Date,
        completedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique task number before saving
maintenanceTaskSchema.pre("save", async function (next) {
  if (this.isNew && !this.taskNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    const count = await mongoose.model("MaintenanceTask").countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
      },
    });

    this.taskNumber = `TASK-${year}${month}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

maintenanceTaskSchema.index({ taskNumber: 1 });
maintenanceTaskSchema.index({ status: 1 });
maintenanceTaskSchema.index({ priority: 1 });
maintenanceTaskSchema.index({ assignedTo: 1 });
maintenanceTaskSchema.index({ relatedAsset: 1 });
maintenanceTaskSchema.index({ createdAt: -1 });

const MaintenanceTask = mongoose.model("MaintenanceTask", maintenanceTaskSchema);

module.exports = MaintenanceTask;
