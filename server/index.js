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
const multer = require('multer');
const fs = require('fs');
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
const EmployeeModel = require('./models/Employee');
const JobRequisitionModel = require('./models/JobRequisition');
const TrainingModel = require('./models/Training');
const DepartmentModel = require('./models/Department');
const JobTitleModel = require('./models/JobTitle');

// Static lists used to seed the DB when empty
const DEFAULT_DEPARTMENTS = [
  { name: 'IT Security', code: 'ITS', icon: 'fa-shield-halved', color: 'blue' },
  { name: 'HR', code: 'HR', icon: 'fa-users', color: 'purple' },
  { name: 'Finance', code: 'FIN', icon: 'fa-dollar-sign', color: 'green' },
  { name: 'Legal', code: 'LEG', icon: 'fa-gavel', color: 'red' },
  { name: 'Marketing', code: 'MKT', icon: 'fa-bullhorn', color: 'orange' },
  { name: 'Operations', code: 'OPS', icon: 'fa-cogs', color: 'gray' },
];

const DEFAULT_JOB_TITLES = [
  'Software Engineer',
  'HR Manager',
  'Finance Manager',
  'Legal Counsel',
  'Marketing Specialist',
  'Operations Manager',
  'Accountant',
  'Product Manager',
];
const VendorModel = require('./models/Vendor');
const { sendApprovalEmail, sendPOReviewEmail, sendPasswordResetEmail } = require('./utils/emailService');

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
if (!process.env.FRONTEND_URL) {
  console.error('FRONTEND_URL not set in .env file');
  process.exit(1);
}
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(morgan('dev'));

// Request timeout middleware - prevent hanging requests
app.use((req, res, next) => {
  req.setTimeout(60000, () => {
    res.status(408).json({ success: false, error: 'Request timeout' });
  });
  res.setTimeout(60000, () => {
    res.status(408).json({ success: false, error: 'Response timeout' });
  });
  next();
});

// Create uploads directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads', 'vendors');
const avatarsDir = path.join(__dirname, 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, JPG, and PNG files are allowed'));
    }
  },
});

// Avatar upload configuration
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for avatars
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpg|jpeg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG, PNG, GIF, and WEBP images are allowed for avatars'));
    }
  },
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set in .env file');
  process.exit(1);
}

