const express = require("express");
const router = express.Router();
const ApprovalRule = require("../models/ApprovalRule");

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
    const ruleData = {
      ...req.body
    };
    
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
    res.status(500).json({ error: "Failed to create approval rule", details: error.message });
  }
});

// PUT update a rule
router.put("/:id", async (req, res) => {
  try {
    const updatedRule = await ApprovalRule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedRule) {
      return res.status(404).json({ error: "Rule not found" });
    }
    res.json(updatedRule);
  } catch (error) {
    console.error("Error updating approval rule:", error);
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
