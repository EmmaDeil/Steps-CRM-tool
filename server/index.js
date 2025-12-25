/* eslint-disable */
// Server migrated to use MongoDB via Mongoose.
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
// Ensure .env is loaded even when the server is started from the repo root
dotenv.config({ path: path.join(__dirname, '.env') });

const { validate, validationRules } = require('./middleware/validation');
const ModuleModel = require('./models/Module');
const AnalyticsModel = require('./models/Analytics');
const AttendanceModel = require('./models/Attendance');
const MaterialRequestModel = require('./models/MaterialRequest');
const PurchaseOrderModel = require('./models/PurchaseOrder');
const AdvanceRequestModel = require('./models/AdvanceRequest');
const RefundRequestModel = require('./models/RefundRequest');
const RetirementBreakdownModel = require('./models/RetirementBreakdown');
const { sendApprovalEmail, sendPOReviewEmail } = require('./utils/emailService');
const seed = require('./data');

const app = express();

// Security Middleware
app.use(helmet()); // Secure HTTP headers
app.use(mongoSanitize()); // Sanitize MongoDB queries

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// Apply rate limiter to all requests
app.use(limiter);

// More strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: 'Too many failed requests, please try again later.',
});

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(morgan('dev'));

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is not set in environment');
}

const MONGODB_URI = process.env.MONGODB_URI;

