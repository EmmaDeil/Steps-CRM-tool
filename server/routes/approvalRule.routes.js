const express = require("express");
const router = express.Router();
const ApprovalRule = require("../models/ApprovalRule");

const normalizeApproverRole = (role) =>
  role === "Direct Manager" ? "Manager" : role;

const sanitizeRulePayload = (payload = {}) => {
  const clean = {};

  if (payload.moduleType !== undefined) {
    clean.moduleType = String(payload.moduleType).trim();
  }

  if (payload.condition !== undefined) {
    if (Array.isArray(payload.condition)) {
      const normalizedConditions = payload.condition
        .map((cond) => String(cond || "").trim())
        .filter(Boolean);
      clean.condition = normalizedConditions.length
        ? normalizedConditions
        : ["All Requests"];
    } else {
      const single = String(payload.condition || "").trim();
      clean.condition = [single || "All Requests"];
    }
  }

  if (payload.levels !== undefined) {
    clean.levels = Array.isArray(payload.levels)
      ? payload.levels.map((level, index) => ({
          level: Number(level?.level) || index + 1,
          approverRole: normalizeApproverRole(level?.approverRole),
        }))
      : [];
  }

  if (payload.status !== undefined) {
    clean.status = String(payload.status).trim();
  }

  return clean;
};

// GET all rules
router.get("/", async (req, res) => {
  try {
    const rules = await ApprovalRule.find().populate("createdBy", "name email");
    console.log(`Found ${rules.length} approval rules`);
    res.json(rules);
  } catch (error) {
    console.error("Error fetching approval rules:", error);
    res.status(500).json({ error: "Failed to fetch approval rules" });
  }
});

// GET a specific rule
router.get("/:id", async (req, res) => {
  try {
    const rule = await ApprovalRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ error: "Rule not found" });
    }
    res.json(rule);
  } catch (error) {
    console.error("Error fetching approval rule:", error);
    res.status(500).json({ error: "Failed to fetch approval rule" });
  }
});

// POST create a rule
router.post("/", async (req, res) => {
  try {
    console.log("Creating approval rule with data:", req.body);
    const ruleData = sanitizeRulePayload(req.body);
    
    // Only add createdBy if user exists
    if (req.user) {
      ruleData.createdBy = req.user._id || req.user.id;
    }
    
    const newRule = new ApprovalRule(ruleData);
    const savedRule = await newRule.save();
    console.log("Approval rule created successfully:", savedRule._id);
    res.status(201).json(savedRule);
  } catch (error) {
    console.error("Error creating approval rule:", error);
    if (error?.name === "ValidationError" || error?.name === "CastError") {
      return res.status(400).json({
        error: "Invalid approval rule data",
        details: error.message,
      });
    }
    res
      .status(500)
      .json({ error: "Failed to create approval rule", details: error.message });
  }
});

// PUT update a rule
router.put("/:id", async (req, res) => {
  try {
    const updateData = sanitizeRulePayload(req.body);
    const updatedRule = await ApprovalRule.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!updatedRule) {
      return res.status(404).json({ error: "Rule not found" });
    }
    res.json(updatedRule);
  } catch (error) {
    console.error("Error updating approval rule:", error);
    if (error?.name === "ValidationError" || error?.name === "CastError") {
      return res.status(400).json({
        error: "Invalid approval rule data",
        details: error.message,
      });
    }
    res.status(500).json({ error: "Failed to update approval rule" });
  }
});

// DELETE a rule
router.delete("/:id", async (req, res) => {
  try {
    const deletedRule = await ApprovalRule.findByIdAndDelete(req.params.id);
    if (!deletedRule) {
      return res.status(404).json({ error: "Rule not found" });
    }
    res.json({ message: "Rule successfully deleted" });
  } catch (error) {
    console.error("Error deleting approval rule:", error);
    res.status(500).json({ error: "Failed to delete approval rule" });
  }
});

module.exports = router;
