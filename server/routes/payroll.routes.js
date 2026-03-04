const express = require('express');
const router = express.Router();
const PayrollRun = require('../models/PayrollRun');
const { checkSecurityRole } = require('../middleware/securityAuth');

// GET all historical payroll runs
router.get('/runs', async (req, res) => {
  try {
    const runs = await PayrollRun.find().sort({ createdAt: -1 });
    res.json(runs);
  } catch (err) {
    console.error('Error fetching payroll runs:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// GET active draft (if any)
router.get('/draft', async (req, res) => {
  try {
    const draft = await PayrollRun.findOne({ status: 'draft' }).sort({ updatedAt: -1 });
    res.json({ data: draft });
  } catch (err) {
    console.error('Error fetching draft:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// GET single payroll run by ID
router.get('/runs/:id', async (req, res) => {
  try {
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ success: false, message: 'Not found' });
    res.json(run);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// POST to save/update a draft
router.post('/draft', async (req, res) => {
  try {
    const draftData = req.body;
    draftData.status = 'draft';

    // Check if a draft already exists, if so overwrite it
    let draft = await PayrollRun.findOne({ status: 'draft' });

    if (draft) {
      draft = await PayrollRun.findByIdAndUpdate(
        draft._id,
        { $set: draftData },
        { new: true, runValidators: true }
      );
    } else {
      draft = new PayrollRun(draftData);
      await draft.save();
    }
    
    res.json({ success: true, draft });
  } catch (err) {
    console.error('Error saving payroll draft:', err);
    res.status(400).json({ success: false, message: 'Error saving draft', error: err.message });
  }
});

// POST to submit a final run
router.post('/submit', async (req, res) => {
  try {
    const runData = req.body;
    runData.status = 'pending_approval';
    
    // For submitting, we either update the existing draft to pending_approval or create a new one
    let run;
    if (runData._id || runData.id) {
        run = await PayrollRun.findByIdAndUpdate(
            runData._id || runData.id,
            { $set: runData },
            { new: true, runValidators: true }
        );
    } else {
        run = new PayrollRun(runData);
        await run.save();
    }
    
    // Optionally delete any remaining 'draft' if we just submitted one
    await PayrollRun.deleteMany({ status: 'draft', _id: { $ne: run._id } });

    res.status(201).json({ success: true, run });
  } catch (err) {
    console.error('Error submitting payroll:', err);
    res.status(400).json({ success: false, message: 'Error submitting payroll', error: err.message });
  }
});

// PUT to update status (Admin only)
router.put('/runs/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        // Validate valid status transitions here if needed
        const updatedRun = await PayrollRun.findByIdAndUpdate(
            req.params.id,
            { $set: { status } },
            { new: true }
        );

        if (!updatedRun) return res.status(404).json({ success: false, message: 'Not found' });
        res.json(updatedRun);
    } catch (err) {
        res.status(400).json({ success: false, message: 'Error updating status', error: err.message });
    }
});

module.exports = router;