async function start() {
  try {
    await mongoose.connect(MONGODB_URI, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 
    });
    console.log('✓ Connected to MongoDB');

    // Seed modules if empty or update with new modules
    const moduleCount = await ModuleModel.countDocuments();
    if (moduleCount === 0) {
      await ModuleModel.insertMany(seed.modules);
      console.log('Seeded modules');
    } else {
      // Upsert modules: update existing ones and add new ones
      for (const module of seed.modules) {
        await ModuleModel.findOneAndUpdate(
          { id: module.id },
          module,
          { upsert: true, new: true }
        );
      }
      console.log('Updated modules to match seed data');
    }

    // Seed analytics if empty
    const analyticsCount = await AnalyticsModel.countDocuments();
    if (analyticsCount === 0) {
      await AnalyticsModel.create(seed.analytics);
      console.log('Seeded analytics');
    }

    // Seed attendance if empty
    const attendanceCount = await AttendanceModel.countDocuments();
    if (attendanceCount === 0) {
      await AttendanceModel.insertMany(seed.attendance);
      console.log('Seeded attendance');
    }
  } catch (err) {
    console.error('✗ Failed to connect to MongoDB');
    console.error('  Error:', err.message);
    console.error('  Please ensure MongoDB is running or set MONGODB_URI in .env');
    process.exit(1);
  }

  // API endpoints using centralized server API helpers
  const api = require('./api');

  app.get('/api/modules', async (req, res) => {
    const mods = await api.getModules();
    res.json(mods);
  });

  app.get('/api/modules/:id', async (req, res) => {
    const id = req.params.id;
    const mod = await api.getModuleById(id);
    if (!mod) return res.status(404).json({ message: 'Not found' });
    res.json(mod);
  });

  app.get('/api/analytics', async (req, res) => {
    const a = await api.getAnalytics();
    res.json(a || {});
  });

  app.get('/api/attendance', async (req, res) => {
    const list = await api.getAttendance();
    res.json(list);
  });

  // Material Requests endpoints
  app.get('/api/material-requests', async (req, res) => {
    try {
      const requests = await MaterialRequestModel.find().sort({ createdAt: -1 });
      res.json(requests);
    } catch (err) {
      console.error('Error fetching material requests:', err);
      res.status(500).json({ message: 'Failed to fetch requests' });
    }
  });

  app.post('/api/material-requests', async (req, res) => {
    try {
      // Generate request ID
      const count = await MaterialRequestModel.countDocuments();
      const requestId = String(count + 1).padStart(6, '0');
      
      const requestData = {
        ...req.body,
        requestId,
      };
      
      const newRequest = await MaterialRequestModel.create(requestData);
      
      // Send approval email to approver
      await sendApprovalEmail(newRequest);
      
      res.status(201).json({ message: 'Request created and email sent', data: newRequest });
    } catch (err) {
      console.error('Error creating material request:', err);
      res.status(500).json({ message: 'Failed to create request' });
    }
  });

  // Approve material request and create PO
  app.post('/api/material-requests/:id/approve', async (req, res) => {
    try {
      const materialRequest = await MaterialRequestModel.findById(req.params.id);
      if (!materialRequest) {
        return res.status(404).json({ message: 'Request not found' });
      }

      // Update material request status
      materialRequest.status = 'approved';
      await materialRequest.save();

      // Auto-create Purchase Order
      const poCount = await PurchaseOrderModel.countDocuments();
      const poNumber = `PO-${String(poCount + 1).padStart(6, '0')}`;

      // Map line items from material request to PO format
      const lineItems = materialRequest.lineItems.map(item => ({
        itemName: item.itemName,
        description: item.description || '',
        quantity: parseFloat(item.quantity) || 0,
        unit: item.quantityType || 'pcs',
        unitPrice: parseFloat(item.amount) || 0,
        total: (parseFloat(item.quantity) || 0) * (parseFloat(item.amount) || 0),
      }));

      const totalAmount = lineItems.reduce((sum, item) => sum + item.total, 0);

      const purchaseOrder = await PurchaseOrderModel.create({
        poNumber,
        requester: materialRequest.requestedBy,
        approver: materialRequest.approver,
        vendor: req.body.vendor || 'To be assigned',
        orderDate: new Date().toISOString().split('T')[0],
        deliveryDate: '',
        status: 'draft',
        lineItems,
        totalAmount,
        message: materialRequest.message || '',
        attachments: materialRequest.attachments || [],
        materialRequestId: materialRequest._id,
      });

      // PO created for procurement team review (no email sent)

      res.json({ 
        message: 'Request approved and PO created',
        materialRequest,
        purchaseOrder 
      });
    } catch (err) {
      console.error('Error approving material request:', err);
      res.status(500).json({ message: 'Failed to approve request' });
    }
  });

  // Reject material request
  app.post('/api/material-requests/:id/reject', async (req, res) => {
    try {
      const updated = await MaterialRequestModel.findByIdAndUpdate(
        req.params.id,
        { status: 'rejected', rejectionReason: req.body.reason },
        { new: true }
      );
      if (!updated) return res.status(404).json({ message: 'Request not found' });
      res.json({ message: 'Request rejected', data: updated });
    } catch (err) {
      console.error('Error rejecting material request:', err);
      res.status(500).json({ message: 'Failed to reject request' });
    }
  });

  app.put('/api/material-requests/:id', async (req, res) => {
    try {
      const updated = await MaterialRequestModel.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!updated) return res.status(404).json({ message: 'Request not found' });
      res.json({ message: 'Request updated', data: updated });
    } catch (err) {
      console.error('Error updating material request:', err);
      res.status(500).json({ message: 'Failed to update request' });
    }
  });

  // Signatures endpoints
  app.get('/api/signatures', async (req, res) => {
    res.json([]);
  });

  // Vendors endpoint
  app.get('/api/vendors', async (req, res) => {
    const vendors = [
      { id: 1, name: 'ABC Office Supplies Ltd.', category: 'Office Supplies', email: 'contact@abcoffice.com' },
      { id: 2, name: 'Tech Solutions Inc.', category: 'Technology', email: 'sales@techsolutions.com' },
      { id: 3, name: 'Global Furniture Co.', category: 'Furniture', email: 'info@globalfurniture.com' },
      { id: 4, name: 'Premier Cleaning Services', category: 'Services', email: 'hello@premiercleaning.com' },
      { id: 5, name: 'Industrial Equipment Corp.', category: 'Equipment', email: 'orders@indequip.com' },
      { id: 6, name: 'Green Energy Solutions', category: 'Energy', email: 'info@greenenergy.com' },
      { id: 7, name: 'Prime Construction Materials', category: 'Construction', email: 'sales@primeconst.com' },
      { id: 8, name: 'Fast Delivery Logistics', category: 'Logistics', email: 'support@fastdelivery.com' },
    ];
    res.json(vendors);
  });

  // Purchase Orders endpoints
  app.get('/api/purchase-orders', async (req, res) => {
    try {
      const orders = await PurchaseOrderModel.find().sort({ createdAt: -1 });
      res.json(orders);
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  app.post('/api/purchase-orders', async (req, res) => {
    try {
      const count = await PurchaseOrderModel.countDocuments();
      const poNumber = `PO-${String(count + 1).padStart(6, '0')}`;
      
      const poData = {
        ...req.body,
        poNumber,
      };
      
      const newPO = await PurchaseOrderModel.create(poData);
      res.status(201).json({ message: 'Purchase order created', data: newPO });
    } catch (err) {
      console.error('Error creating purchase order:', err);
      res.status(500).json({ message: 'Failed to create purchase order' });
    }
  });

  // Review and approve PO
  app.post('/api/purchase-orders/:id/review', async (req, res) => {
    try {
      const po = await PurchaseOrderModel.findById(req.params.id);
      if (!po) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }

      // Update PO with review changes
      if (req.body.lineItems) po.lineItems = req.body.lineItems;
      if (req.body.vendor) po.vendor = req.body.vendor;
      if (req.body.deliveryDate) po.deliveryDate = req.body.deliveryDate;
      if (req.body.reviewNotes) po.reviewNotes = req.body.reviewNotes;
      
      // Calculate new total
      po.totalAmount = po.lineItems.reduce((sum, item) => sum + item.total, 0);
      
      // Update status to reviewed (ready for finance)
      po.status = 'payment_pending';
      await po.save();

      res.json({ message: 'Purchase order reviewed and sent to finance', data: po });
    } catch (err) {
      console.error('Error reviewing purchase order:', err);
      res.status(500).json({ message: 'Failed to review purchase order' });
    }
  });

  // Get POs pending payment (for Finance module)
  app.get('/api/purchase-orders/pending-payment', async (req, res) => {
    try {
      const orders = await PurchaseOrderModel.find({ 
        status: 'payment_pending' 
      }).sort({ createdAt: -1 });
      res.json(orders);
    } catch (err) {
      console.error('Error fetching pending payment orders:', err);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  // Mark PO as paid
  app.post('/api/purchase-orders/:id/mark-paid', async (req, res) => {
    try {
      const po = await PurchaseOrderModel.findByIdAndUpdate(
        req.params.id,
        { status: 'paid', paidDate: new Date() },
        { new: true }
      );
      if (!po) return res.status(404).json({ message: 'Purchase order not found' });
      res.json({ message: 'Payment recorded', data: po });
    } catch (err) {
      console.error('Error marking PO as paid:', err);
      res.status(500).json({ message: 'Failed to update payment status' });
    }
  });

  // Send approval email for advance requests
  app.post('/api/send-approval-email', authLimiter, [
    validationRules.email,
    validationRules.employeeName,
    validationRules.employeeId,
    validationRules.department,
    validationRules.amount,
    validationRules.approver,
    validationRules.approverEmail,
    validationRules.reason,
    validationRules.repaymentPeriod,
  ], validate, async (req, res) => {
    try {
      const {
        to,
        employeeName,
        employeeId,
        department,
        amount,
        reason,
        repaymentPeriod,
        approver,
        requestType,
      } = req.body;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject: `Advance Request Approval Required - ${employeeId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0d6efd;">Advance Request Approval Required</h2>
            <p>Dear ${approver},</p>
            <p>A new advance request has been submitted for your approval.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Request Details</h3>
              <p><strong>Employee Name:</strong> ${employeeName}</p>
              <p><strong>Employee ID:</strong> ${employeeId}</p>
              <p><strong>Department:</strong> ${department}</p>
              <p><strong>Amount:</strong> $${parseFloat(amount).toFixed(2)}</p>
              <p><strong>Reason:</strong> ${reason}</p>
              <p><strong>Repayment Period:</strong> ${repaymentPeriod}</p>
            </div>

            <p style="color: #666; font-size: 12px;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        `,
      };

      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 Approval email would be sent to:', mailOptions.to);
        return res.json({ success: true, message: 'Email logged (dev mode)' });
      }

      const transporter = require('./utils/emailService').transporter || null;
      if (transporter) {
        await transporter.sendMail(mailOptions);
      }
      
      res.json({ success: true, message: 'Approval email sent successfully' });
    } catch (err) {
      console.error('Error sending approval email:', err);
      res.status(500).json({ success: false, message: 'Failed to send email', error: err.message });
    }
  });

  // Advance Request endpoints
  app.get('/api/advance-requests', async (req, res) => {
    try {
      const userId = req.query.userId;
      const query = userId ? { userId } : {};
      const requests = await AdvanceRequestModel.find(query).sort({ createdAt: -1 });
      res.json(requests);
    } catch (err) {
      console.error('Error fetching advance requests:', err);
      res.status(500).json({ message: 'Failed to fetch requests' });
    }
  });

  app.post('/api/advance-requests', async (req, res) => {
    try {
      const newRequest = await AdvanceRequestModel.create(req.body);
      res.status(201).json({ message: 'Request created successfully', data: newRequest });
    } catch (err) {
      console.error('Error creating advance request:', err);
      res.status(500).json({ message: 'Failed to create request' });
    }
  });

  app.put('/api/advance-requests/:id', async (req, res) => {
    try {
      const updated = await AdvanceRequestModel.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!updated) return res.status(404).json({ message: 'Request not found' });
      res.json({ message: 'Request updated', data: updated });
    } catch (err) {
      console.error('Error updating advance request:', err);
      res.status(500).json({ message: 'Failed to update request' });
    }
  });

  // Refund Request endpoints
  app.get('/api/refund-requests', async (req, res) => {
    try {
      const userId = req.query.userId;
      const query = userId ? { userId } : {};
      const requests = await RefundRequestModel.find(query).sort({ createdAt: -1 });
      res.json(requests);
    } catch (err) {
      console.error('Error fetching refund requests:', err);
      res.status(500).json({ message: 'Failed to fetch requests' });
    }
  });

  app.post('/api/refund-requests', async (req, res) => {
    try {
      const newRequest = await RefundRequestModel.create(req.body);
      res.status(201).json({ message: 'Request created successfully', data: newRequest });
    } catch (err) {
      console.error('Error creating refund request:', err);
      res.status(500).json({ message: 'Failed to create request' });
    }
  });

  app.put('/api/refund-requests/:id', async (req, res) => {
    try {
      const updated = await RefundRequestModel.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!updated) return res.status(404).json({ message: 'Request not found' });
      res.json({ message: 'Request updated', data: updated });
    } catch (err) {
      console.error('Error updating refund request:', err);
      res.status(500).json({ message: 'Failed to update request' });
    }
  });

  // Retirement Breakdown endpoints
  app.get('/api/retirement-breakdown', async (req, res) => {
    try {
      const userId = req.query.userId;
      const query = userId ? { userId } : {};
      const breakdowns = await RetirementBreakdownModel.find(query).sort({ createdAt: -1 });
      res.json(breakdowns);
    } catch (err) {
      console.error('Error fetching retirement breakdowns:', err);
      res.status(500).json({ message: 'Failed to fetch breakdowns' });
    }
  });

  app.post('/api/retirement-breakdown', async (req, res) => {
    try {
      const newBreakdown = await RetirementBreakdownModel.create(req.body);
      res.status(201).json({ message: 'Breakdown saved successfully', data: newBreakdown });
    } catch (err) {
      console.error('Error creating retirement breakdown:', err);
      res.status(500).json({ message: 'Failed to save breakdown' });
    }
  });

  app.put('/api/retirement-breakdown/:id', async (req, res) => {
    try {
      const updated = await RetirementBreakdownModel.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!updated) return res.status(404).json({ message: 'Breakdown not found' });
      res.json({ message: 'Breakdown updated', data: updated });
    } catch (err) {
      console.error('Error updating retirement breakdown:', err);
      res.status(500).json({ message: 'Failed to update breakdown' });
    }
  });

  if (!process.env.PORT) {
    throw new Error('PORT is not set in environment');
  }

  const port = process.env.PORT;
  app.listen(port, () => {
    console.log(`Steps backend listening on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
