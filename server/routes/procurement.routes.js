const express = require('express');
const router = express.Router();
const MaterialRequest = require('../models/MaterialRequest');
const PurchaseOrder = require('../models/PurchaseOrder');

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
    const newRequest = new MaterialRequest(req.body);
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

// POST Approve Material Request -> Auto Generate Purchase Order
router.post('/material-requests/:id/approve', async (req, res) => {
  try {
    const { vendor } = req.body; // Frontend passes selected vendor
    
    // 1. Find and update the request
    const request = await MaterialRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    
    if (request.status === 'approved') {
        return res.status(400).json({ success: false, message: 'Already approved' });
    }
    
    request.status = 'approved';
    const updatedRequest = await request.save();

    // 2. Generate corresponding Purchase Order
    // Calculate total amount from line items if they have amounts
    const totalAmount = request.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    
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
        totalAmount: totalAmount,
        linkedMaterialRequestId: updatedRequest._id,
        lineItems: poLineItems
    });

    await newPO.save();

    res.json({ 
        success: true, 
        message: 'Request approved and PO generated', 
        request: updatedRequest,
        purchaseOrder: newPO
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
    const request = await MaterialRequest.findByIdAndUpdate(
        req.params.id,
        { 
            $set: { 
                status: 'rejected',
                rejectionReason: reason || 'No reason provided'
            } 
        },
        { new: true }
    );
    
    if (!request) return res.status(404).json({ success: false, message: 'Not found' });
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
        newOrder.totalAmount = req.body.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
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
      po.totalAmount = po.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
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
        updates.totalAmount = updates.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
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
