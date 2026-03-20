const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const MaterialRequest = require('../models/MaterialRequest');
const PurchaseOrder = require('../models/PurchaseOrder');
const InventoryItem = require('../models/InventoryItem');
const InventoryIssue = require('../models/InventoryIssue');
const StockTransfer = require('../models/StockTransfer');
const StockMovement = require('../models/StockMovement');
const { logMovement } = require('./inventory.routes');
const {
  buildWaybillHTML,
  generateWaybillNumber,
  updateStockLevel,
  getStockAtLocation,
} = require('../utils/stockTransferHelpers');

// ==========================================
// MATERIAL REQUESTS API
// ==========================================

// GET all Material Requests
router.get('/material-requests', async (req, res) => {
  try {
    const requests = await MaterialRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error('Error fetching material requests:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// GET single Material Request
router.get('/material-requests/:id', async (req, res) => {
  try {
    const request = await MaterialRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Not found' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// POST new Material Request
router.post('/material-requests', async (req, res) => {
  try {
    // Generate request ID with format MR-YYYY-MM-DD-COUNT
    const count = await MaterialRequest.countDocuments();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const requestId = `MR-${year}-${month}-${day}-${String(count + 1).padStart(3, '0')}`;

    const payload = {
      ...req.body,
      requestId,
      date: req.body?.date || now.toISOString().split('T')[0],
    };

    const newRequest = new MaterialRequest(payload);

    // Ensure activity timeline starts with creation + initial comment.
    const requestAuthor = payload.requestedBy || 'Unknown User';
    newRequest.activities = Array.isArray(newRequest.activities) ? newRequest.activities : [];
    newRequest.comments = Array.isArray(newRequest.comments) ? newRequest.comments : [];

    newRequest.activities.push({
      type: 'created',
      author: requestAuthor,
      authorId: req.user?._id,
      text: `Request ${requestId} was created`,
      timestamp: new Date(),
    });

    if (payload.message && String(payload.message).trim()) {
      const cleanMessage = String(payload.message).trim();
      newRequest.comments.push({
        author: requestAuthor,
        authorId: req.user?._id,
        text: cleanMessage,
        timestamp: new Date(),
      });
      newRequest.activities.push({
        type: 'comment',
        author: requestAuthor,
        authorId: req.user?._id,
        text: cleanMessage,
        timestamp: new Date(),
      });
    }

    const savedRequest = await newRequest.save();
    res.status(201).json(savedRequest);
  } catch (err) {
    console.error('Error creating material request:', err);
    res.status(400).json({ success: false, message: 'Error creating request', error: err.message });
  }
});

// PUT update Material Request
router.put('/material-requests/:id', async (req, res) => {
  try {
    const updatedRequest = await MaterialRequest.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!updatedRequest) return res.status(404).json({ success: false, message: 'Not found' });
    res.json(updatedRequest);
  } catch (err) {
    console.error('Error updating material request:', err);
    res.status(400).json({ success: false, message: 'Error updating request', error: err.message });
  }
});

// POST Approve Material Request -> Auto Generate Purchase Order OR Fulfill from Inventory
router.post('/material-requests/:id/approve', async (req, res) => {
  try {
    const { vendor } = req.body; // Frontend passes selected vendor
    
    // 1. Find and update the request
    const request = await MaterialRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    
    if (request.status === 'approved' || request.status === 'fulfilled') {
        return res.status(400).json({ success: false, message: 'Already approved' });
    }

    const actorName =
      req.user?.fullName || req.user?.email || req.body?.approver || 'Approver';
    const actorId = req.user?._id;

    request.activities = Array.isArray(request.activities) ? request.activities : [];

    // Multi-level approval progression: approve current step, move to next pending if any.
    if (Array.isArray(request.approvalChain) && request.approvalChain.length > 0) {
      let currentIdx = request.approvalChain.findIndex((s) => s.status === 'pending');
      if (currentIdx === -1) {
        currentIdx = request.approvalChain.findIndex((s) => s.status === 'awaiting');
        if (currentIdx >= 0) request.approvalChain[currentIdx].status = 'pending';
      }

      if (currentIdx >= 0) {
        const currentStep = request.approvalChain[currentIdx];
        currentStep.status = 'approved';
        currentStep.approvedAt = new Date();
        if (req.body?.comment) currentStep.comments = String(req.body.comment);

        request.activities.push({
          type: 'approval',
          author: actorName,
          authorId: actorId,
          text: `Approved level ${currentStep.level || currentIdx + 1}`,
          timestamp: new Date(),
          approvalLevel: currentStep.level || currentIdx + 1,
        });

        const nextIdx = request.approvalChain.findIndex(
          (s, idx) => idx > currentIdx && (s.status === 'awaiting' || s.status === 'pending'),
        );

        if (nextIdx >= 0) {
          const nextStep = request.approvalChain[nextIdx];
          nextStep.status = 'pending';
          request.currentApprovalLevel = nextStep.level || nextIdx + 1;
          request.approver = nextStep.approverName || request.approver;
          request.status = 'pending';
          request.activities.push({
            type: 'status_change',
            author: 'System',
            text: `Pending ${nextStep.approverName || 'next approver'} at level ${nextStep.level || nextIdx + 1}`,
            timestamp: new Date(),
            approvalLevel: nextStep.level || nextIdx + 1,
            pendingApprover: nextStep.approverName || '',
          });
          await request.save();
          return res.json({
            success: true,
            message: 'Approval recorded and moved to next approver',
            request,
            type: 'approval_progress',
          });
        }
      }
    }
    
    request.status = 'approved';
    request.activities.push({
      type: 'approval',
      author: actorName,
      authorId: actorId,
      text: 'Request approved',
      timestamp: new Date(),
    });
    const updatedRequest = await request.save();

    // 2. Check if this is an Internal Transfer - pull from inventory (location-aware)
    if (request.requestType === 'Internal Transfer') {
      const inventoryIssues = [];
      const insufficientItems = [];

      const srcLocId   = request.sourceLocationId;
      const srcLocName = request.sourceLocationName || 'Default Store';
      const dstLocId   = request.destinationLocationId;
      const dstLocName = request.destinationLocationName || 'Destination';

      // Pre-validate ALL items before touching anything
      for (const item of request.lineItems) {
        const inventoryItem = await InventoryItem.findOne({
          name: { $regex: new RegExp('^' + item.itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
          isDeleted: false,
        });
        if (!inventoryItem) {
          insufficientItems.push({ item: item.itemName, reason: 'Not found in inventory' });
        } else {
          const available = srcLocId
            ? getStockAtLocation(inventoryItem, srcLocId)
            : inventoryItem.quantity;
          if (available < item.quantity) {
            insufficientItems.push({
              item: item.itemName,
              reason: `Insufficient stock at ${srcLocName} (Available: ${available}, Requested: ${item.quantity})`,
            });
          }
        }
      }

      if (insufficientItems.length === 0) {
        const transferLineItems = [];

        for (const item of request.lineItems) {
          const inventoryItem = await InventoryItem.findOne({
            name: { $regex: new RegExp('^' + item.itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
            isDeleted: false,
          });
          if (!inventoryItem) throw new Error(`Item ${item.itemName} not found during approval`);

          const prevQty = inventoryItem.quantity;
          if (srcLocId) {
            updateStockLevel(inventoryItem, srcLocId, srcLocName, -item.quantity);
            if (dstLocId) updateStockLevel(inventoryItem, dstLocId, dstLocName, +item.quantity);
          } else {
            inventoryItem.quantity = Math.max(0, inventoryItem.quantity - item.quantity);
            inventoryItem.lastUpdated = new Date();
          }
          await inventoryItem.save();
          inventoryIssues.push({ item: item.itemName, quantityIssued: item.quantity, inventoryItemId: inventoryItem._id, unitPrice: inventoryItem.unitPrice || 0 });
          transferLineItems.push({
            inventoryItemId: inventoryItem._id,
            itemName: inventoryItem.name,
            itemCode: inventoryItem.itemId,
            unit: inventoryItem.unit || 'pcs',
            requestedQty: item.quantity,
            transferredQty: item.quantity,
          });
          await logMovement(inventoryItem._id, 'transfer', -item.quantity, prevQty, null,
            `Internal Transfer MR-${request.requestId}: ${srcLocName} → ${dstLocName}`);
        }

        // Auto-create a StockTransfer record + waybill
        let autoTransfer = null;
        let waybillUrl = null;
        try {
          const waybillNumber = await generateWaybillNumber();
          autoTransfer = await StockTransfer.create({
            fromLocationId: srcLocId || undefined,
            fromLocationName: srcLocName,
            toLocationId: dstLocId || undefined,
            toLocationName: dstLocName,
            requestedByName: request.requestedBy,
            status: 'completed',
            lineItems: transferLineItems,
            linkedMaterialRequestId: request._id,
            waybillNumber,
            waybillGeneratedAt: new Date(),
            completedAt: new Date(),
            notes: `Auto-created from MR ${request.requestId}`,
          });
          request.linkedStockTransferId = autoTransfer._id;
          waybillUrl = `/api/stock-transfers/${autoTransfer._id}/waybill`;
        } catch (wbErr) {
          console.error('Waybill record creation failed (non-critical):', wbErr.message);
        }

        // Auto-create an InventoryIssue
        let autoIssue = null;
        try {
          const issueLineItems = inventoryIssues.map(issue => ({
            inventoryItemId: issue.inventoryItemId,
            itemName: issue.item,
            qty: issue.quantityIssued,
            unitPrice: issue.unitPrice,
            totalPrice: issue.quantityIssued * issue.unitPrice,
          }));

          autoIssue = await InventoryIssue.create({
            issuedTo: request.department || request.requestedBy,
            issuedToType: request.department ? 'department' : 'person',
            issuedBy: req.user?._id,
            issuedByName: req.user ? `${req.user.firstName} ${req.user.lastName}` : '',
            lineItems: issueLineItems,
            linkedMaterialRequestId: request._id,
            linkedStockTransferId: autoTransfer ? autoTransfer._id : null,
            notes: `Auto-issued from Material Request ${request.requestId}`,
          });
        } catch (issueErr) {
          console.error('InventoryIssue creation failed (non-critical):', issueErr.message);
        }

        request.status = 'fulfilled';
        request.activities.push({
          type: 'status_change',
          author: 'System',
          text: 'Request fulfilled from inventory',
          timestamp: new Date(),
        });
        await request.save();

        return res.json({
          success: true,
          message: 'Internal transfer approved and items issued from inventory',
          request, inventoryIssues, insufficientItems: [],
          type: 'internal_transfer',
          stockTransfer: autoTransfer,
          waybillUrl,
        });
      } else {
        request.status = 'approved';
        request.activities.push({
          type: 'status_change',
          author: 'System',
          text: 'Approved with partial fulfillment due to insufficient stock',
          timestamp: new Date(),
        });
        await request.save();
        return res.json({
          success: true,
          message: 'Partial fulfillment - some items unavailable',
          request, inventoryIssues, insufficientItems,
          type: 'internal_transfer',
        });
      }
    }

    // 3. For other request types, generate corresponding Purchase Order
    const totalAmount = request.lineItems.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.amount) || 0),
      0,
    );
    
    // Map line items to PO line items
    const poLineItems = request.lineItems.map(item => ({
        itemName: item.itemName,
        quantity: item.quantity,
        quantityType: item.quantityType,
        amount: item.amount || 0,
        description: item.description
    }));

    const newPO = new PurchaseOrder({
        vendor: vendor || request.preferredVendor || 'Unknown Vendor',
        status: 'draft',
      currency: request.currency || 'NGN',
      exchangeRateToNgn: request.exchangeRateToNgn || 1,
        totalAmount: totalAmount,
      totalAmountNgn: totalAmount * (request.exchangeRateToNgn || 1),
        linkedMaterialRequestId: updatedRequest._id,
        lineItems: poLineItems
    });

    await newPO.save();

    request.activities.push({
      type: 'po_created',
      author: 'System',
      text: `Purchase Order ${newPO.poNumber} created`,
      timestamp: new Date(),
      poId: newPO._id,
      poNumber: newPO.poNumber,
    });
    await request.save();

    res.json({ 
        success: true, 
        message: 'Request approved and PO generated', 
        request: updatedRequest,
        purchaseOrder: newPO,
        type: 'purchase_order'
    });
  } catch (err) {
    console.error('Error approving request:', err);
    res.status(500).json({ success: false, message: 'Error approving request', error: err.message });
  }
});

// POST Reject Material Request
router.post('/material-requests/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const request = await MaterialRequest.findById(req.params.id);
    
    if (!request) return res.status(404).json({ success: false, message: 'Not found' });
    const rejectionText = reason || 'No reason provided';
    request.status = 'rejected';
    request.rejectionReason = rejectionText;

    if (Array.isArray(request.approvalChain) && request.approvalChain.length > 0) {
      const pendingIdx = request.approvalChain.findIndex((s) => s.status === 'pending');
      if (pendingIdx >= 0) {
        request.approvalChain[pendingIdx].status = 'rejected';
        request.approvalChain[pendingIdx].comments = rejectionText;
      }
    }

    request.activities = Array.isArray(request.activities) ? request.activities : [];
    request.activities.push({
      type: 'rejection',
      author: req.user?.fullName || req.user?.email || 'Approver',
      authorId: req.user?._id,
      text: `Request rejected: ${rejectionText}`,
      timestamp: new Date(),
    });

    await request.save();
    res.json(request);
  } catch (err) {
    console.error('Error rejecting request:', err);
    res.status(500).json({ success: false, message: 'Error rejecting request', error: err.message });
  }
});

// ==========================================
// PURCHASE ORDERS API
// ==========================================

// GET Purchase Orders List (with filters and pagination)
router.get('/purchase-orders', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, vendor, status } = req.query;
    const query = {};

    // Apply search filter
    if (search) {
      query.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
        { vendor: { $regex: search, $options: 'i' } }
      ];
    }

    // Apply exact match filters
    if (vendor) query.vendor = vendor;
    if (status && status !== 'all') query.status = status;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      PurchaseOrder.find(query)
        .populate('linkedMaterialRequestId', 'currency')
        .sort({ orderDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      PurchaseOrder.countDocuments(query)
    ]);

    res.json({
        orders,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('Error fetching purchase orders:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// GET POs pending payment (for Finance module) - MUST be before /:id route
router.get('/purchase-orders/pending-payment', async (req, res) => {
  try {
    const orders = await PurchaseOrder.find({ 
      status: 'payment_pending' 
    }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Error fetching pending payment orders:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// GET Single Purchase Order
router.get('/purchase-orders/:id', async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
        .populate('linkedMaterialRequestId');
    if (!order) return res.status(404).json({ success: false, message: 'Not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// POST Create Purchase Order
router.post('/purchase-orders', async (req, res) => {
  try {
    const newOrder = new PurchaseOrder(req.body);
    
    // Auto calculate total if not provided but lineItems exist
    if (!req.body.totalAmount && req.body.lineItems && req.body.lineItems.length > 0) {
        newOrder.totalAmount = req.body.lineItems.reduce(
          (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.amount) || 0),
          0,
        );
    }

    if (!req.body.currency) {
      newOrder.currency = 'NGN';
    }
    if (!req.body.exchangeRateToNgn) {
      newOrder.exchangeRateToNgn = 1;
    }
    if (!req.body.totalAmountNgn) {
      newOrder.totalAmountNgn = (Number(newOrder.totalAmount) || 0) * (Number(newOrder.exchangeRateToNgn) || 1);
    }
    
    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (err) {
    console.error('Error creating purchase order:', err);
    res.status(400).json({ success: false, message: 'Error creating order', error: err.message });
  }
});

// POST Review and approve PO (Finance workflow) - Specific action route before generic update
router.post('/purchase-orders/:id/review', async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    // Update PO with review changes
    if (req.body.lineItems) po.lineItems = req.body.lineItems;
    if (req.body.vendor) po.vendor = req.body.vendor;
    if (req.body.expectedDelivery) po.expectedDelivery = req.body.expectedDelivery;
    if (req.body.reviewNotes) po.reviewNotes = req.body.reviewNotes;
    
    // Calculate new total from line items
    if (po.lineItems && po.lineItems.length > 0) {
      po.totalAmount = po.lineItems.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.amount) || 0),
        0,
      );
      po.totalAmountNgn = (Number(po.totalAmount) || 0) * (Number(po.exchangeRateToNgn) || 1);
    }
    
    // Update status to reviewed (ready for payment)
    po.status = 'payment_pending';
    await po.save();

    res.json({ success: true, message: 'Purchase order reviewed and sent to finance', data: po });
  } catch (err) {
    console.error('Error reviewing purchase order:', err);
    res.status(500).json({ success: false, message: 'Failed to review purchase order', error: err.message });
  }
});

// POST Mark PO as paid - Specific action route
router.post('/purchase-orders/:id/mark-paid', async (req, res) => {
  try {
    const po = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { status: 'paid', paidDate: new Date() },
      { new: true }
    );
    if (!po) return res.status(404).json({ success: false, message: 'Purchase order not found' });
    res.json({ success: true, message: 'Payment recorded', data: po });
  } catch (err) {
    console.error('Error marking PO as paid:', err);
    res.status(500).json({ success: false, message: 'Failed to update payment status', error: err.message });
  }
});

// PUT Update Purchase Order
router.put('/purchase-orders/:id', async (req, res) => {
  try {
    // If updating line items, might need to recalculate total
    const updates = { ...req.body };
    if (updates.lineItems && !updates.totalAmount) {
        updates.totalAmount = updates.lineItems.reduce(
          (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.amount) || 0),
          0,
        );
    }
    if (!updates.currency) {
      updates.currency = 'NGN';
    }
    if (!updates.exchangeRateToNgn) {
      updates.exchangeRateToNgn = 1;
    }
    if (updates.totalAmount !== undefined && updates.totalAmountNgn === undefined) {
      updates.totalAmountNgn = (Number(updates.totalAmount) || 0) * (Number(updates.exchangeRateToNgn) || 1);
    }

    const updatedOrder = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!updatedOrder) return res.status(404).json({ success: false, message: 'Not found' });
    res.json(updatedOrder);
  } catch (err) {
    console.error('Error updating purchase order:', err);
    res.status(400).json({ success: false, message: 'Error updating order', error: err.message });
  }
});

// DELETE Purchase Order
router.delete('/purchase-orders/:id', async (req, res) => {
  try {
    const deletedOrder = await PurchaseOrder.findByIdAndDelete(req.params.id);
    if (!deletedOrder) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Purchase order deleted successfully' });
  } catch (err) {
    console.error('Error deleting purchase order:', err);
    res.status(500).json({ success: false, message: 'Error deleting order' });
  }
});

module.exports = router;
