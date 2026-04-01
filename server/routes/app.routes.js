const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Employee = require('../models/Employee');
const Vendor = require('../models/Vendor');
const InventoryItem = require('../models/InventoryItem');
const MaterialRequest = require('../models/MaterialRequest');
const PurchaseOrder = require('../models/PurchaseOrder');
const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');
const SystemSettings = require('../models/SystemSettings');
const {
  appApiKeyMiddleware,
  touchAppApiKeyUsage,
} = require('../middleware/appApiKey');

const parseLimit = (value, fallback = 5) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, 20);
};

const parseSections = (value) => {
  const raw = String(value || '').trim();
  if (!raw) {
    return ['users', 'employees', 'vendors', 'inventory', 'materials', 'purchaseOrders', 'documents', 'auditLogs'];
  }

  return [...new Set(raw.split(',').map((section) => section.trim()).filter(Boolean))];
};

const buildSection = async ({ model, countQuery = {}, findQuery = {}, select, sort, limit }) => {
  const [count, records] = await Promise.all([
    model.countDocuments(countQuery),
    model.find(findQuery)
      .select(select)
      .sort(sort)
      .limit(limit)
      .lean(),
  ]);

  return { count, records };
};

router.get('/data', appApiKeyMiddleware, async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 5);
    const sections = parseSections(req.query.sections);
    const payload = {
      requestedAt: new Date().toISOString(),
      apiKey: {
        generatedAt: req.appApiKeyContext?.generatedAt || null,
        lastUsedAt: req.appApiKeyContext?.lastUsedAt || null,
      },
      sections: {},
    };

    if (sections.includes('users')) {
      payload.sections.users = await buildSection({
        model: User,
        select: 'firstName lastName fullName email role status department jobTitle employeeRef createdAt updatedAt',
        sort: { createdAt: -1 },
        limit,
      });
    }

    if (sections.includes('employees')) {
      payload.sections.employees = await buildSection({
        model: Employee,
        select: 'firstName lastName email department role status userRef createdAt updatedAt',
        sort: { createdAt: -1 },
        limit,
      });
    }

    if (sections.includes('vendors')) {
      payload.sections.vendors = await buildSection({
        model: Vendor,
        select: 'companyName vendorId contactPerson phone email status serviceType paymentTerms createdAt updatedAt',
        sort: { updatedAt: -1 },
        limit,
      });
    }

    if (sections.includes('inventory')) {
      payload.sections.inventory = await buildSection({
        model: InventoryItem,
        countQuery: { isDeleted: false },
        findQuery: { isDeleted: false },
        select: 'itemId name category quantity location reorderPoint unit unitPrice lastUpdated createdAt updatedAt',
        sort: { lastUpdated: -1 },
        limit,
      });
    }

    if (sections.includes('materials')) {
      payload.sections.materials = await buildSection({
        model: MaterialRequest,
        select: 'requestId requestTitle requestType department requestedBy status totalAmountNgn totalAmount currency createdAt updatedAt',
        sort: { createdAt: -1 },
        limit,
      });
    }

    if (sections.includes('purchaseOrders')) {
      payload.sections.purchaseOrders = await buildSection({
        model: PurchaseOrder,
        select: 'poNumber vendor status totalAmount totalAmountNgn currency orderDate createdAt updatedAt',
        sort: { createdAt: -1 },
        limit,
      });
    }

    if (sections.includes('documents')) {
      payload.sections.documents = await buildSection({
        model: Document,
        select: 'name status uploadedBy uploadedByName dueDate completedAt createdAt updatedAt',
        sort: { createdAt: -1 },
        limit,
      });
    }

    if (sections.includes('auditLogs')) {
      payload.sections.auditLogs = await buildSection({
        model: AuditLog,
        select: 'timestamp actor action actionColor description status',
        sort: { timestamp: -1 },
        limit,
      });
    }

    const settings = await SystemSettings.findOne()
      .select('appApiKeyGeneratedAt appApiKeyLastUsedAt')
      .lean();

    payload.availableSections = Object.keys(payload.sections);
    payload.meta = {
      generatedAt: settings?.appApiKeyGeneratedAt || null,
      lastUsedAt: settings?.appApiKeyLastUsedAt || null,
      limit,
    };

    await touchAppApiKeyUsage(req.appApiKeyContext?.settingsId);

    res.json({ success: true, data: payload });
  } catch (error) {
    console.error('Error fetching application data through API key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application data',
    });
  }
});

module.exports = router;