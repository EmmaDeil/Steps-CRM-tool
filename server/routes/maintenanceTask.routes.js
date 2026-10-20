const express = require("express");
const router = express.Router();
const MaintenanceTask = require("../models/MaintenanceTask");
const { verifyToken } = require("../middleware/auth");
const { requireMaintenanceAction } = require("../middleware/maintenanceAccess");

// Get all tasks with filtering and pagination
router.get("/", verifyToken, async (req, res) => {
  try {
    const {
      status,
      priority,
      category,
      assignedTo,
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assignedTo) filter.assignedTo = assignedTo;

    if (search) {
      filter.$or = [
        { taskNumber: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    const [tasks, total] = await Promise.all([
      MaintenanceTask.find(filter)
        .populate("assignedTo", "firstName lastName email")
        .populate("relatedAsset", "assetTag name")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      MaintenanceTask.countDocuments(filter),
    ]);

    res.json({
      tasks,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// Get task statistics
router.get("/stats", verifyToken, async (req, res) => {
  try {
    const [total, pending, inProgress, completed] = await Promise.all([
      MaintenanceTask.countDocuments(),
      MaintenanceTask.countDocuments({ status: "Pending" }),
      MaintenanceTask.countDocuments({ status: "In Progress" }),
      MaintenanceTask.countDocuments({ status: "Completed" }),
    ]);

    res.json({ summary: { total, pending, inProgress, completed } });
  } catch (error) {
    console.error("Error fetching task statistics:", error);
    res.status(500).json({ error: "Failed to fetch task statistics" });
  }
});

// Get single task by ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const task = await MaintenanceTask.findById(req.params.id)
      .populate("assignedTo", "firstName lastName email department")
      .populate("relatedAsset", "assetTag name")
      .populate("comments.user", "firstName lastName")
      .populate("checklist.completedBy", "firstName lastName");

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// Create new task
router.post("/", verifyToken, requireMaintenanceAction("canManageTasks"), async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const task = new MaintenanceTask(taskData);
    await task.save();
    await task.populate("assignedTo", "firstName lastName email");

    res.status(201).json({
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// Update task
router.put("/:id", verifyToken, requireMaintenanceAction("canManageTasks"), async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (updateData.status === "Completed" && !updateData.completedDate) {
      updateData.completedDate = new Date();
    }

    const task = await MaintenanceTask.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("assignedTo", "firstName lastName email")
      .populate("relatedAsset", "assetTag name");

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({
      message: "Task updated successfully",
      task,
    });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// Toggle a checklist item
router.patch("/:id/checklist/:itemId", verifyToken, async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { isDone } = req.body;

    const task = await MaintenanceTask.findById(id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const item = task.checklist.id(itemId);
    if (!item) {
      return res.status(404).json({ error: "Checklist item not found" });
    }

    item.isDone = !!isDone;
    item.completedAt = isDone ? new Date() : null;
    item.completedBy = isDone ? req.user._id : null;

    await task.save();
    await task.populate("checklist.completedBy", "firstName lastName");

    res.json({ message: "Checklist updated successfully", checklist: task.checklist });
  } catch (error) {
    console.error("Error updating checklist item:", error);
    res.status(500).json({ error: "Failed to update checklist item" });
  }
});

// Add comment to task
router.post("/:id/comments", verifyToken, async (req, res) => {
  try {
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: "Comment cannot be empty" });
    }

    const task = await MaintenanceTask.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    task.comments.push({
      user: req.user._id,
      comment: comment.trim(),
      timestamp: new Date(),
    });

    await task.save();
    await task.populate("comments.user", "firstName lastName");

    res.json({ message: "Comment added successfully", comments: task.comments });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// Delete task
router.delete("/:id", verifyToken, requireMaintenanceAction("canDeleteRecords"), async (req, res) => {
  try {
    const task = await MaintenanceTask.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

module.exports = router;
