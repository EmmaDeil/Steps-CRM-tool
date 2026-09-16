/**
 * Material Request Workflow Routes
 * Handles: RFQ Generation -> PO Creation -> Payment -> Item Receiving
 */

const express = require('express');
const router = express.Router();
const MaterialRequestModel = require('../models/MaterialRequest');
const RFQModel = require('../models/RFQ');
const PurchaseOrderModel = require('../models/PurchaseOrder');
const PaymentModel = require('../models/Payment');
const POReceiptModel = require('../models/POReceipt');
const VendorModel = require('../models/Vendor');
const AuditLogModel = require('../models/AuditLog');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

const {
  createPOPDFStream,
  createRFQPDFStream,
  createPaymentReceiptPDFStream,
  createGRNPDFStream,
} = require('../utils/pdfGenerator');
const {
  generateRFQFromMaterialRequest,
  generatePOFromRFQ,
  recordPaymentForPO,
  receiveItemsFromPO,
} = require('../utils/materialRequestWorkflow');
const { buildApprovalChain: _buildApprovalChain, findMatchingApprovalRule: _findMatchingApprovalRule } = require('../utils/approvalRuleHelper');

// Helper to emit Socket.IO events safely
function emitWorkflowEvent(req, eventName, payload) {
  try {
    const io = req.app.get('io');
    if (io) {
      io.emit(eventName, payload);
      io.emit('workflow:updated', payload);
    }
  } catch (err) {
    console.error('Socket emit error:', err);
  }
}

// ==================== RFQ ENDPOINTS ====================

/**
 * Generate RFQ from Material Request
 * POST /api/workflow/material-requests/:id/generate-rfq
 */
