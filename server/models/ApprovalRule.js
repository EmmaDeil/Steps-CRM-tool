const mongoose = require("mongoose");

const approvalLevelSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: true,
  },
  approverRole: {
    type: String,
    required: true,
    enum: [
      "Direct Manager",
      "Department Head",
      "Finance Manager",
      "HR Director",
      "Admin", // Can be expanded based on role system
    ],
  },
});

const approvalRuleSchema = new mongoose.Schema(
  {
    moduleType: {
      type: String,
      required: true,
      enum: [
        "Advance Requests",
        "Leave Requests",
        "Refund Requests",
        "Purchase Orders",
        "Material Requests",
      ],
    },
    condition: {
      type: [String],
      default: ["All Requests"],
    },
    levels: {
      type: [approvalLevelSchema],
      required: true,
      validate: [
        (val) => val.length > 0,
        "Approval rule must have at least one level.",
      ],
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Made optional to allow system-created rules
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ApprovalRule", approvalRuleSchema);
