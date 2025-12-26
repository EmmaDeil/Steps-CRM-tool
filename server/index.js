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
const api = require('./api');
const ModuleModel = require('./models/Module');
const AnalyticsModel = require('./models/Analytics');
const AttendanceModel = require('./models/Attendance');
const MaterialRequestModel = require('./models/MaterialRequest');
const PurchaseOrderModel = require('./models/PurchaseOrder');
const AdvanceRequestModel = require('./models/AdvanceRequest');
const RefundRequestModel = require('./models/RefundRequest');
const RetirementBreakdownModel = require('./models/RetirementBreakdown');
const DocumentModel = require('./models/Document');
const UserModel = require('./models/User');
const SecuritySettingsModel = require('./models/SecuritySettings');
const AuditLogModel = require('./models/AuditLog');
const PolicyModel = require('./models/Policy');
const { sendApprovalEmail, sendPOReviewEmail, sendPasswordResetEmail } = require('./utils/emailService');
const seed = require('./data');

const app = express();
let dbConnected = false;

// Short-circuits DB-backed endpoints when MongoDB is unavailable.
const requireDbConnection = (req, res, next) => {
  if (!dbConnected) {
    return res.status(503).json({ message: 'Database unavailable; start with MONGODB_URI to enable this endpoint.' });
  }
  next();
};

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

// MongoDB connection string (optional for dev). If missing, run in degraded mode.
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.warn('MONGODB_URI not set; starting in degraded mode with seed data.');
}