async function start() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });
    console.log('✓ Connected to MongoDB');

    // Handle MongoDB connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✓ MongoDB reconnected');
    });

    // Basic seed data for modules (minimal auto-seeding)
    const seedModules = [
      { id: 1, name: "Approval", componentName: "Approval" },
      { id: 2, name: "Inventory", componentName: "Inventory" },
      { id: 3, name: "HRM", componentName: "HRM" },
      { id: 4, name: "FM", componentName: "FM" },
      { id: 5, name: "Finance", componentName: "Finance" },
      { id: 6, name: "Security", componentName: "Security" },
      { id: 7, name: "Admin", componentName: "Admin" },
      { id: 8, name: "Attendance", componentName: "Attendance" },
      { id: 9, name: "DocSign", componentName: "DocSign" },
      { id: 10, name: "Material Requests", componentName: "MaterialRequests" },
      { id: 11, name: "Purchase Orders", componentName: "PurchaseOrders" },
      { id: 12, name: "Analytics", componentName: "Analytics" },
      { id: 13, name: "Policy", componentName: "Policy" },
    ];

    // Seed modules if empty or update with new modules
    const moduleCount = await ModuleModel.countDocuments();
    if (moduleCount === 0) {
      await ModuleModel.insertMany(seedModules);
      console.log('Seeded modules');
    } else {
      // Upsert modules: update existing ones and add new ones
      for (const module of seedModules) {
        await ModuleModel.findOneAndUpdate(
          { id: module.id },
          module,
          { upsert: true, new: true }
        );
      }
      console.log('Updated modules to match seed data');
    }
  } catch (err) {
    console.error('✗ Failed to connect to MongoDB');
    console.error('  Error:', err.message);
    console.error('  Please ensure MongoDB is running and MONGODB_URI is set correctly in .env');
    process.exit(1);
  }

  // API endpoints using centralized server API helpers
  const api = require('./api');
  const { authMiddleware, generateToken } = require('./middleware/auth');
  const crypto = require('crypto');

  // ==================== HEALTH CHECK ROUTE ====================

  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    try {
      const dbStatus = mongoose.connection.readyState === 1;
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();
      
      const health = {
        status: dbStatus ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(uptime),
        database: {
          connected: dbStatus,
          state: mongoose.connection.readyState // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
        },
        memory: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          rss: Math.round(memoryUsage.rss / 1024 / 1024) // MB
        }
      };

      const statusCode = dbStatus ? 200 : 503;
      res.status(statusCode).json({ success: true, data: health });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(503).json({ success: false, error: 'Health check failed' });
    }
  });

  // ==================== AUTHENTICATION ROUTES ====================

  // Signup
  app.post('/api/auth/signup', async (req, res) => {
    try {
      console.log('Signup payload:', req.body);

      // Sanitize inputs
      const firstName = (req.body.firstName || '').toString().trim();
      const lastName = (req.body.lastName || '').toString().trim();
      const email = (req.body.email || '').toString().trim().toLowerCase();
      const password = (req.body.password || '').toString();
      const role = (req.body.role || 'user').toString().trim();
      const department = (req.body.department || '').toString().trim() || null;
      const jobTitle = (req.body.jobTitle || '').toString().trim() || null;

      // Validate input
      if (!firstName || !lastName || !email || !password) {
        console.warn('Signup validation failed. Missing fields. Payload:', { firstName, lastName, email: req.body.email ? '[REDACTED]' : '', password: password ? '[PROVIDED]' : '' });
        return res.status(400).json({
          success: false,
          error: 'All fields are required',
        });
      }

      // Basic email format check
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        console.warn('Signup validation failed. Invalid email:', email);
        return res.status(400).json({ success: false, error: 'Invalid email address' });
      }

      // Password length check
      if (password.length < 8) {
        console.warn('Signup validation failed. Password too short');
        return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
      }

      // Helper to escape user input for regex
      const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      // Validate department if provided (check DB)
      if (department) {
        const q = {
          $or: [
            { name: new RegExp(`^${escapeRegex(department)}$`, 'i') },
            { code: new RegExp(`^${escapeRegex(department)}$`, 'i') },
          ],
        };
        // also try to match by id if looks like an ObjectId
        if (/^[0-9a-fA-F]{24}$/.test(department)) q.$or.push({ _id: department });
        const foundDept = await DepartmentModel.findOne(q).lean();
        if (!foundDept) {
          console.warn('Signup validation failed. Invalid department:', department);
          return res.status(400).json({ success: false, error: 'Invalid department' });
        }
      }

      // Validate job title (required) against DB
      if (!jobTitle) {
        console.warn('Signup validation failed. Missing job title');
        return res.status(400).json({ success: false, error: 'Job title is required' });
      }
      const foundJT = await JobTitleModel.findOne({ title: new RegExp(`^${escapeRegex(jobTitle)}$`, 'i') }).lean();
      if (!foundJT) {
        console.warn('Signup validation failed. Invalid job title:', jobTitle);
        return res.status(400).json({ success: false, error: 'Invalid job title' });
      }

      // Check if user already exists
      const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email already registered',
        });
      }

      // Create new user
      const user = new UserModel({
        firstName,
        lastName,
        email: email.toLowerCase(),
        password,
        role: role || 'user',
        status: 'Active',
        department: (typeof foundDept !== 'undefined' && foundDept) ? foundDept.name : (department || null),
        jobTitle: (typeof foundJT !== 'undefined' && foundJT) ? foundJT.title : (jobTitle || null),
      });

      await user.save();

      // Generate token with role
      const token = generateToken(user._id, user.role);

      // Return user data without password
      const userData = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        department: user.department || null,
        jobTitle: user.jobTitle || null,
      };

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
          user: userData,
          token,
        },
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create account',
      });
    }
  });

  // Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      console.log('Login payload:', req.body);

      // Sanitize inputs
      const email = (req.body.email || '').toString().trim().toLowerCase();
      const password = (req.body.password || '').toString();

      // Validate input
      if (!email || !password) {
        console.warn('Login validation failed. Missing fields. Payload:', { email: req.body.email ? '[REDACTED]' : '', password: password ? '[PROVIDED]' : '' });
        return res.status(400).json({
          success: false,
          error: 'Email and password are required',
        });
      }

      // Basic email format check
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        console.warn('Login validation failed. Invalid email:', email);
        return res.status(400).json({ success: false, error: 'Invalid email address' });
      }

      // Find user with password field
      const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }

      // Check if account is active
      if (user.status !== 'Active') {
        return res.status(403).json({
          success: false,
          error: 'Account is not active',
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate token with role for enhanced security
      const token = generateToken(user._id, user.role);

      // Return user data without password
      const userData = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        profilePicture: user.profilePicture,
        department: user.department,
        jobTitle: user.jobTitle,
      };

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userData,
          token,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed',
      });
    }
  });

  // Verify token
  app.get('/api/auth/verify', authMiddleware, async (req, res) => {
    try {
      const userData = {
        _id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        fullName: req.user.fullName,
        email: req.user.email,
        role: req.user.role,
        status: req.user.status,
        profilePicture: req.user.profilePicture,
        department: req.user.department,
        jobTitle: req.user.jobTitle,
      };

      res.json({
        success: true,
        data: {
          user: userData,
        },
      });
    } catch (error) {
      console.error('Verify token error:', error);
      res.status(500).json({
        success: false,
        error: 'Verification failed',
      });
    }
  });

  // Logout
  app.post('/api/auth/logout', authMiddleware, async (req, res) => {
    try {
      // In a JWT-based system, logout is handled client-side by removing the token
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed',
      });
    }
  });

  // Forgot password
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
        });
      }

      const user = await UserModel.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Don't reveal that user doesn't exist
        return res.json({
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent',
        });
      }

      // Generate reset token
      const resetToken = user.generateResetToken();
      await user.save();

      // Send reset email
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
      await sendPasswordResetEmail(user.email, resetUrl);

      res.json({
        success: true,
        message: 'Password reset email sent',
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process request',
      });
    }
  });

  // Reset password
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Token and new password are required',
        });
      }

      // Hash token
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Find user with valid token
      const user = await UserModel.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired token',
        });
      }

      // Update password
      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.json({
        success: true,
        message: 'Password reset successful',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset password',
      });
    }
  });

  // ==================== END AUTHENTICATION ROUTES ====================

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
      
      // Fetch both users and employees, then merge them
      let userQuery = {};
      let employeeQuery = {};

      if (role) {
        userQuery.role = role;
        employeeQuery.role = role;
      }
      if (status) {
        userQuery.status = status;
        employeeQuery.status = status;
      }
      if (search) {
        userQuery.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
        employeeQuery.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      // Fetch users from UserModel
      const users = await UserModel.find(userQuery)
        .select('-resetPasswordToken -resetPasswordExpires')
        .sort({ createdAt: -1 })
        .populate('invitedBy', 'fullName email')
        .lean();

      // Fetch employees from EmployeeModel (wrap in try-catch in case model has issues)
      let employees = [];
      try {
        employees = await EmployeeModel.find(employeeQuery)
          .sort({ createdAt: -1 })
          .lean();
      } catch (empErr) {
        console.error('Error fetching employees for user list:', empErr);
        // Continue with just users if employees fetch fails
      }

      // Map employees to user format and merge with users
      const employeesAsUsers = employees.map(emp => ({
        _id: emp._id,
        id: emp.employeeId || emp._id?.toString(),
        fullName: emp.name || '',
        email: emp.email || '',
        role: emp.role || 'Employee',
        status: emp.status || 'Active',
        department: emp.department || '',
        jobTitle: emp.jobTitle || '',
        phone: emp.phone || '',
        avatar: emp.avatar || '',
        createdAt: emp.createdAt || new Date(),
        source: 'employee' // Mark as employee source
      }));

      // Merge users and employees, removing duplicates by email
      const emailSet = new Set();
      const mergedUsers = [];

      [...users, ...employeesAsUsers].forEach(user => {
        if (user.email && !emailSet.has(user.email)) {
          emailSet.add(user.email);
          mergedUsers.push(user);
        }
      });

      // Sort by creation date
      mergedUsers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      res.json(mergedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      res.status(500).json({ message: 'Failed to fetch users', error: err.message });
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

  // Get departments list (DB-driven, seed when empty)
  app.get('/api/departments', async (req, res) => {
    try {
      let departments = await DepartmentModel.find().lean();
      if (!departments || departments.length === 0) {
        // Seed defaults
        await DepartmentModel.insertMany(DEFAULT_DEPARTMENTS);
        departments = await DepartmentModel.find().lean();
      }
      res.json({ departments });
    } catch (err) {
      console.error('Error fetching departments:', err);
      res.status(500).json({ message: 'Failed to fetch departments' });
    }
  });

  // Get job titles list (DB-driven, seed when empty)
  app.get('/api/job-titles', async (req, res) => {
    try {
      let jobTitles = await JobTitleModel.find().lean();
      if (!jobTitles || jobTitles.length === 0) {
        await JobTitleModel.insertMany(DEFAULT_JOB_TITLES.map(t => ({ title: t })));
        jobTitles = await JobTitleModel.find().lean();
      }
      // return simple array of titles for the client
      res.json({ jobTitles: jobTitles.map(j => j.title) });
    } catch (err) {
      console.error('Error fetching job titles:', err);
      res.status(500).json({ message: 'Failed to fetch job titles' });
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

  // Employees - Get all employees with search
  app.get('/api/hr/employees', async (req, res) => {
    try {
      const { search } = req.query;
      let query = {};
      
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query = {
          $or: [
            { name: searchRegex },
            { email: searchRegex },
            { department: searchRegex },
            { role: searchRegex },
          ],
        };
      }
      
      const employees = await EmployeeModel.find(query)
        .select('-__v')
        .sort({ name: 1 })
        .lean();

      // Transform to match frontend expected format
      const formattedEmployees = employees.map(emp => ({
        id: emp._id.toString(),
        _id: emp._id,
        name: emp.name,
        email: emp.email,
        phone: emp.phone || '',
        dateOfBirth: emp.dateOfBirth,
        department: emp.department,
        role: emp.role,
        jobTitle: emp.jobTitle || emp.role,
        startDate: emp.startDate,
        status: emp.status,
        avatar: emp.avatar || '',
        employeeId: emp.employeeId,
      }));

      res.json({ success: true, data: formattedEmployees });
    } catch (err) {
      console.error('Error fetching employees:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch employees', error: err.message });
    }
  });

  // Add new employee
  app.post('/api/hr/employees', async (req, res) => {
    try {
      const { name, email, phone, dateOfBirth, department, jobTitle, startDate } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
      }

      // Check if email already exists
      const existingEmployee = await EmployeeModel.findOne({ email: email.toLowerCase() });
      if (existingEmployee) {
        return res.status(400).json({ message: 'Employee with this email already exists' });
      }

      // Generate employee ID
      const count = await EmployeeModel.countDocuments();
      const employeeId = `EMP${String(count + 1).padStart(4, '0')}`;

      const newEmployee = new EmployeeModel({
        name,
        email: email.toLowerCase(),
        phone: phone || '',
        dateOfBirth: dateOfBirth || null,
        department: department || 'Engineering',
        role: jobTitle || 'Employee',
        jobTitle: jobTitle || 'Employee',
        startDate: startDate || new Date(),
        status: 'Active',
        employeeId,
      });

      await newEmployee.save();

      // Format response
      const response = {
        id: newEmployee._id.toString(),
        _id: newEmployee._id,
        name: newEmployee.name,
        email: newEmployee.email,
        phone: newEmployee.phone,
        dateOfBirth: newEmployee.dateOfBirth,
        department: newEmployee.department,
        role: newEmployee.role,
        jobTitle: newEmployee.jobTitle,
        startDate: newEmployee.startDate,
        status: newEmployee.status,
        employeeId: newEmployee.employeeId,
      };

      res.status(201).json({ success: true, data: response });
    } catch (err) {
      console.error('Error adding employee:', err);
      res.status(500).json({ success: false, message: 'Failed to add employee', error: err.message });
    }
  });

  // Get single employee by ID
  app.get('/api/hr/employees/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const ObjectId = require('mongoose').Types.ObjectId;
      
      // Check if ID is valid MongoDB ObjectId
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid employee ID' });
      }

      const employee = await EmployeeModel.findById(id).select('-__v').lean();

      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }

      // Format response
      const response = {
        id: employee._id.toString(),
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        phone: employee.phone || '',
        dateOfBirth: employee.dateOfBirth,
        department: employee.department,
        role: employee.role,
        jobTitle: employee.jobTitle || employee.role,
        startDate: employee.startDate,
        status: employee.status || 'Active',
        avatar: employee.avatar || '',
        salary: employee.salary || 0,
        address: employee.address || '',
        emergencyContact: employee.emergencyContact || { name: '', relationship: '', phone: '' },
        employeeId: employee.employeeId,
        managerId: employee.managerId,
      };

      res.json({ success: true, data: response });
    } catch (err) {
      console.error('Error fetching employee:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch employee', error: err.message });
    }
  });

  // Update employee by ID with avatar upload
  app.put('/api/hr/employees/:id', avatarUpload.single('avatar'), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone, dateOfBirth, department, jobTitle, status, salary, address, emergencyContact, updatedBy } = req.body;
      const ObjectId = require('mongoose').Types.ObjectId;
      
      // Check if ID is valid MongoDB ObjectId
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid employee ID' });
      }

      // Get old employee data for audit log
      const oldEmployee = await EmployeeModel.findById(id).lean();
      if (!oldEmployee) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }

      // Find and update employee
      const updateData = {};
      const changes = [];
      
      // Always allow these fields to be updated
      if (name !== undefined && name !== oldEmployee.name) {
        updateData.name = name;
        changes.push({ field: 'name', oldValue: oldEmployee.name, newValue: name });
      }
      if (email !== undefined && email.toLowerCase() !== oldEmployee.email) {
        updateData.email = email.toLowerCase();
        changes.push({ field: 'email', oldValue: oldEmployee.email, newValue: email.toLowerCase() });
      }
      if (phone !== undefined && phone !== oldEmployee.phone) {
        updateData.phone = phone;
        changes.push({ field: 'phone', oldValue: oldEmployee.phone, newValue: phone });
      }
      if (dateOfBirth !== undefined && dateOfBirth !== oldEmployee.dateOfBirth) {
        updateData.dateOfBirth = dateOfBirth;
        changes.push({ field: 'dateOfBirth', oldValue: oldEmployee.dateOfBirth, newValue: dateOfBirth });
      }
      if (address !== undefined && address !== oldEmployee.address) {
        updateData.address = address;
        changes.push({ field: 'address', oldValue: oldEmployee.address, newValue: address });
      }
      if (emergencyContact !== undefined) {
        const parsedContact = typeof emergencyContact === 'string' ? JSON.parse(emergencyContact) : emergencyContact;
        updateData.emergencyContact = parsedContact;
        changes.push({ field: 'emergencyContact', oldValue: oldEmployee.emergencyContact, newValue: parsedContact });
      }

      // Handle avatar file upload
      if (req.file) {
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        updateData.avatar = avatarUrl;
        changes.push({ field: 'avatar', oldValue: oldEmployee.avatar, newValue: avatarUrl });
        
        // Delete old avatar file if it exists (async)
        if (oldEmployee.avatar && oldEmployee.avatar.startsWith('/uploads/avatars/')) {
          const oldFilePath = path.join(__dirname, oldEmployee.avatar);
          try {
            await fs.promises.access(oldFilePath);
            await fs.promises.unlink(oldFilePath);
          } catch (err) {
            // File doesn't exist or can't be deleted, ignore
            console.log('Could not delete old avatar:', err.message);
          }
        }
      }

      // Check if current user is HR to allow these updates
      // (In a real app, you'd verify the current user's role from the JWT token)
      if (department !== undefined && department !== oldEmployee.department) {
        updateData.department = department;
        changes.push({ field: 'department', oldValue: oldEmployee.department, newValue: department });
      }
      if (jobTitle !== undefined && jobTitle !== oldEmployee.jobTitle) {
        updateData.jobTitle = jobTitle;
        changes.push({ field: 'jobTitle', oldValue: oldEmployee.jobTitle, newValue: jobTitle });
      }
      if (status !== undefined && status !== oldEmployee.status) {
        updateData.status = status;
        changes.push({ field: 'status', oldValue: oldEmployee.status, newValue: status });
      }
      if (salary !== undefined && parseFloat(salary) !== oldEmployee.salary) {
        updateData.salary = parseFloat(salary);
        changes.push({ field: 'salary', oldValue: oldEmployee.salary, newValue: parseFloat(salary) });
      }

      const employee = await EmployeeModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      ).select('-__v').lean();

      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }

      // Create audit log entry
      if (changes.length > 0) {
        await AuditLogModel.create({
          userId: updatedBy || 'system',
          action: 'UPDATE_EMPLOYEE',
          resource: 'Employee',
          resourceId: id,
          details: {
            employeeName: employee.name,
            changes: changes,
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }

      // Format response
      const response = {
        id: employee._id.toString(),
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        phone: employee.phone || '',
        dateOfBirth: employee.dateOfBirth,
        department: employee.department,
        role: employee.role,
        jobTitle: employee.jobTitle || employee.role,
        startDate: employee.startDate,
        status: employee.status || 'Active',
        avatar: employee.avatar || '',
        salary: employee.salary || 0,
        address: employee.address || '',
        emergencyContact: employee.emergencyContact || { name: '', relationship: '', phone: '' },
        employeeId: employee.employeeId,
        managerId: employee.managerId,
      };

      res.json({ success: true, data: response, message: 'Employee updated successfully' });
    } catch (err) {
      console.error('Error updating employee:', err);
      res.status(500).json({ success: false, message: 'Failed to update employee', error: err.message });
    }
  });

  // Bulk update employees (HR only)
  app.put('/api/hr/employees/bulk-update', async (req, res) => {
    try {
      const { employeeIds, updates, updatedBy } = req.body;
      const ObjectId = require('mongoose').Types.ObjectId;
      
      if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Employee IDs array is required' });
      }

      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, message: 'Updates object is required' });
      }

      // Validate all IDs
      const validIds = employeeIds.filter(id => ObjectId.isValid(id));
      if (validIds.length !== employeeIds.length) {
        return res.status(400).json({ success: false, message: 'Some employee IDs are invalid' });
      }

      // Build update object (only allow HR fields)
      const updateData = {};
      if (updates.department !== undefined) updateData.department = updates.department;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.jobTitle !== undefined) updateData.jobTitle = updates.jobTitle;

      // Update multiple employees
      const result = await EmployeeModel.updateMany(
        { _id: { $in: validIds } },
        { $set: updateData }
      );

      // Create audit log for bulk update
      await AuditLogModel.create({
        userId: updatedBy || 'system',
        action: 'BULK_UPDATE_EMPLOYEES',
        resource: 'Employee',
        resourceId: validIds.join(','),
        details: {
          employeeCount: validIds.length,
          updates: updateData,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({ 
        success: true, 
        message: `${result.modifiedCount} employees updated successfully`,
        modifiedCount: result.modifiedCount 
      });
    } catch (err) {
      console.error('Error bulk updating employees:', err);
      res.status(500).json({ success: false, message: 'Failed to bulk update employees', error: err.message });
    }
  });

  // Get activity log for an employee
  app.get('/api/hr/employees/:id/activity', async (req, res) => {
    try {
      const { id } = req.params;
      const { limit = 50 } = req.query;

      const activities = await AuditLogModel.find({
        $or: [
          { resourceId: id },
          { 'details.employeeId': id }
        ]
      })
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .lean();

      const formattedActivities = activities.map(activity => ({
        id: activity._id.toString(),
        action: activity.action,
        userId: activity.userId,
        timestamp: activity.timestamp,
        details: activity.details,
        ipAddress: activity.ipAddress,
      }));

      res.json({ success: true, data: formattedActivities });
    } catch (err) {
      console.error('Error fetching activity log:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch activity log', error: err.message });
    }
  });

  // Requisitions - Get all job requisitions
  app.get('/api/hr/requisitions', async (req, res) => {
    try {
      const requisitions = await JobRequisitionModel.find()
        .select('-__v')
        .sort({ createdAt: -1 })
        .lean();

      // Transform to match frontend expected format
      const formattedRequisitions = requisitions.map(req => ({
        id: req._id.toString(),
        _id: req._id,
        title: req.title,
        department: req.department,
        status: req.status,
        experienceLevel: req.experienceLevel,
        description: req.description,
        candidates: req.candidates || 0,
        progressPct: req.progressPct || 0,
        createdAt: req.createdAt,
      }));

      res.json(formattedRequisitions);
    } catch (err) {
      console.error('Error fetching requisitions:', err);
      res.status(500).json({ message: 'Failed to fetch requisitions', error: err.message });
    }
  });

  // Add new requisition (job posting)
  app.post('/api/hr/requisitions', async (req, res) => {
    try {
      const { title, department, status, experienceLevel, description } = req.body;
      
      if (!title || !department) {
        return res.status(400).json({ message: 'Title and department are required' });
      }

      const newRequisition = new JobRequisitionModel({
        title,
        department,
        status: status || 'draft',
        experienceLevel: experienceLevel || 'mid',
        description: description || '',
        candidates: 0,
        progressPct: 0,
      });

      await newRequisition.save();

      const response = {
        id: newRequisition._id.toString(),
        _id: newRequisition._id,
        title: newRequisition.title,
        department: newRequisition.department,
        status: newRequisition.status,
        experienceLevel: newRequisition.experienceLevel,
        description: newRequisition.description,
        candidates: newRequisition.candidates,
        progressPct: newRequisition.progressPct,
        createdAt: newRequisition.createdAt,
      };

      res.status(201).json({ success: true, data: response });
    } catch (err) {
      console.error('Error creating requisition:', err);
      res.status(500).json({ success: false, message: 'Failed to create requisition', error: err.message });
    }
  });

  // Analytics - Calculate from actual data
  app.get('/api/hr/analytics', async (req, res) => {
    try {
      const range = req.query.range === 'ytd' ? 'ytd' : '6m';
      
      // Calculate actual analytics from database
      const totalEmployees = await EmployeeModel.countDocuments({ status: 'Active' });
      
      // Get new hires for current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const newHires = await EmployeeModel.countDocuments({
        startDate: { $gte: startOfMonth },
        status: 'Active',
      });

      // Calculate turnover rates (simplified - you can enhance this)
      let months, turnoverRates;
      if (range === 'ytd') {
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        turnoverRates = Array(12).fill(0).map(() => Math.random() * 3); // Placeholder
      } else {
        months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        turnoverRates = Array(6).fill(0).map(() => Math.random() * 3); // Placeholder
      }

      res.json({ 
        turnoverRates, 
        months, 
        newHires,
        totalEmployees,
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
      res.status(500).json({ message: 'Failed to fetch analytics', error: err.message });
    }
  });

  // Legacy Leave Requests endpoint (uses new Leave Request model via api.js)
  app.get('/api/hr/leave-requests', async (_req, res) => {
    try {
      // Get recent pending leave requests for dashboard
      const requests = await api.getLeaveRequests({ status: 'pending' });
      
      // Format for HR dashboard (simplified view)
      const formatted = requests.slice(0, 10).map(req => ({
        id: req._id.toString(),
        name: req.employeeName,
        type: req.leaveType,
        range: `${new Date(req.fromDate).toLocaleDateString()} - ${new Date(req.toDate).toLocaleDateString()}`,
        status: req.status,
      }));

      res.json(formatted);
    } catch (err) {
      console.error('Error fetching leave requests:', err);
      res.json([]); // Return empty array for dashboard compatibility
    }
  });

  app.post('/api/hr/leave-requests/:id/approve', async (req, res) => {
    try {
      // Use the proper leave request approval via api
      const request = await api.updateLeaveRequestStatus(
        req.params.id,
        'approved',
        'Approved from HR dashboard',
        'hr'
      );
      res.json({ message: 'Approved', success: true, data: request });
    } catch (err) {
      console.error('Error approving leave:', err);
      res.status(500).json({ message: 'Failed to approve', error: err.message });
    }
  });

  app.post('/api/hr/leave-requests/:id/reject', async (req, res) => {
    try {
      // Use the proper leave request rejection via api
      const request = await api.updateLeaveRequestStatus(
        req.params.id,
        'rejected',
        'Rejected from HR dashboard',
        'hr'
      );
      res.json({ message: 'Rejected', success: true, data: request });
    } catch (err) {
      console.error('Error rejecting leave:', err);
      res.status(500).json({ message: 'Failed to reject', error: err.message });
    }
  });

  // Performance - Calculate from actual data
  app.get('/api/hr/performance', async (_req, res) => {
    try {
      // TODO: Implement actual performance tracking
      // For now, return default structure
      res.json({ 
        q3CompletedPct: 85, 
        pending: { 
          selfReviews: 12, 
          managerReviews: 4 
        } 
      });
    } catch (err) {
      console.error('Error fetching performance:', err);
      res.status(500).json({ message: 'Failed to fetch performance data', error: err.message });
    }
  });

  // Training - Get from database
  app.get('/api/hr/training', async (_req, res) => {
    try {
      const trainings = await TrainingModel.find({ status: 'active' })
        .select('-__v')
        .sort({ dueDate: 1 })
        .limit(10)
        .lean();

      // Calculate dueInDays for each training
      const now = new Date();
      const formatted = trainings.map(t => {
        let dueInDays = null;
        if (t.dueDate) {
          const due = new Date(t.dueDate);
          const diffTime = due - now;
          dueInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        
        return {
          id: t._id.toString(),
          _id: t._id,
          name: t.name,
          description: t.description,
          dueInDays,
          dueDate: t.dueDate,
          completionPercent: t.completionPercent || 0,
          icon: t.icon || 'book',
          category: t.category,
          mandatory: t.mandatory,
        };
      });

      res.json(formatted);
    } catch (err) {
      console.error('Error fetching training:', err);
      res.json([]); // Return empty array for compatibility
    }
  });

  // Payroll Next - TODO: Implement payroll tracking
  app.get('/api/hr/payroll-next', async (_req, res) => {
    try {
      // TODO: Implement actual payroll tracking
      // For now, return default structure
      const nextPayrollDate = new Date();
      nextPayrollDate.setDate(nextPayrollDate.getDate() + (31 - nextPayrollDate.getDate()));
      
      res.json({ 
        date: nextPayrollDate.toISOString().split('T')[0], 
        runApproved: true 
      });
    } catch (err) {
      console.error('Error fetching payroll info:', err);
      res.status(500).json({ message: 'Failed to fetch payroll data', error: err.message });
    }
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
  app.get('/api/user/profile/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const user = await api.getUserById(id);
      
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
      const { id, email, fullName, phoneNumber, department, jobTitle, bio } = req.body;
      
      if (!id || !email || !fullName) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: id, email, fullName' 
        });
      }
      
      const user = await api.createOrUpdateUserProfile({
        id,
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
  app.put('/api/user/profile/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { phoneNumber, department, jobTitle, bio, fullName, email } = req.body;
      
      const user = await api.updateUserProfile(id, {
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
  app.post('/api/user/profile/:id/upload-picture', async (req, res) => {
    try {
      const { id } = req.params;
      const { pictureUrl } = req.body;
      
      if (!pictureUrl) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing pictureUrl' 
        });
      }
      
      const user = await api.updateUserProfilePicture(id, pictureUrl);
      
      res.json({ success: true, data: user });
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      if (error.message === 'User not found') {
        return res.status(404).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ==================== FINANCE RECONCILIATION ROUTES ====================

  // Get reconciliation data
  app.get('/api/finance/reconciliation', async (req, res) => {
    try {
      // TODO: Fetch actual data from database
      const bankTransactions = [];
      const ledgerTransactions = [];

      res.json({
        success: true,
        data: {
          bankTransactions,
          ledgerTransactions,
          statementStart: 0,
          statementEnd: 0,
          clearedBalance: 0,
        },
      });
    } catch (error) {
      console.error('Error fetching reconciliation data:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Match transactions
  app.post('/api/finance/reconciliation/match', async (req, res) => {
    try {
      const { bankTransactions, ledgerTransactions } = req.body;
      
      // TODO: Implement actual matching logic with database
      // For now, just return success
      
      res.json({
        success: true,
        message: `Matched ${bankTransactions.length} bank transaction(s) with ${ledgerTransactions.length} ledger transaction(s)`,
      });
    } catch (error) {
      console.error('Error matching transactions:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Complete reconciliation
  app.post('/api/finance/reconciliation/complete', async (req, res) => {
    try {
      const { account, period, statementEnd, clearedBalance } = req.body;
      
      // TODO: Save reconciliation record to database
      
      res.json({
        success: true,
        message: 'Reconciliation completed successfully',
        data: {
          account,
          period,
          statementEnd,
          clearedBalance,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error completing reconciliation:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Save reconciliation draft
  app.post('/api/finance/reconciliation/draft', async (req, res) => {
    try {
      const { account, period, bankTransactions, ledgerTransactions } = req.body;
      
      // TODO: Save draft to database
      
      res.json({
        success: true,
        message: 'Draft saved successfully',
        data: {
          account,
          period,
          savedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Import bank statement
  app.post('/api/finance/reconciliation/import', async (req, res) => {
    try {
      const { mapping, ignoreFirstRow } = req.body;
      
      // TODO: Process uploaded CSV file and parse transactions
      // For now, return success with sample data
      
      res.json({
        success: true,
        message: 'Bank statement imported successfully',
        data: {
          imported: 45,
          mapped: mapping,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Error importing bank statement:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get accounts payable invoices
  app.get('/api/finance/accounts-payable', async (req, res) => {
    try {
      const { vendor, status, page = 1 } = req.query;
      
      // TODO: Fetch actual data from database
      const invoices = [];
      
      res.json({
        success: true,
        data: {
          invoices,
          totalPages: 0,
          currentPage: page,
        },
      });
    } catch (error) {
      console.error('Error fetching accounts payable:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Pay selected invoices
  app.post('/api/finance/accounts-payable/pay', async (req, res) => {
    try {
      const { invoiceIds } = req.body;
      
      if (!invoiceIds || invoiceIds.length === 0) {
        return res.status(400).json({ success: false, error: 'No invoices selected' });
      }
      
      // TODO: Process payments through payment gateway
      // For now, return success
      
      res.json({
        success: true,
        message: `Successfully processed payment for ${invoiceIds.length} invoice(s)`,
        data: {
          paidInvoices: invoiceIds,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Error processing payment:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get journal entries
  app.get('/api/finance/journal-entries', async (req, res) => {
    try {
      const { status, journalType, page = 1 } = req.query;
      
      // TODO: Fetch actual data from database
      const entries = [];
      
      res.json({
        success: true,
        data: {
          entries,
          totalPages: 0,
          currentPage: page,
        },
      });
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create journal entry
  app.post('/api/finance/journal-entries', async (req, res) => {
    try {
      const { date, referenceNumber, currency, memo, lineItems, totalDebit, totalCredit } = req.body;
      
      if (!referenceNumber || !lineItems || lineItems.length < 2) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid journal entry data. At least two line items are required.' 
        });
      }
      
      const difference = Math.abs(totalDebit - totalCredit);
      if (difference > 0.01) {
        return res.status(400).json({ 
          success: false, 
          error: 'Journal entry is not balanced. Total debits must equal total credits.' 
        });
      }
      
      // TODO: Save journal entry to database
      // For now, return success
      
      res.json({
        success: true,
        message: 'Journal entry saved successfully',
        data: {
          _id: 'je-' + Date.now(),
          date,
          referenceNumber,
          currency,
          memo,
          lineItems,
          totalDebit,
          totalCredit,
          status: 'Draft',
          createdAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error creating journal entry:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ==================== VENDOR MANAGEMENT ROUTES ====================

  // Get all vendors
  app.get('/api/vendors', async (req, res) => {
    try {
      const { status, serviceType, search, page = 1, limit = 12 } = req.query;
      
      // Build query
      const query = {};
      if (status) query.status = status;
      if (serviceType) query.serviceType = serviceType;
      if (search) {
        query.$or = [
          { companyName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { vendorId: { $regex: search, $options: 'i' } },
        ];
      }
      
      const skip = (page - 1) * limit;
      const vendors = await VendorModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const total = await VendorModel.countDocuments(query);
      const totalPages = Math.ceil(total / limit);
      
      res.json({
        success: true,
        data: {
          vendors,
          totalPages,
          currentPage: parseInt(page),
          total,
        },
      });
    } catch (error) {
      console.error('Error fetching vendors:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create new vendor with file upload
  app.post('/api/vendors', upload.array('documents', 5), async (req, res) => {
    try {
      const vendorData = req.body;
      
      // Process uploaded documents
      const documents = [];
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          documents.push({
            filename: file.filename,
            originalName: file.originalname,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype,
            uploadedAt: new Date(),
          });
        });
      }
      
      // Create new vendor
      const vendor = new VendorModel({
        ...vendorData,
        documents,
        status: 'Active',
        createdAt: new Date(),
      });
      
      await vendor.save();
      
      res.json({
        success: true,
        message: 'Vendor created successfully',
        data: vendor,
      });
    } catch (error) {
      console.error('Error creating vendor:', error);
      
      // Clean up uploaded files if vendor creation fails
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          fs.unlink(file.path, (err) => {
            if (err) console.error('Error deleting file:', err);
          });
        });
      }
      
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Update vendor
  app.put('/api/vendors/:id', upload.array('documents', 5), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const vendor = await VendorModel.findById(id);
      if (!vendor) {
        return res.status(404).json({ success: false, error: 'Vendor not found' });
      }
      
      // Process new uploaded documents
      if (req.files && req.files.length > 0) {
        const newDocuments = req.files.map((file) => ({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype,
          uploadedAt: new Date(),
        }));
        updates.documents = [...(vendor.documents || []), ...newDocuments];
      }
      
      Object.assign(vendor, updates);
      vendor.updatedAt = new Date();
      await vendor.save();
      
      res.json({
        success: true,
        message: 'Vendor updated successfully',
        data: vendor,
      });
    } catch (error) {
      console.error('Error updating vendor:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Delete vendor
  app.delete('/api/vendors/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const vendor = await VendorModel.findById(id);
      if (!vendor) {
        return res.status(404).json({ success: false, error: 'Vendor not found' });
      }
      
      // Delete associated documents from filesystem
      if (vendor.documents && vendor.documents.length > 0) {
        vendor.documents.forEach((doc) => {
          fs.unlink(doc.path, (err) => {
            if (err) console.error('Error deleting file:', err);
          });
        });
      }
      
      await VendorModel.findByIdAndDelete(id);
      
      res.json({
        success: true,
        message: 'Vendor deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting vendor:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =====================================================
  // SYSTEM ADMIN ENDPOINTS
  // =====================================================

  // Get system statistics
  app.get('/api/admin/system-stats', async (req, res) => {
    try {
      const [users, employees] = await Promise.all([
        UserModel.countDocuments(),
        EmployeeModel.countDocuments()
      ]);

      // Calculate system load based on recent activity
      const recentActivity = await AuditLogModel.countDocuments({
        timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
      });
      
      // System load as percentage (scale based on activity)
      const systemLoad = Math.min(Math.round((recentActivity / 100) * 100), 100);
      
      // Calculate uptime (mock for now - would need actual server start time)
      const uptime = 99.9;

      res.json({
        success: true,
        data: {
          systemLoad,
          loadTrend: systemLoad > 80 ? 'high' : systemLoad > 50 ? 'moderate' : 'low',
          uptime,
          totalUsers: users + employees,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get service status
  app.get('/api/admin/service-status', async (req, res) => {
    try {
      const services = [];

      // Check database connection
      const dbStatus = mongoose.connection.readyState === 1 ? 'online' : 'offline';
      services.push({
        id: 1,
        name: 'Database Cluster',
        status: dbStatus,
        uptime: dbStatus === 'online' ? '99.9%' : '0%',
        color: dbStatus === 'online' ? 'green' : 'red'
      });

      // Check API (always online if we're responding)
      services.push({
        id: 2,
        name: 'API Gateway',
        status: 'online',
        uptime: '99.8%',
        color: 'green'
      });

      // Check file storage (async)
      const uploadsDir = path.join(__dirname, 'uploads');
      let storageStatus = 'offline';
      try {
        await fs.promises.access(uploadsDir);
        storageStatus = 'online';
      } catch (err) {
        console.log('Storage directory not accessible:', err.message);
      }
      services.push({
        id: 3,
        name: 'Storage Service',
        status: storageStatus,
        uptime: storageStatus === 'online' ? '100%' : '0%',
        color: storageStatus === 'online' ? 'green' : 'red'
      });

      // Email service status (check if email config exists)
      const emailStatus = process.env.EMAIL_USER ? 'online' : 'offline';
      services.push({
        id: 4,
        name: 'Email Service',
        status: emailStatus,
        uptime: emailStatus === 'online' ? '99.5%' : '0%',
        color: emailStatus === 'online' ? 'green' : 'orange'
      });

      res.json({
        success: true,
        data: services
      });
    } catch (error) {
      console.error('Error fetching service status:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  const port = process.env.PORT;
  if (!port) {
    console.error('PORT not set in .env file');
    process.exit(1);
  }
  const server = app.listen(port, () => {
    console.log(`Steps backend listening on http://localhost:${port}`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    server.close(async () => {
      console.log('HTTP server closed');
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
      } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  // Don't exit immediately, log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  // Don't exit immediately, log and continue
});

// Monitor memory usage
setInterval(() => {
  const used = process.memoryUsage();
  const mb = (bytes) => Math.round(bytes / 1024 / 1024);
  if (mb(used.heapUsed) > 500) { // Alert if heap exceeds 500MB
    console.warn(`⚠️ High memory usage: ${mb(used.heapUsed)}MB heap / ${mb(used.rss)}MB RSS`);
  }
}, 60000); // Check every minute

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