router.post('/material-requests/:id/generate-rfq', async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorId } = req.body;
    const user = req.user || { userId: 'system', userName: 'System', userEmail: 'system@company.com' };

    const rfq = await generateRFQFromMaterialRequest(id, vendorId, user);

    // Log activity
    await AuditLogModel.create({
      action: 'RFQ Generated',
      actor: {
        userId: user.userId,
        userName: user.userName,
        userEmail: user.userEmail,
      },
      description: `RFQ generated from Material Request`,
      ipAddress: req.ip,
      status: 'Success',
    });

    res.json({
      success: true,
      message: 'RFQ generated successfully',
      data: rfq,
    });
  } catch (error) {
    console.error('Error generating RFQ:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * Get RFQs
 * GET /api/workflow/rfqs
 */
router.get('/rfqs', async (req, res) => {
  try {
    const { status, vendorId, rfqNumber, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (vendorId) query['vendor.vendorId'] = vendorId;
    if (rfqNumber) query.rfqNumber = String(rfqNumber).trim();

    const skip = (page - 1) * limit;
    const rfqs = await RFQModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('materialRequestId', 'requestId requestTitle');

    const total = await RFQModel.countDocuments(query);

    res.json({
      success: true,
      data: {
        rfqs,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching RFQs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update RFQ basic editable fields
 * PUT /api/workflow/rfqs/:id
 */
router.put('/rfqs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      notes,
      requiredByDate,
      expiryDate,
    } = req.body || {};
    const user = req.user || { userId: 'system', userName: 'System' };

    const rfq = await RFQModel.findById(id);
    if (!rfq) {
      return res.status(404).json({ success: false, error: 'RFQ not found' });
    }

    const allowedStatuses = new Set([
      'draft',
      'sent',
      'quotation_received',
      'quotation_accepted',
      'po_generated',
      'cancelled',
    ]);

    if (status !== undefined) {
      const nextStatus = String(status || '').trim();
      if (!allowedStatuses.has(nextStatus)) {
        return res.status(400).json({ success: false, error: 'Invalid RFQ status' });
      }
      rfq.status = nextStatus;
      if (nextStatus === 'sent' && !rfq.sentDate) {
        rfq.sentDate = new Date();
      }
    }

    if (notes !== undefined) {
      rfq.notes = String(notes || '');
    }

    if (requiredByDate !== undefined) {
      rfq.requiredByDate = requiredByDate ? new Date(requiredByDate) : null;
    }

    if (expiryDate !== undefined) {
      rfq.expiryDate = expiryDate ? new Date(expiryDate) : null;
    }

    rfq.activities.push({
      type: 'created',
      author: user.userName || 'System',
      authorId: user.userId,
      description: 'RFQ updated',
      timestamp: new Date(),
    });

    await rfq.save();

    res.json({ success: true, message: 'RFQ updated successfully', data: rfq });
  } catch (error) {
    console.error('Error updating RFQ:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get single RFQ
 * GET /api/workflow/rfqs/:id
 */
router.get('/rfqs/:id', async (req, res) => {
  try {
    const rfq = await RFQModel.findById(req.params.id)
      .populate('materialRequestId')
      .populate('vendor.vendorId');

    if (!rfq) {
      return res.status(404).json({ success: false, error: 'RFQ not found' });
    }

    res.json({ success: true, data: rfq });
  } catch (error) {
    console.error('Error fetching RFQ:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Add Quotation to RFQ
 * POST /api/workflow/rfqs/:id/add-quotation
 */
router.post('/rfqs/:id/add-quotation', async (req, res) => {
  try {
    const { id } = req.params;
    const { quotedAmount, quotedBy, notes, attachments } = req.body;
    const user = req.user || { userId: 'system', userName: 'System' };

    if (!quotedAmount) {
      return res.status(400).json({ success: false, error: 'Quoted amount is required' });
    }

    const rfq = await RFQModel.findById(id);
    if (!rfq) {
      return res.status(404).json({ success: false, error: 'RFQ not found' });
    }

    const quotation = {
      quotedAmount,
      quotedAmountNgn: quotedAmount * rfq.exchangeRateToNgn,
      quotedBy,
      notes,
      attachments: attachments || [],
      status: 'received',
      receivedAt: new Date(),
    };

    rfq.quotations.push(quotation);
    rfq.status = 'quotation_received';
    rfq.activities.push({
      type: 'quotation_received',
      author: user.userName,
      authorId: user.userId,
      description: `Quotation received for ${quotedAmount}`,
    });

    await rfq.save();

    res.json({
      success: true,
      message: 'Quotation added successfully',
      data: rfq,
    });
  } catch (error) {
    console.error('Error adding quotation:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================== PO GENERATION ENDPOINTS ====================

/**
 * Generate PO from RFQ (Accept Quotation)
 * POST /api/workflow/rfqs/:id/generate-po
 */
router.post('/rfqs/:id/generate-po', async (req, res) => {
  try {
    const { id } = req.params;
    const { quotationIndex } = req.body;
    const user = req.user || { userId: 'system', userName: 'System' };

    if (quotationIndex === undefined) {
      return res.status(400).json({ success: false, error: 'Quotation index is required' });
    }

    const po = await generatePOFromRFQ(id, quotationIndex, user);

    await AuditLogModel.create({
      action: 'Purchase Order Created',
      actor: {
        userId: user.userId,
        userName: user.userName,
      },
      description: `PO created from RFQ`,
      status: 'Success',
    });

    res.json({
      success: true,
      message: 'Purchase Order created successfully',
      data: po,
    });
  } catch (error) {
    console.error('Error generating PO:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================== PAYMENT ENDPOINTS ====================

/**
 * Record Payment for PO
 * POST /api/workflow/pos/:id/record-payment
 */
router.post('/pos/:id/record-payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentType, paymentMethod = 'bank_transfer' } = req.body;
    const user = req.user || { userId: 'system', userName: 'System', userEmail: 'system@company.com', department: 'Finance' };

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Payment amount must be greater than 0' });
    }

    const result = await recordPaymentForPO(id, amount, paymentType, user, paymentMethod);

    // Log activity
    await AuditLogModel.create({
      action: 'Payment Recorded',
      actor: {
        userId: user.userId,
        userName: user.userName,
      },
      description: `Payment of ${amount} NGN recorded`,
      status: 'Success',
    });

    res.json({
      success: true,
      message: `Payment of ${amount} NGN recorded successfully`,
      data: result,
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * Get Payment History for PO
 * GET /api/workflow/pos/:id/payments
 */
router.get('/pos/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const po = await PurchaseOrderModel.findById(id);

    if (!po) {
      return res.status(404).json({ success: false, error: 'Purchase Order not found' });
    }

    const payments = await PaymentModel.find({ poId: id }).sort({ createdAt: '-1' });

    res.json({
      success: true,
      data: {
        poNumber: po.poNumber,
        totalAmount: po.totalAmountNgn,
        paidAmount: po.paidAmount,
        remainingAmount: po.totalAmountNgn - po.paidAmount,
        paymentStatus: po.status,
        paymentHistory: po.paymentHistory,
        payments,
      },
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ITEM RECEIVING ENDPOINTS ====================

/**
 * Receive Items from PO into Inventory
 * POST /api/workflow/pos/:id/receive-items
 */
router.post('/pos/:id/receive-items', async (req, res) => {
  try {
    const { id } = req.params;
    const { receivedItems, storeLocation, qualityInspection = {} } = req.body;
    const user = req.user || { 
      userId: 'system', 
      userName: 'System', 
      userEmail: 'system@company.com',
      department: 'Warehouse'
    };

    if (!receivedItems || receivedItems.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one item must be received' });
    }

    if (!storeLocation || !storeLocation.locationName) {
      return res.status(400).json({ success: false, error: 'Store location is required' });
    }

    const result = await receiveItemsFromPO(id, receivedItems, storeLocation, user, qualityInspection);

    await AuditLogModel.create({
      action: 'Items Received',
      actor: {
        userId: user.userId,
        userName: user.userName,
      },
      description: `${receivedItems.length} items received into inventory. Receipt: ${result.receipt.receiptNumber}`,
      status: 'Success',
    });

    res.json({
      success: true,
      message: 'Items received successfully into inventory',
      data: result,
    });
  } catch (error) {
    console.error('Error receiving items:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * Get PO Receipts
 * GET /api/workflow/receipts
 */
router.get('/receipts', async (req, res) => {
  try {
    const { poId, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (poId) query.poId = poId;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const receipts = await POReceiptModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await POReceiptModel.countDocuments(query);

    res.json({
      success: true,
      data: {
        receipts,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get single Receipt
 * GET /api/workflow/receipts/:id
 */
router.get('/receipts/:id', async (req, res) => {
  try {
    const receipt = await POReceiptModel.findById(req.params.id).populate('poId').populate('storeLocation.locationId');

    if (!receipt) {
      return res.status(404).json({ success: false, error: 'Receipt not found' });
    }

    res.json({ success: true, data: receipt });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get Workflow Progress for Material Request
 * GET /api/workflow/material-requests/:id/progress
 */
router.get('/material-requests/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;

    const materialRequest = await MaterialRequestModel.findById(id);
    if (!materialRequest) {
      return res.status(404).json({ success: false, error: 'Material Request not found' });
    }

    // Find related RFQ, PO, Payments, Receipts
    const rfqs = await RFQModel.find({ materialRequestId: id });
    const pos = await PurchaseOrderModel.find({ linkedMaterialRequestId: id });
    const payments = await PaymentModel.find({ poId: { $in: pos.map((p) => p._id) } });
    const receipts = await POReceiptModel.find({ poId: { $in: pos.map((p) => p._id) } });

    const workflow = {
      materialRequest: {
        id: materialRequest._id,
        requestId: materialRequest.requestId,
        requestType: materialRequest.requestType,
        status: materialRequest.status,
        createdAt: materialRequest.createdAt,
      },
      rfqs: rfqs.map((r) => ({
        id: r._id,
        rfqNumber: r.rfqNumber,
        status: r.status,
        vendor: r.vendor.vendorName,
        createdAt: r.createdAt,
      })),
      pos: pos.map((p) => ({
        id: p._id,
        poNumber: p.poNumber,
        status: p.status,
        vendor: p.vendor,
        totalAmount: p.totalAmountNgn,
        paidAmount: p.paidAmount,
        createdAt: p.createdAt,
      })),
      payments: payments.map((p) => ({
        id: p._id,
        paymentNumber: p.paymentNumber,
        amount: p.amountNgn,
        percentage: p.percentage,
        status: p.status,
        date: p.paymentDate,
      })),
      receipts: receipts.map((r) => ({
        id: r._id,
        receiptNumber: r.receiptNumber,
        status: r.status,
        itemsReceived: r.receivedItems.length,
        date: r.createdAt,
      })),
      summary: {
        stage: !rfqs.length ? 'pending_rfq' : !pos.length ? 'pending_po' : !payments.length || pos[0].paidAmount < pos[0].totalAmountNgn ? 'payment_pending' : !receipts.length ? 'ready_for_receiving' : 'completed',
        progress: {
          rfqGenerated: rfqs.length > 0,
          poCreated: pos.length > 0,
          paymentReceived: payments.length > 0 && (pos[0]?.paidAmount || 0) > 0,
          itemsReceived: receipts.length > 0 && receipts.some((r) => r.inventoryUpdated),
        },
      },
    };

    res.json({ success: true, data: workflow });
  } catch (error) {
    console.error('Error fetching workflow progress:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PHASE 2 ENHANCEMENT ENDPOINTS ====================

/**
 * Download PO PDF
 * GET /api/workflow/pos/:id/pdf
 */
router.get('/pos/:id/pdf', async (req, res) => {
  try {
    const po = await PurchaseOrderModel.findById(req.params.id);
    if (!po) {
      return res.status(404).json({ success: false, error: 'Purchase Order not found' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=PO-${po.poNumber || po._id}.pdf`);
    const doc = createPOPDFStream(po);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Error generating PO PDF:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Download RFQ PDF
 * GET /api/workflow/rfqs/:id/pdf
 */
router.get('/rfqs/:id/pdf', async (req, res) => {
  try {
    const rfq = await RFQModel.findById(req.params.id);
    if (!rfq) {
      return res.status(404).json({ success: false, error: 'RFQ not found' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=RFQ-${rfq.rfqNumber || rfq._id}.pdf`);
    const doc = createRFQPDFStream(rfq);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Error generating RFQ PDF:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Download Payment Receipt PDF
 * GET /api/workflow/payments/:id/pdf
 */
router.get('/payments/:id/pdf', async (req, res) => {
  try {
    const payment = await PaymentModel.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=PAY-${payment.paymentNumber || payment._id}.pdf`);
    const doc = createPaymentReceiptPDFStream(payment);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Error generating Payment PDF:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Download Goods Receipt Note (GRN) PDF
 * GET /api/workflow/receipts/:id/pdf
 */
router.get('/receipts/:id/pdf', async (req, res) => {
  try {
    const receipt = await POReceiptModel.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ success: false, error: 'GRN Receipt not found' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=GRN-${receipt.receiptNumber || receipt._id}.pdf`);
    const doc = createGRNPDFStream(receipt);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Error generating GRN PDF:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * File Attachment Upload for RFQ / Payment / Receipt
 * POST /api/workflow/:entityType/:id/attachment
 */
router.post('/:entityType/:id/attachment', upload.single('file'), async (req, res) => {
  try {
    const { entityType, id } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    const attachmentObj = {
      fileName: req.file.originalname,
      description: req.body.description || 'Uploaded attachment',
      fileData: req.file.buffer.toString('base64'),
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedAt: new Date(),
    };

    let item;
    if (entityType === 'rfqs') {
      item = await RFQModel.findByIdAndUpdate(id, { $push: { attachments: attachmentObj } }, { new: true });
    } else if (entityType === 'payments') {
      item = await PaymentModel.findByIdAndUpdate(id, { $push: { attachments: attachmentObj } }, { new: true });
    } else if (entityType === 'receipts') {
      item = await POReceiptModel.findByIdAndUpdate(id, { $push: { attachments: attachmentObj } }, { new: true });
    } else {
      return res.status(400).json({ success: false, error: 'Invalid entityType' });
    }

    if (!item) {
      return res.status(404).json({ success: false, error: 'Entity not found' });
    }

    emitWorkflowEvent(req, 'workflow:attachment_added', { entityType, id, fileName: req.file.originalname });

    res.json({ success: true, message: 'Attachment uploaded successfully', data: item.attachments });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Bulk Payment Processing
 * POST /api/workflow/pos/bulk-payment
 */
router.post('/pos/bulk-payment', async (req, res) => {
  try {
    const { payments } = req.body; // Array of { poId, amount, paymentType, paymentMethod }
    const user = req.user || { userId: 'system', userName: 'System', userEmail: 'system@company.com' };

    if (!Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ success: false, error: 'payments array is required' });
    }

    const results = [];
    const errors = [];

    for (const p of payments) {
      try {
        const paymentRecord = await recordPaymentForPO(
          p.poId,
          p.amount,
          p.paymentType || 'partial',
          user,
          p.paymentMethod || 'bank_transfer'
        );
        results.push(paymentRecord);
      } catch (err) {
        errors.push({ poId: p.poId, error: err.message });
      }
    }

    emitWorkflowEvent(req, 'workflow:bulk_payment_completed', { count: results.length, errorsCount: errors.length });

    res.json({
      success: errors.length === 0,
      message: `Processed ${results.length} payments with ${errors.length} errors`,
      data: { processed: results, errors },
    });
  } catch (error) {
    console.error('Error in bulk payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Vendor Performance Analytics
 * GET /api/workflow/vendors/analytics
 */
router.get('/vendors/analytics', async (req, res) => {
  try {
    const rfqs = await RFQModel.find();
    const pos = await PurchaseOrderModel.find();
    const receipts = await POReceiptModel.find();

    const vendorStatsMap = {};

    // Process RFQs
    rfqs.forEach((rfq) => {
      const vName = rfq.vendor?.vendorName || 'Unknown Vendor';
      if (!vendorStatsMap[vName]) {
        vendorStatsMap[vName] = { vendorName: vName, totalRFQs: 0, totalQuotesReceived: 0, totalPOs: 0, totalSpend: 0, itemsReceived: 0, itemsDamaged: 0 };
      }
      vendorStatsMap[vName].totalRFQs += 1;
      if (rfq.quotations && rfq.quotations.length > 0) {
        vendorStatsMap[vName].totalQuotesReceived += rfq.quotations.length;
      }
    });

    // Process POs
    pos.forEach((po) => {
      const vName = typeof po.vendor === 'string' ? po.vendor : (po.vendor?.vendorName || 'Unknown Vendor');
      if (!vendorStatsMap[vName]) {
        vendorStatsMap[vName] = { vendorName: vName, totalRFQs: 0, totalQuotesReceived: 0, totalPOs: 0, totalSpend: 0, itemsReceived: 0, itemsDamaged: 0 };
      }
      vendorStatsMap[vName].totalPOs += 1;
      vendorStatsMap[vName].totalSpend += po.totalAmountNgn || po.totalAmount || 0;
    });

    // Process Receipts
    receipts.forEach((rc) => {
      const vName = rc.vendor?.vendorName || 'Unknown Vendor';
      if (!vendorStatsMap[vName]) {
        vendorStatsMap[vName] = { vendorName: vName, totalRFQs: 0, totalQuotesReceived: 0, totalPOs: 0, totalSpend: 0, itemsReceived: 0, itemsDamaged: 0 };
      }
      (rc.receivedItems || []).forEach((item) => {
        vendorStatsMap[vName].itemsReceived += item.quantityReceived || 0;
        if (item.condition === 'damaged') {
          vendorStatsMap[vName].itemsDamaged += item.quantityReceived || 0;
        }
      });
    });

    const analyticsList = Object.values(vendorStatsMap).map((v) => {
      const qualityScore = v.itemsReceived > 0 ? (((v.itemsReceived - v.itemsDamaged) / v.itemsReceived) * 100).toFixed(1) : 100;
      const quoteResponseRate = v.totalRFQs > 0 ? ((v.totalQuotesReceived / v.totalRFQs) * 100).toFixed(1) : 0;
      return {
        ...v,
        qualityScore: parseFloat(qualityScore),
        quoteResponseRate: parseFloat(quoteResponseRate),
      };
    });

    res.json({ success: true, data: analyticsList });
  } catch (error) {
    console.error('Error fetching vendor analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