async function start() {
  try {
    if (MONGODB_URI) {
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });
      dbConnected = true;
      console.log('✓ Connected to MongoDB');
    } else {
      console.warn('Skipping MongoDB connect; no MONGODB_URI provided.');
    }

    if (dbConnected) {
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
    } else {
      console.warn('Skipping database seeding because no MongoDB connection is available.');
    }
  } catch (err) {
    console.error('✗ Failed to connect to MongoDB');
    console.error('  Error:', err.message);
    console.error('  Please ensure MongoDB is running or set MONGODB_URI in .env');
    console.warn('Continuing in degraded mode with seed data.');
    dbConnected = false;
  }

  // API endpoints using centralized server API helpers
  const api = require('./api');

  // Block DB-backed endpoints early when MongoDB is not available.
  app.use([
    '/api/material-requests',
    '/api/purchase-orders',
    '/api/advance-requests',
    '/api/refund-requests',
    '/api/retirement-breakdown',
    '/api/documents',
    '/api/users',
    '/api/security',
    '/api/audit-logs',
    '/api/approval',
    '/api/user/profile',
  ], requireDbConnection);

  app.get('/api/modules', async (req, res) => {
    if (!dbConnected) {
      return res.json(seed.modules);
    }
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
    if (!dbConnected) {
      return res.json(seed.analytics);
    }
    const a = await api.getAnalytics();
    res.json(a || {});
  });

  app.get('/api/attendance', async (req, res) => {
    if (!dbConnected) {
      return res.json(seed.attendance);
    }
    const list = await api.getAttendance();
    res.json(list);
  });

  // Material Requests endpoints
  app.get('/api/material-requests', async (req, res) => {
    if (!dbConnected) {
      return res.status(503).json({ message: 'Database unavailable in dev; material requests disabled.' });
    }
    try {
      const requests = await MaterialRequestModel.find().sort({ createdAt: -1 });
      res.json(requests);
    } catch (err) {
      console.error('Error fetching material requests:', err);
      res.status(500).json({ message: 'Failed to fetch requests' });
    }
  });

  app.post('/api/material-requests', async (req, res) => {
    if (!dbConnected) {
      return res.status(503).json({ message: 'Database unavailable in dev; material requests disabled.' });
    }
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
    if (!dbConnected) {
      return res.status(503).json({ message: 'Database unavailable in dev; approvals disabled.' });
    }
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
    if (!dbConnected) {
      return res.status(503).json({ message: 'Database unavailable in dev; rejections disabled.' });
    }
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
    if (!dbConnected) {
      return res.status(503).json({ message: 'Database unavailable in dev; updates disabled.' });
    }
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
    if (!dbConnected) {
      return res.status(503).json({ message: 'Database unavailable in dev; purchase orders disabled.' });
    }
    try {
      const orders = await PurchaseOrderModel.find().sort({ createdAt: -1 });
      res.json(orders);
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  app.post('/api/purchase-orders', async (req, res) => {
    if (!dbConnected) {
      return res.status(503).json({ message: 'Database unavailable in dev; purchase orders disabled.' });
    }
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
    if (!dbConnected) {
      return res.status(503).json({ message: 'Database unavailable in dev; reviews disabled.' });
    }
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
    if (!dbConnected) {
      return res.status(503).json({ message: 'Database unavailable in dev; payments disabled.' });
    }
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
    if (!dbConnected) {
      return res.status(503).json({ message: 'Database unavailable in dev; payments disabled.' });
    }
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

  // ========== DOCUMENT MANAGEMENT ROUTES ==========
  
  // Get all documents for a user
  app.get('/api/documents', async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ message: 'userId is required' });
      }
      
      const documents = await DocumentModel.find({
        $or: [
          { uploadedBy: userId },
          { 'recipients.email': userId },
        ],
      }).sort({ createdAt: -1 });
      
      res.json(documents);
    } catch (err) {
      console.error('Error fetching documents:', err);
      res.status(500).json({ message: 'Failed to fetch documents' });
    }
  });

  // Get a single document by ID
  app.get('/api/documents/:id', async (req, res) => {
    try {
      const document = await DocumentModel.findById(req.params.id);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      res.json(document);
    } catch (err) {
      console.error('Error fetching document:', err);
      res.status(500).json({ message: 'Failed to fetch document' });
    }
  });

  // Create a new document
  app.post('/api/documents', async (req, res) => {
    try {
      const document = new DocumentModel(req.body);
      const saved = await document.save();
      res.status(201).json(saved);
    } catch (err) {
      console.error('Error creating document:', err);
      res.status(500).json({ message: 'Failed to create document' });
    }
  });

  // Update document (add signatures, change status, etc.)
  app.patch('/api/documents/:id', async (req, res) => {
    try {
      const updated = await DocumentModel.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ message: 'Document not found' });
      }
      res.json(updated);
    } catch (err) {
      console.error('Error updating document:', err);
      res.status(500).json({ message: 'Failed to update document' });
    }
  });

  // Sign document (complete signing process)
  app.post('/api/documents/:id/sign', async (req, res) => {
    try {
      const { signatures, recipients, userId, userName } = req.body;
      
      const document = await DocumentModel.findById(req.params.id);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      // Add signatures with timestamp and signer info
      const timestampedSignatures = signatures.map(sig => ({
        ...sig,
        signedAt: new Date(),
        signedBy: userId,
      }));

      document.signatures = timestampedSignatures;
      document.status = 'Completed';
      document.completedAt = new Date();
      
      // Update recipients if provided
      if (recipients && recipients.length > 0) {
        document.recipients = recipients.map(rec => ({
          ...rec,
          status: rec.email === userId ? 'signed' : 'pending',
        }));
      }

      await document.save();

      // TODO: Send email notifications to recipients
      // You can implement email sending here using the emailService

      res.json({ message: 'Document signed successfully', document });
    } catch (err) {
      console.error('Error signing document:', err);
      res.status(500).json({ message: 'Failed to sign document' });
    }
  });

  // Delete a document
  app.delete('/api/documents/:id', async (req, res) => {
    try {
      const deleted = await DocumentModel.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: 'Document not found' });
      }
      res.json({ message: 'Document deleted successfully' });
    } catch (err) {
      console.error('Error deleting document:', err);
      res.status(500).json({ message: 'Failed to delete document' });
    }
  });

  // ==================== USER MANAGEMENT ROUTES ====================

  // Get all users with optional filtering
  app.get('/api/users', async (req, res) => {
    try {
      const { role, status, search } = req.query;
      let query = {};

      if (role) {
        query.role = role;
      }
      if (status) {
        query.status = status;
      }
      if (search) {
        query.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      const users = await UserModel.find(query)
        .select('-resetPasswordToken -resetPasswordExpires')
        .sort({ createdAt: -1 })
        .populate('invitedBy', 'fullName email');

      res.json(users);
    } catch (err) {
      console.error('Error fetching users:', err);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Get single user by ID
  app.get('/api/users/:id', async (req, res) => {
    try {
      const user = await UserModel.findById(req.params.id)
        .select('-resetPasswordToken -resetPasswordExpires')
        .populate('invitedBy', 'fullName email');

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (err) {
      console.error('Error fetching user:', err);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Create new user
  app.post('/api/users', async (req, res) => {
    try {
      const { fullName, email, role, permissions, invitedBy } = req.body;

      // Check if user already exists
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      const user = new UserModel({
        fullName,
        email,
        role: role || 'Viewer',
        status: 'Pending',
        permissions,
        invitedBy,
        invitedAt: new Date(),
      });

      await user.save();
      res.status(201).json(user);
    } catch (err) {
      console.error('Error creating user:', err);
      res.status(500).json({ message: 'Failed to create user' });
    }
  });

  // Update user
  app.patch('/api/users/:id', async (req, res) => {
    try {
      const { fullName, email, role, status, permissions } = req.body;
      
      const updateData = {};
      if (fullName !== undefined) updateData.fullName = fullName;
      if (email !== undefined) updateData.email = email;
      if (role !== undefined) updateData.role = role;
      if (status !== undefined) updateData.status = status;
      if (permissions !== undefined) updateData.permissions = permissions;

      const user = await UserModel.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).select('-resetPasswordToken -resetPasswordExpires');

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (err) {
      console.error('Error updating user:', err);
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  // Delete user
  app.delete('/api/users/:id', async (req, res) => {
    try {
      const user = await UserModel.findByIdAndDelete(req.params.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'User deleted successfully' });
    } catch (err) {
      console.error('Error deleting user:', err);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  // Request password reset
  app.post('/api/users/:id/reset-password', async (req, res) => {
    try {
      const user = await UserModel.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Generate reset token
      const resetToken = user.generateResetToken();
      await user.save();

      // Send email
      const emailResult = await sendPasswordResetEmail(user, resetToken);
      
      if (emailResult.success) {
        res.json({ 
          message: 'Password reset email sent successfully',
          ...(process.env.NODE_ENV !== 'production' && { resetLink: emailResult.resetLink })
        });
      } else {
        res.status(500).json({ message: 'Failed to send password reset email' });
      }
    } catch (err) {
      console.error('Error requesting password reset:', err);
      res.status(500).json({ message: 'Failed to process password reset request' });
    }
  });

  // Update user status (activate/deactivate)
  app.patch('/api/users/:id/status', async (req, res) => {
    try {
      const { status } = req.body;

      if (!['Active', 'Inactive', 'Pending'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const user = await UserModel.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      ).select('-resetPasswordToken -resetPasswordExpires');

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (err) {
      console.error('Error updating user status:', err);
      res.status(500).json({ message: 'Failed to update user status' });
    }
  });

  // ==================== SECURITY SETTINGS ROUTES ====================

  // Get security settings (singleton)
  app.get('/api/security/settings', async (req, res) => {
    try {
      let settings = await SecuritySettingsModel.findOne({ singleton: true });
      
      // Create default settings if none exist
      if (!settings) {
        settings = new SecuritySettingsModel({
          singleton: true,
          passwordPolicy: {
            enabled: true,
            minLength: 12,
            specialChars: true,
            uppercaseRequired: true,
            lowercaseRequired: true,
            numberRequired: true,
            expiry: 90,
          },
          mfaSettings: {
            enabled: true,
            method: 'Authenticator App',
            enforcement: 'All Users',
            gracePeriod: 'None',
          },
          sessionControl: {
            idleTimeout: 30,
            concurrentSessions: 3,
            rememberMeDuration: 30,
          },
        });
        await settings.save();
      }

      res.json(settings);
    } catch (err) {
      console.error('Error fetching security settings:', err);
      res.status(500).json({ message: 'Failed to fetch security settings' });
    }
  });

  // Update security settings
  app.patch('/api/security/settings', async (req, res) => {
    try {
      const { passwordPolicy, mfaSettings, sessionControl } = req.body;

      let settings = await SecuritySettingsModel.findOne({ singleton: true });
      
      if (!settings) {
        settings = new SecuritySettingsModel({ singleton: true });
      }

      if (passwordPolicy) settings.passwordPolicy = { ...settings.passwordPolicy, ...passwordPolicy };
      if (mfaSettings) settings.mfaSettings = { ...settings.mfaSettings, ...mfaSettings };
      if (sessionControl) settings.sessionControl = { ...settings.sessionControl, ...sessionControl };

      await settings.save();

      // Log the configuration update
      await AuditLogModel.create({
        actor: {
          userId: req.body.actorId || 'system',
          userName: req.body.actorName || 'System Admin',
          userEmail: req.body.actorEmail || 'admin@system.com',
          initials: 'SA',
        },
        action: 'Config Update',
        actionColor: 'purple',
        ipAddress: req.ip || req.connection.remoteAddress || 'Unknown',
        userAgent: req.get('user-agent'),
        description: 'Updated Security Settings',
        status: 'Success',
        metadata: { updatedFields: Object.keys(req.body) },
      });

      res.json(settings);
    } catch (err) {
      console.error('Error updating security settings:', err);
      res.status(500).json({ message: 'Failed to update security settings' });
    }
  });

  // Get active users count
  app.get('/api/security/active-users', async (req, res) => {
    try {
      const activeUsers = await UserModel.countDocuments({ status: 'Active' });
      res.json({ count: activeUsers });
    } catch (err) {
      console.error('Error fetching active users:', err);
      res.status(500).json({ message: 'Failed to fetch active users count' });
    }
  });

  // ==================== AUDIT LOG ROUTES ====================

  // Get audit logs with filtering and pagination
  app.get('/api/audit-logs', async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        action, 
        status, 
        search,
        startDate,
        endDate 
      } = req.query;

      const query = {};

      if (action && action !== 'All Actions') {
        query.action = action;
      }

      if (status && status !== 'All Statuses') {
        query.status = status;
      }

      if (search) {
        query.$or = [
          { 'actor.userName': { $regex: search, $options: 'i' } },
          { 'actor.userEmail': { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [logs, total] = await Promise.all([
        AuditLogModel.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        AuditLogModel.countDocuments(query),
      ]);

      res.json({
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
  });

  // Create audit log entry
  app.post('/api/audit-logs', async (req, res) => {
    try {
      const log = new AuditLogModel({
        ...req.body,
        ipAddress: req.body.ipAddress || req.ip || req.connection.remoteAddress || 'Unknown',
        userAgent: req.body.userAgent || req.get('user-agent'),
      });

      await log.save();
      res.status(201).json(log);
    } catch (err) {
      console.error('Error creating audit log:', err);
      res.status(500).json({ message: 'Failed to create audit log' });
    }
  });

  // Export audit logs as CSV
  app.get('/api/audit-logs/export', async (req, res) => {
    try {
      const { action, status, startDate, endDate } = req.query;
      
      const query = {};
      if (action && action !== 'All Actions') query.action = action;
      if (status && status !== 'All Statuses') query.status = status;
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      const logs = await AuditLogModel.find(query).sort({ timestamp: -1 }).limit(10000);

      // Generate CSV
      const headers = ['Timestamp', 'Actor', 'Action', 'IP Address', 'Description', 'Status'];
      const csvRows = [headers.join(',')];

      logs.forEach(log => {
        const row = [
          new Date(log.timestamp).toISOString(),
          `"${log.actor.userName || 'Unknown'}"`,
          log.action,
          log.ipAddress,
          `"${log.description}"`,
          log.status,
        ];
        csvRows.push(row.join(','));
      });

      const csv = csvRows.join('\\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
      res.send(csv);
    } catch (err) {
      console.error('Error exporting audit logs:', err);
      res.status(500).json({ message: 'Failed to export audit logs' });
    }
  });

  // Bulk export selected audit logs
  app.post('/api/audit-logs/export', async (req, res) => {
    try {
      const { logIds } = req.body;
      
      if (!logIds || !Array.isArray(logIds) || logIds.length === 0) {
        return res.status(400).json({ message: 'No logs selected for export' });
      }

      const logs = await AuditLogModel.find({ _id: { $in: logIds } }).sort({ timestamp: -1 });

      // Generate CSV
      const headers = ['Timestamp', 'Actor', 'Action', 'IP Address', 'Description', 'Status'];
      const csvRows = [headers.join(',')];

      logs.forEach(log => {
        const row = [
          new Date(log.timestamp).toISOString(),
          `"${log.actor.userName || 'Unknown'}"`,
          log.action,
          log.ipAddress,
          `"${log.description}"`,
          log.status,
        ];
        csvRows.push(row.join(','));
      });

      const csv = csvRows.join('\\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=selected-audit-logs.csv');
      res.send(csv);
    } catch (err) {
      console.error('Error exporting selected logs:', err);
      res.status(500).json({ message: 'Failed to export selected logs' });
    }
  });

  // Get notification rules
  app.get('/api/security/notification-rules', async (req, res) => {
    try {
      const settings = await SecuritySettingsModel.findOne();
      if (!settings || !settings.notificationRules) {
        return res.json({ rules: [] });
      }
      res.json({ rules: settings.notificationRules });
    } catch (err) {
      console.error('Error fetching notification rules:', err);
      res.status(500).json({ message: 'Failed to fetch notification rules' });
    }
  });

  // Add notification rule
  app.post('/api/security/notification-rules', async (req, res) => {
    try {
      const { name, event, condition, recipient, enabled } = req.body;
      
      if (!name || !event || !condition || !recipient) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      let settings = await SecuritySettingsModel.findOne();
      if (!settings) {
        settings = new SecuritySettingsModel({ notificationRules: [] });
      }

      const newRule = {
        name,
        event,
        condition,
        recipient,
        enabled: enabled !== undefined ? enabled : true,
      };

      settings.notificationRules = settings.notificationRules || [];
      settings.notificationRules.push(newRule);
      await settings.save();

      const addedRule = settings.notificationRules[settings.notificationRules.length - 1];
      res.json({ rule: addedRule });
    } catch (err) {
      console.error('Error adding notification rule:', err);
      res.status(500).json({ message: 'Failed to add notification rule' });
    }
  });

  // Delete notification rule
  app.delete('/api/security/notification-rules/:ruleId', async (req, res) => {
    try {
      const { ruleId } = req.params;
      
      const settings = await SecuritySettingsModel.findOne();
      if (!settings) {
        return res.status(404).json({ message: 'Settings not found' });
      }

      settings.notificationRules = settings.notificationRules.filter(
        rule => rule._id.toString() !== ruleId
      );
      await settings.save();

      res.json({ message: 'Notification rule deleted' });
    } catch (err) {
      console.error('Error deleting notification rule:', err);
      res.status(500).json({ message: 'Failed to delete notification rule' });
    }
  });

  // Get settings history
  app.get('/api/security/settings-history', async (req, res) => {
    try {
      const settings = await SecuritySettingsModel.findOne();
      if (!settings || !settings.settingsHistory) {
        return res.json({ history: [] });
      }
      // Return last 50 entries, sorted by timestamp descending
      const history = settings.settingsHistory
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 50);
      res.json({ history });
    } catch (err) {
      console.error('Error fetching settings history:', err);
      res.status(500).json({ message: 'Failed to fetch settings history' });
    }
  });

  // Panic logout - terminate all sessions
  app.post('/api/security/panic-logout', async (req, res) => {
    try {
      // In a real implementation, this would:
      // 1. Clear all session tokens
      // 2. Force logout all users
      // 3. Notify administrators
      // For now, we'll just log the action
      
      // Create audit log
      await AuditLogModel.create({
        action: 'Panic Logout',
        description: 'Emergency logout initiated for all users',
        status: 'Success',
        actor: {
          userName: req.body.userName || 'System Administrator',
          userEmail: req.body.userEmail || 'admin@system.com',
          initials: req.body.initials || 'SA',
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        actionColor: 'red',
        timestamp: new Date(),
      });

      res.json({ message: 'All users have been logged out', count: 0 });
    } catch (err) {
      console.error('Error during panic logout:', err);
      res.status(500).json({ message: 'Failed to execute panic logout' });
    }
  });

  // ===================================
  // POLICY MANAGEMENT ROUTES
  // ===================================

  // Get departments list
  app.get('/api/departments', async (req, res) => {
    try {
      const departments = [
        { id: 1, name: 'IT Security', code: 'ITS', icon: 'fa-shield-halved', color: 'blue' },
        { id: 2, name: 'HR', code: 'HR', icon: 'fa-users', color: 'purple' },
        { id: 3, name: 'Finance', code: 'FIN', icon: 'fa-dollar-sign', color: 'green' },
        { id: 4, name: 'Legal', code: 'LEG', icon: 'fa-gavel', color: 'red' },
        { id: 5, name: 'Marketing', code: 'MKT', icon: 'fa-bullhorn', color: 'orange' },
        { id: 6, name: 'Operations', code: 'OPS', icon: 'fa-cogs', color: 'gray' },
      ];
      res.json({ departments });
    } catch (err) {
      console.error('Error fetching departments:', err);
      res.status(500).json({ message: 'Failed to fetch departments' });
    }
  });

  // Get policy statistics
  app.get('/api/policies/stats', async (req, res) => {
    try {
      const totalPolicies = await PolicyModel.countDocuments();
      const published = await PolicyModel.countDocuments({ status: 'Published' });
      const drafts = await PolicyModel.countDocuments({ status: 'Draft' });
      const pendingApproval = await PolicyModel.countDocuments({ status: 'Pending Approval' });
      const reviewRequired = await PolicyModel.countDocuments({ status: 'Review' });
      const expiring = await PolicyModel.countDocuments({ status: 'Expiring' });

      // Calculate change from last month (simplified - you can make this more sophisticated)
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      const lastMonthCount = await PolicyModel.countDocuments({
        createdAt: { $gte: lastMonthDate }
      });

      const stats = {
        totalPolicies,
        totalChange: lastMonthCount > 0 ? `+${lastMonthCount} this month` : 'No change',
        published,
        publishedStatus: 'Active and visible',
        drafts,
        draftsPending: pendingApproval > 0 ? `${pendingApproval} pending approval` : 'None',
        reviewRequired: reviewRequired + expiring,
        reviewStatus: expiring > 0 ? 'Expiring soon' : 'Up to date',
      };

      res.json(stats);
    } catch (err) {
      console.error('Error fetching policy stats:', err);
      res.status(500).json({ message: 'Failed to fetch policy stats' });
    }
  });

  // Get all policies with filtering
  app.get('/api/policies', async (req, res) => {
    try {
      const { status, category, search } = req.query;
      let query = {};

      if (status && status !== 'All Statuses') {
        query.status = status;
      }
      if (category && category !== 'All Departments') {
        query.category = category;
      }
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { policyId: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const policies = await PolicyModel.find(query).sort({ lastUpdated: -1 });
      res.json(policies);
    } catch (err) {
      console.error('Error fetching policies:', err);
      res.status(500).json({ message: 'Failed to fetch policies' });
    }
  });

  // Get single policy by ID
  app.get('/api/policies/:id', async (req, res) => {
    try {
      const policy = await PolicyModel.findById(req.params.id);
      if (!policy) {
        return res.status(404).json({ message: 'Policy not found' });
      }
      res.json(policy);
    } catch (err) {
      console.error('Error fetching policy:', err);
      res.status(500).json({ message: 'Failed to fetch policy' });
    }
  });

  // Create new policy (with base64 document upload)
  app.post('/api/policies', async (req, res) => {
    try {
      const {
        title,
        category,
        description,
        documentData, // base64 string
        documentName,
        documentType,
        author
      } = req.body;

      // Validation
      if (!title || !category || !description || !documentData || !documentName) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Generate policy ID
      const currentYear = new Date().getFullYear();
      const departmentCodes = {
        'IT Security': 'ITS',
        'HR': 'HR',
        'Finance': 'FIN',
        'Legal': 'LEG',
        'Marketing': 'MKT',
        'Operations': 'OPS'
      };

      const existingPolicies = await PolicyModel.countDocuments({ category });
      const nextNumber = String(existingPolicies + 1).padStart(3, '0');
      const code = departmentCodes[category] || 'GEN';
      const policyId = `POL-${currentYear}-${code}-${nextNumber}`;

      // Create policy
      const newPolicy = new PolicyModel({
        title,
        category,
        policyId,
        description,
        documentUrl: documentData, // Store base64 data URL
        documentName,
        documentType,
        author,
        version: 'v1.0',
        status: 'Draft',
        versionHistory: [{
          version: 'v1.0',
          date: new Date(),
          author,
          changes: 'Initial version',
          status: 'Current',
          documentUrl: documentData,
          documentName
        }]
      });

      await newPolicy.save();
      
      res.status(201).json(newPolicy);
    } catch (err) {
      console.error('Error creating policy:', err);
      res.status(500).json({ message: 'Failed to create policy' });
    }
  });

  // Update policy
  app.patch('/api/policies/:id', async (req, res) => {
    try {
      const {
        title,
        description,
        status,
        documentData,
        documentName,
        documentType,
        changes,
        author
      } = req.body;

      const policy = await PolicyModel.findById(req.params.id);
      if (!policy) {
        return res.status(404).json({ message: 'Policy not found' });
      }

      // Update fields
      if (title) policy.title = title;
      if (description) policy.description = description;
      if (status) policy.status = status;
      
      // If new document is uploaded, increment version
      if (documentData && documentName) {
        // Archive current version
        policy.versionHistory.forEach(v => {
          if (v.status === 'Current') v.status = 'Archived';
        });

        // Increment version
        const currentVersionNum = parseFloat(policy.version.replace('v', ''));
        const newVersion = `v${(currentVersionNum + 0.1).toFixed(1)}`;
        
        policy.version = newVersion;
        policy.documentUrl = documentData;
        policy.documentName = documentName;
        policy.documentType = documentType;
        
        // Add to version history
        policy.versionHistory.push({
          version: newVersion,
          date: new Date(),
          author,
          changes: changes || 'Updated document',
          status: 'Current',
          documentUrl: documentData,
          documentName
        });
      }

      policy.lastUpdated = new Date();
      await policy.save();

      res.json(policy);
    } catch (err) {
      console.error('Error updating policy:', err);
      res.status(500).json({ message: 'Failed to update policy' });
    }
  });

  // Delete policy
  app.delete('/api/policies/:id', async (req, res) => {
    try {
      const policy = await PolicyModel.findByIdAndDelete(req.params.id);
      if (!policy) {
        return res.status(404).json({ message: 'Policy not found' });
      }
      res.json({ message: 'Policy deleted successfully' });
    } catch (err) {
      console.error('Error deleting policy:', err);
      res.status(500).json({ message: 'Failed to delete policy' });
    }
  });

  // Approve policy
  app.patch('/api/policies/:id/approve', async (req, res) => {
    try {
      const { approvedBy } = req.body;
      
      const policy = await PolicyModel.findById(req.params.id);
      if (!policy) {
        return res.status(404).json({ message: 'Policy not found' });
      }

      policy.status = 'Published';
      policy.approvedBy = {
        userId: approvedBy.userId,
        userName: approvedBy.userName,
        approvedDate: new Date()
      };
      policy.lastUpdated = new Date();
      
      await policy.save();
      res.json(policy);
    } catch (err) {
      console.error('Error approving policy:', err);
      res.status(500).json({ message: 'Failed to approve policy' });
    }
  });

  // Reject policy (return to draft)
  app.patch('/api/policies/:id/reject', async (req, res) => {
    try {
      const policy = await PolicyModel.findById(req.params.id);
      if (!policy) {
        return res.status(404).json({ message: 'Policy not found' });
      }

      policy.status = 'Draft';
      policy.lastUpdated = new Date();
      
      await policy.save();
      res.json(policy);
    } catch (err) {
      console.error('Error rejecting policy:', err);
      res.status(500).json({ message: 'Failed to reject policy' });
    }
  });

  // Submit policy for approval
  app.patch('/api/policies/:id/submit', async (req, res) => {
    try {
      const policy = await PolicyModel.findById(req.params.id);
      if (!policy) {
        return res.status(404).json({ message: 'Policy not found' });
      }

      policy.status = 'Pending Approval';
      policy.lastUpdated = new Date();
      
      await policy.save();
      res.json(policy);
    } catch (err) {
      console.error('Error submitting policy:', err);
      res.status(500).json({ message: 'Failed to submit policy' });
    }
  });

  // Restore version
  app.patch('/api/policies/:id/restore-version', async (req, res) => {
    try {
      const { versionToRestore, author } = req.body;
      
      const policy = await PolicyModel.findById(req.params.id);
      if (!policy) {
        return res.status(404).json({ message: 'Policy not found' });
      }

      const historyVersion = policy.versionHistory.find(v => v.version === versionToRestore);
      if (!historyVersion) {
        return res.status(404).json({ message: 'Version not found in history' });
      }

      // Archive current version
      policy.versionHistory.forEach(v => {
        if (v.status === 'Current') v.status = 'Archived';
      });

      // Increment version
      const currentVersionNum = parseFloat(policy.version.replace('v', ''));
      const newVersion = `v${(currentVersionNum + 0.1).toFixed(1)}`;
      
      policy.version = newVersion;
      policy.documentUrl = historyVersion.documentUrl;
      policy.documentName = historyVersion.documentName;
      
      // Add restored version to history
      policy.versionHistory.push({
        version: newVersion,
        date: new Date(),
        author,
        changes: `Restored from ${versionToRestore}`,
        status: 'Current',
        documentUrl: historyVersion.documentUrl,
        documentName: historyVersion.documentName
      });

      policy.lastUpdated = new Date();
      await policy.save();

      res.json(policy);
    } catch (err) {
      console.error('Error restoring version:', err);
      res.status(500).json({ message: 'Failed to restore version' });
    }
  });

  // ===================================
  // HR MANAGEMENT ROUTES
  // ===================================

  // In-memory sample data for HR dashboard
  const hrData = {
    employees: [
      { id: 'e1', name: 'Sarah Jenkins', email: 'sarah.j@company.com', role: 'Product Manager', department: 'Product', status: 'Active', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDuiE8m7uH1WQVnfTGmVuYm9exoMTgg4IcNALgCTd3hWW9Vpwm-jpiFyqU0qlPRUtyokT0rbP0N5TTBkf1LoYVuXbC6rLTFhVYE6HMQynWIIdMpu375MNBV8yw7gajwRPUugUmb-vG57rkjheTg8b_wd4C1zsVQ5FaxE0foWLzRO43bfDkAVldMfE2Ig5DdWlpKGxP4_zHzCmgFvOm9W-VCkQCuh-FumLFHvh_ghWU3a5cndN0ls-Ec7UZLCx6S4Qf5ZnetieRG4dk' },
      { id: 'e2', name: 'Michael Chen', email: 'm.chen@company.com', role: 'Senior Developer', department: 'Engineering', status: 'Active', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDjBWbOUw-8uQ2bd9vogLgtemig-qQTvjQ8Zv29Bd_cwOcGUsi9uurrQ1twgDxW4gpnZGfOEKRcr-JElaIT86gvlNU-SfPI_6qaXsBTPhLJUoVUOZEf-lTShLIU1NGFRf9fn8gFawsB31cbFNHdoVWcSuDfQ1ejxZERh6mvbBkyeP6AwImggXemWreTckEyhifxgyW8svuoCfozgw-SA6scCAjf99e_MN_rlU_6iD2B1lLr-DHssqf3F1S1uu1W8TTwMahJgJLeTyw' },
      { id: 'e3', name: 'Jessica Lee', email: 'j.lee@company.com', role: 'UX Designer', department: 'Design', status: 'On Leave', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBiQjuyAfghLhGYwDLtEn7yLZsJ0CbLyxPo_tuNdWo-cSWHCh2P-G45yGqCeK2udz4tic3YcfirguC_Hfv4eo79Ad8DikKv3L6J-_pAQ2tCVZxrn530bcfr5xRQdCzZmVUkdGhf0s6zNnObpYczSri9Zheswh-W0MSJJqkNDLJBlKjoa3YvrFsZD6cAXQs0cprimwHA06ojJJ9PJNGAF_3aw209UBq0IgMWk09LibFWqLNjCrk0DG7s5n9OgFAMMWHRAw9e84OjiOU' },
      { id: 'e4', name: 'Emily Davis', email: 'e.davis@company.com', role: 'HR Specialist', department: 'HR', status: 'Active', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4H25ln_ynzgML7c5_Xd9FqsNzoifurVEkBjP94CLN_HChdWYYnEHCGG58u3QeP1psN5CvhMKzes5Qk9CZ2LqiA8N_Yo0KuAaE1zAUrx0hGel-F3lI_7hvd3Ws6kkN-2itUV1ktkUnJ903Nv9ywQO7oO_xrDTh-UyAw6mYlOrXyMy8Ej3sUf-azlHCG58pyllq21ErlC1yg5xheqX0HhIrIiYMYr6LKdCEIOAAjgnNDfIvgBgEugM8K7fylAE4nmLgbCJQA8gQFeY' },
      { id: 'e5', name: 'Mark Wilson', email: 'mark.w@company.com', role: 'QA Engineer', department: 'Engineering', status: 'Active', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBzXmjWz74EG2YsFkNOfcRTS19Zvz_3bIL0B4WQGl04mK8s3v1dqEDNeBkKsAVumPXPIoirGq2UcAa4lmpIaabP0wsa0TPPdBqnXwrXDH5XdzeGN0vZLHFfyGQ1yipiOBSzg8uq-gBLbCoOrn2j9ugnHEFNbMGcsIPp2gkTqUkskrWQPa6CjbvBX-9waCcXCp4jn6ZXqnvMRwzsRQ26z12MF7uOFK-hxWcdZzY1mM_pkl-9N8bWR_kP5zzdwH9P87RgG5ccvwWu9IE' },
    ],
    requisitions: [
      { id: 'r1', title: 'Senior Frontend Dev', candidates: 3, progressPct: 70 },
      { id: 'r2', title: 'Marketing Lead', candidates: 8, progressPct: 30 },
      { id: 'r3', title: 'Payroll Manager', candidates: 5, progressPct: 45 },
    ],
    turnoverRates6m: [2.1, 1.8, 2.5, 1.5, 1.0, 1.2],
    turnoverRatesYtd: [1.6, 2.0, 2.3, 2.8, 2.1, 1.9, 1.7, 1.8, 1.5, 1.2, 1.3, 1.4],
    months6m: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    leaveRequests: [
      { id: 'l1', name: 'Mark Wilson', type: 'Sick Leave', range: 'Dec 24-25', status: 'pending' },
      { id: 'l2', name: 'Emily Davis', type: 'Vacation', range: 'Dec 28-Jan 2', status: 'pending' },
    ],
    performance: { q3CompletedPct: 85, pending: { selfReviews: 12, managerReviews: 4 } },
    training: [
      { id: 't1', name: 'Security 101', dueInDays: 3, completionPercent: 75, icon: 'security' },
      { id: 't2', name: 'Compliance', dueInDays: 7, completionPercent: 20, icon: 'gavel' },
    ],
    payrollNext: { date: '2025-12-30', runApproved: true },
  };

  // Employees
  app.get('/api/hr/employees', async (req, res) => {
    try {
      const { search } = req.query;
      let list = hrData.employees;
      if (search) {
        const q = String(search).toLowerCase();
        list = list.filter(
          (e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
        );
      }
      res.json(list);
    } catch (err) {
      console.error('Error fetching employees:', err);
      res.status(500).json({ message: 'Failed to fetch employees' });
    }
  });

  // Requisitions
  app.get('/api/hr/requisitions', async (_req, res) => {
    res.json(hrData.requisitions);
  });

  // Analytics
  app.get('/api/hr/analytics', async (req, res) => {
    const range = req.query.range === 'ytd' ? 'ytd' : '6m';
    const turnover = range === 'ytd' ? hrData.turnoverRatesYtd : hrData.turnoverRates6m;
    const months = range === 'ytd' ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] : hrData.months6m;
    res.json({ turnoverRates: turnover, months, newHires: 42 });
  });

  // Leave Requests
  app.get('/api/hr/leave-requests', async (_req, res) => {
    res.json(hrData.leaveRequests);
  });

  app.post('/api/hr/leave-requests/:id/approve', async (req, res) => {
    const { id } = req.params;
    const item = hrData.leaveRequests.find((l) => l.id === id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    item.status = 'approved';
    res.json({ message: 'Approved', data: item });
  });

  app.post('/api/hr/leave-requests/:id/reject', async (req, res) => {
    const { id } = req.params;
    const item = hrData.leaveRequests.find((l) => l.id === id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    item.status = 'rejected';
    res.json({ message: 'Rejected', data: item });
  });

  // Performance
  app.get('/api/hr/performance', async (_req, res) => {
    res.json(hrData.performance);
  });

  // Training
  app.get('/api/hr/training', async (_req, res) => {
    res.json(hrData.training);
  });

  // Payroll Next
  app.get('/api/hr/payroll-next', async (_req, res) => {
    res.json(hrData.payrollNext);
  });

  // ===========================
  // Leave Allocation Routes
  // ===========================
  
  // Get leave allocations (with optional filters)
  app.get('/api/hr/leave-allocations', async (req, res) => {
    try {
      const query = {};
      if (req.query.employeeId) query.employeeId = req.query.employeeId;
      if (req.query.year) query.year = parseInt(req.query.year);
      
      const allocations = await api.getLeaveAllocations(query);
      res.json({ success: true, data: allocations });
    } catch (error) {
      console.error('Error fetching leave allocations:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create or update leave allocation
  app.post('/api/hr/leave-allocations', async (req, res) => {
    try {
      const allocation = await api.createLeaveAllocation(req.body);
      res.status(201).json({ success: true, data: allocation });
    } catch (error) {
      console.error('Error creating leave allocation:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ===========================
  // Leave Request Routes
  // ===========================
  
  // Get leave requests (with optional filters)
  app.get('/api/approval/leave-requests', async (req, res) => {
    try {
      const query = {};
      if (req.query.employeeId) query.employeeId = req.query.employeeId;
      if (req.query.managerId) query.managerId = req.query.managerId;
      if (req.query.status) query.status = req.query.status;
      
      const requests = await api.getLeaveRequests(query);
      res.json({ success: true, data: requests });
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create leave request
  app.post('/api/approval/leave-requests', async (req, res) => {
    try {
      const request = await api.createLeaveRequest(req.body);
      res.status(201).json({ success: true, data: request });
    } catch (error) {
      console.error('Error creating leave request:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Manager approves leave request
  app.post('/api/approval/leave-requests/:id/manager-approve', async (req, res) => {
    try {
      const { comments } = req.body;
      const request = await api.updateLeaveRequestStatus(
        req.params.id,
        'approved_manager',
        comments,
        'manager'
      );
      
      // Send email to HR for final approval
      // You can add email logic here
      
      res.json({ success: true, data: request });
    } catch (error) {
      console.error('Error approving leave request:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Manager rejects leave request
  app.post('/api/approval/leave-requests/:id/manager-reject', async (req, res) => {
    try {
      const { comments } = req.body;
      const request = await api.updateLeaveRequestStatus(
        req.params.id,
        'rejected_manager',
        comments,
        'manager'
      );
      
      res.json({ success: true, data: request });
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // HR approves leave request (final approval)
  app.post('/api/approval/leave-requests/:id/hr-approve', async (req, res) => {
    try {
      const { comments } = req.body;
      const request = await api.updateLeaveRequestStatus(
        req.params.id,
        'approved',
        comments,
        'hr'
      );
      
      // Update leave allocation usage
      const allocation = await api.getLeaveAllocations({
        employeeId: request.employeeId,
        year: new Date(request.fromDate).getFullYear()
      });
      
      if (allocation && allocation.length > 0 && request.leaveType !== 'unpaid') {
        await api.updateLeaveUsage(
          request.employeeId,
          new Date(request.fromDate).getFullYear(),
          request.leaveType,
          request.days
        );
      }
      
      res.json({ success: true, data: request });
    } catch (error) {
      console.error('Error approving leave request:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // HR rejects leave request
  app.post('/api/approval/leave-requests/:id/hr-reject', async (req, res) => {
    try {
      const { comments } = req.body;
      const request = await api.updateLeaveRequestStatus(
        req.params.id,
        'rejected',
        comments,
        'hr'
      );
      
      res.json({ success: true, data: request });
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Send leave approval email (to manager or HR)
  app.post('/api/send-leave-approval-email', async (req, res) => {
    try {
      const {
        to,
        employeeName,
        employeeId,
        leaveType,
        fromDate,
        toDate,
        days,
        reason,
        managerName,
        approvalStage
      } = req.body;

      await sendApprovalEmail({
        to,
        employeeName,
        employeeId,
        amount: `${days} days`,
        reason: reason || 'N/A',
        approver: managerName,
        requestType: `leave (${leaveType})`,
        additionalInfo: `From: ${fromDate}, To: ${toDate}\nApproval Stage: ${approvalStage}`,
      });

      res.json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
      console.error('Error sending leave approval email:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ===========================
  // Travel Request Routes
  // ===========================
  
  // Get travel requests (with optional filters)
  app.get('/api/approval/travel-requests', async (req, res) => {
    try {
      const query = {};
      if (req.query.employeeId) query.employeeId = req.query.employeeId;
      if (req.query.managerId) query.managerId = req.query.managerId;
      if (req.query.status) query.status = req.query.status;
      
      const requests = await api.getTravelRequests(query);
      res.json({ success: true, data: requests });
    } catch (error) {
      console.error('Error fetching travel requests:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create travel request
  app.post('/api/approval/travel-requests', async (req, res) => {
    try {
      const request = await api.createTravelRequest(req.body);
      res.status(201).json({ success: true, data: request });
    } catch (error) {
      console.error('Error creating travel request:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Manager approves travel request
  app.post('/api/approval/travel-requests/:id/manager-approve', async (req, res) => {
    try {
      const { comments } = req.body;
      const request = await api.updateTravelRequestStatus(
        req.params.id,
        'approved_manager',
        comments,
        'manager'
      );
      
      res.json({ success: true, data: request });
    } catch (error) {
      console.error('Error approving travel request:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Manager rejects travel request
  app.post('/api/approval/travel-requests/:id/manager-reject', async (req, res) => {
    try {
      const { comments } = req.body;
      const request = await api.updateTravelRequestStatus(
        req.params.id,
        'rejected_manager',
        comments,
        'manager'
      );
      
      res.json({ success: true, data: request });
    } catch (error) {
      console.error('Error rejecting travel request:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Update travel booking details (after manager approval)
  app.post('/api/approval/travel-requests/:id/book', async (req, res) => {
    try {
      const bookingData = {
        ticketBooked: req.body.ticketBooked || false,
        bookedBy: req.body.bookedBy,
        bookingReference: req.body.bookingReference,
        hotelBooked: req.body.hotelBooked || false,
        hotelDetails: req.body.hotelDetails,
      };
      
      const request = await api.updateTravelBooking(req.params.id, bookingData);
      res.json({ success: true, data: request });
    } catch (error) {
      console.error('Error booking travel:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Send travel approval email (to manager)
  app.post('/api/send-travel-approval-email', async (req, res) => {
    try {
      const {
        to,
        employeeName,
        employeeId,
        currentLocation,
        destination,
        purpose,
        fromDate,
        toDate,
        numberOfDays,
        numberOfNights,
        accommodationRequired,
        budget,
        managerName,
        approvalStage
      } = req.body;

      await sendApprovalEmail({
        to,
        employeeName,
        employeeId,
        amount: `Budget: $${budget}`,
        reason: purpose,
        approver: managerName,
        requestType: 'travel',
        additionalInfo: `From: ${currentLocation} → ${destination}\nDates: ${fromDate} to ${toDate}\nDuration: ${numberOfDays} days, ${numberOfNights} nights\nAccommodation: ${accommodationRequired ? 'Required' : 'Not Required'}\nApproval Stage: ${approvalStage}\n\nNote: Tickets can only be booked after manager approval.`,
      });

      res.json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
      console.error('Error sending travel approval email:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =====================================================
  // USER PROFILE ENDPOINTS
  // =====================================================
  
  // Get user profile by clerk ID
  app.get('/api/user/profile/:clerkId', async (req, res) => {
    try {
      const { clerkId } = req.params;
      const user = await api.getUserByClerkId(clerkId);
      
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      res.json({ success: true, data: user });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create or update user profile
  app.post('/api/user/profile', async (req, res) => {
    try {
      const { clerkId, email, fullName, phoneNumber, department, jobTitle, bio } = req.body;
      
      if (!clerkId || !email || !fullName) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: clerkId, email, fullName' 
        });
      }
      
      const user = await api.createOrUpdateUserProfile({
        clerkId,
        email,
        fullName,
        phoneNumber,
        department,
        jobTitle,
        bio,
      });
      
      res.json({ success: true, data: user });
    } catch (error) {
      console.error('Error creating/updating user profile:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Update user profile
  app.put('/api/user/profile/:clerkId', async (req, res) => {
    try {
      const { clerkId } = req.params;
      const { phoneNumber, department, jobTitle, bio, fullName, email } = req.body;
      
      const user = await api.updateUserProfile(clerkId, {
        phoneNumber,
        department,
        jobTitle,
        bio,
        fullName,
        email,
      });
      
      res.json({ success: true, data: user });
    } catch (error) {
      console.error('Error updating user profile:', error);
      if (error.message === 'User not found') {
        return res.status(404).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Upload profile picture
  app.post('/api/user/profile/:clerkId/upload-picture', async (req, res) => {
    try {
      const { clerkId } = req.params;
      const { pictureUrl } = req.body;
      
      if (!pictureUrl) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing pictureUrl' 
        });
      }
      
      const user = await api.updateUserProfilePicture(clerkId, pictureUrl);
      
      res.json({ success: true, data: user });
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      if (error.message === 'User not found') {
        return res.status(404).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  const port = process.env.PORT || 5000;
  if (!process.env.PORT) {
    console.warn('PORT is not set; defaulting to 5000');
  }
  const server = app.listen(port, () => {
    console.log(`Steps backend listening on http://localhost:${port}`);
  });
  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      const fallback = String(Number(port) + 1);
      console.warn(`Port ${port} in use. Falling back to ${fallback}.`);
      app.listen(fallback, () => {
        console.log(`Steps backend listening on http://localhost:${fallback}`);
      });
    } else {
      console.error('Server failed to start:', err);
    }
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
});
