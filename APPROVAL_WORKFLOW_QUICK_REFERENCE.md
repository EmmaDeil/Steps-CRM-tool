# Approval Workflow - Developer Quick Reference

## Essential Files Map

### Backend - Approval Rules & Routing
```
server/
├── models/
│   ├── ApprovalRule.js          # Schema: moduleType, conditions, approval levels
│   └── [Request Models] ←─────── All store approvalChain[]
│       ├── LeaveRequest.js
│       ├── TravelRequest.js
│       ├── AdvanceRequest.js
│       ├── RefundRequest.js
│       ├── MaterialRequest.js
│       └── PurchaseOrder.js
│
├── routes/
│   ├── approvalRule.routes.js   # CRUD endpoints for approval rules
│   ├── hr.routes.js              # Leave/Travel request endpoints
│   ├── procurement.routes.js      # Material/PO approval endpoints
│   └── [other modules]
│
└── utils/
    ├── approvalRuleHelper.js     # KEY FILE: findMatchingApprovalRule, buildApprovalChain, getApproverByRole
    └── emailService.js           # Send approval notifications
```

### Frontend - UI Components
```
src/components/modules/
├── Approval.jsx                  # Approver dashboard (pending requests view)
├── ApprovalSettings.jsx          # Admin: Create/manage approval rules
└── [Module Components]           # Submit requests (form submissions)
    ├── HRM.jsx                   # Leave/Travel forms
    ├── Finance.jsx               # Advance/Refund forms
    └── MaterialRequests.jsx       # Material request forms
```

---

## Quick Implementation Guide

### 1. To Add Approval to a New Request Type

#### Step 1: Update ApprovalRule Model (if needed)
Add new module to enum in [server/models/ApprovalRule.js](server/models/ApprovalRule.js):
```javascript
moduleType: {
  type: String,
  enum: [
    "Advance Requests",
    "Leave Requests",
    "Refund Requests",
    "Purchase Orders",
    "Material Requests",
    "YOUR_NEW_REQUEST_TYPE"  // ← Add here
  ]
}
```

#### Step 2: Add Approval Fields to Request Model
Update your request model schema to include:
```javascript
// Multi-level approval fields
usesRuleBasedApproval: { type: Boolean, default: false },
approvalRuleId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApprovalRule' },
currentApprovalLevel: { type: Number, default: 1 },
approvalChain: [{
  level: Number,
  approverRole: String,
  approverId: String,
  approverName: String,
  approverEmail: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'awaiting'] },
  approvedAt: Date,
  comments: String
}],
activities: [{
  type: String,           // 'approval', 'status_change', 'rejection', 'comment'
  author: String,
  authorId: String,
  text: String,
  timestamp: Date,
  approvalLevel: Number   // For approvals/transitions
}]
```

#### Step 3: Create POST Endpoint for Request Creation
```javascript
// POST /api/your-requests
router.post('/your-requests', async (req, res) => {
  try {
    const payload = {
      ...req.body,
      // populate required fields
    };

    const newRequest = new YourRequestModel(payload);

    // Log creation activity
    newRequest.activities = newRequest.activities || [];
    newRequest.activities.push({
      type: 'created',
      author: req.user?.fullName || 'Unknown',
      text: 'Request created',
      timestamp: new Date()
    });

    // **This is where approval chain would be built if needed**
    // If you want automatic approval rule matching:
    // const { approvalChain, usesRuleBasedApproval } = await buildApprovalChain(
    //   'YOUR_MODULE_TYPE',
    //   { amount: payload.amount, ... }
    // );
    // newRequest.approvalChain = approvalChain;
    // newRequest.usesRuleBasedApproval = usesRuleBasedApproval;

    const savedRequest = await newRequest.save();
    res.status(201).json(savedRequest);
  } catch (err) {
    res.status(400).json({ message: 'Error creating request', error: err.message });
  }
});
```

#### Step 4: Create Approval Action Endpoint
```javascript
// POST /api/your-requests/:id/approve
router.post('/your-requests/:id/approve', async (req, res) => {
  try {
    const request = await YourRequestModel.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });

    if (!Array.isArray(request.approvalChain)) {
      return res.status(400).json({ error: 'No approval chain' });
    }

    // Find current pending step
    let currentIdx = request.approvalChain.findIndex(s => s.status === 'pending');
    if (currentIdx < 0) {
      return res.status(400).json({ error: 'No pending approval' });
    }

    // Approve current step
    const current = request.approvalChain[currentIdx];
    current.status = 'approved';
    current.approvedAt = new Date();
    current.comments = req.body?.comment || '';

    request.activities.push({
      type: 'approval',
      author: req.user?.fullName || 'Approver',
      text: `Approved by ${req.user?.fullName} at level ${current.level}`,
      timestamp: new Date(),
      approvalLevel: current.level
    });

    // Find next pending step
    const nextIdx = request.approvalChain.findIndex(
      (s, idx) => idx > currentIdx && (s.status === 'awaiting' || s.status === 'pending')
    );

    if (nextIdx >= 0) {
      // Move to next approver
      const next = request.approvalChain[nextIdx];
      next.status = 'pending';
      request.currentApprovalLevel = next.level;
      request.status = 'pending'; // or module-specific pending status

      request.activities.push({
        type: 'status_change',
        author: 'System',
        text: `Moved to Level ${next.level} - awaiting ${next.approverName}`,
        timestamp: new Date(),
        approvalLevel: next.level
      });

      // TODO: Send email to next approver
      // await sendApprovalEmail(next.approverEmail, request);

      await request.save();
      return res.json({
        success: true,
        message: 'Approval recorded. Moving to next level.',
        request
      });
    } else {
      // All levels approved
      request.status = 'approved';
      request.currentApprovalLevel = null;

      request.activities.push({
        type: 'status_change',
        author: 'System',
        text: 'All approval levels completed. Request approved.',
        timestamp: new Date()
      });

      // TODO: Trigger post-approval actions
      // e.g., inventory updates, payroll deductions, etc.

      await request.save();
      return res.json({
        success: true,
        message: 'Request fully approved',
        request
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error processing approval', message: err.message });
  }
});

// POST /api/your-requests/:id/reject
router.post('/your-requests/:id/reject', async (req, res) => {
  try {
    const request = await YourRequestModel.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });

    // Find current pending step
    let currentIdx = request.approvalChain.findIndex(s => s.status === 'pending');
    if (currentIdx >= 0) {
      const current = request.approvalChain[currentIdx];
      current.status = 'rejected';
      current.comments = req.body?.reason || '';
    }

    request.status = 'rejected';
    request.activities.push({
      type: 'rejection',
      author: req.user?.fullName || 'Approver',
      text: `Rejected: ${req.body?.reason || 'No reason provided'}`,
      timestamp: new Date()
    });

    // TODO: Send rejection notification to requestor
    // await sendRejectionEmail(request.requestorEmail, request);

    await request.save();
    res.json({ success: true, message: 'Request rejected', request });
  } catch (err) {
    res.status(500).json({ error: 'Error rejecting request' });
  }
});
```

---

### 2. To Update an Approval Rule (Admin UI)

Use existing endpoints in [server/routes/approvalRule.routes.js](server/routes/approvalRule.routes.js):

```javascript
// GET all rules
GET /api/approval-settings
Response: [{ _id, moduleType, condition, levels, status, ... }, ...]

// GET specific rule
GET /api/approval-settings/:ruleId
Response: { _id, moduleType, ... }

// CREATE new rule
POST /api/approval-settings
Body: {
  moduleType: "Leave Requests",
  condition: ["All Requests"],  // or ["Duration > 5 Days"]
  levels: [
    { level: 1, approverRole: "Manager" },
    { level: 2, approverRole: "HR Director" }
  ],
  status: "Active"
}
Response: { _id, ... }

// UPDATE rule
PUT /api/approval-settings/:ruleId
Body: { moduleType, condition, levels, status }
Response: { _id, ... }

// DELETE rule
DELETE /api/approval-settings/:ruleId
Response: { message: "Rule successfully deleted" }
```

---

### 3. Approver Resolution (Backend)

When building approval chain, the system resolves approver roles using [server/utils/approvalRuleHelper.js](server/utils/approvalRuleHelper.js):

```
Manager / Direct Manager
  ↓
  Employee.managerId → Employee → Employee.userRef → User
  Email: Employee.email

Department Head
  ↓
  Department(name).headEmployeeId → Employee → User
  Email: Employee.email

Finance Manager
  ↓
  User.role = "Finance Manager" OR User.department = "finance"

HR Director
  ↓
  User.role = "HR Director" OR User.department = "hr"

Admin
  ↓
  User.role = "Admin"
```

---

## Common API Patterns

### Submit Request with Auto Approval Chain
```javascript
// Frontend
const formData = {
  employeeName: "John Doe",
  amount: 15000,
  reason: "Equipment purchase",
  // ... other fields
};

const response = await apiService.post('/api/requests', formData);
// Backend auto-builds approvalChain based on matching rules

// Response includes:
{
  _id: "REQ_123",
  status: "pending",
  usesRuleBasedApproval: true,
  approvalChain: [
    { level: 1, approverId: "USER_456", status: "pending", ... },
    { level: 2, approverId: "USER_789", status: "awaiting", ... }
  ]
}
```

### Approve Request
```javascript
// Frontend
const approvalData = {
  comment: "Looks good, approved.",
};

const response = await apiService.post(
  `/api/requests/${requestId}/approve`,
  approvalData
);

// Response shows request moved to next level OR final approval
{
  success: true,
  message: "Approval recorded and moved to Level 2",
  request: { ... },
  type: "approval_progress"
}
```

### Check Pending Approvals (for Approver)
```javascript
// Frontend - in Approval.jsx
const currentUserId = auth.user._id;

// Fetch requests pending this user's approval
const pendingForMe = requests.filter(r => 
  r.approvalChain?.some(item => 
    item.approverId === currentUserId && 
    item.status === 'pending'
  )
);
```

---

## Status Enum Reference by Module

### Leave Request
```javascript
enum: [
  'pending_manager',      // Waiting for direct manager
  'approved_manager',     // Manager approved
  'rejected_manager',     // Manager rejected
  'pending_hr',           // Waiting for HR (if multi-level)
  'approved',             // Final approval
  'rejected'              // Final rejection
]
```

### Travel Request
```javascript
enum: [
  'pending_manager',      // Waiting for manager
  'approved_manager',     // Manager approved
  'rejected_manager',     // Manager rejected
  'pending_booking',      // Waiting for booking confirmation
  'booked',               // Travel booked
  'completed',            // Travel completed
  'cancelled'             // Cancelled
]
```

### Material Request
```javascript
enum: [
  'draft',                // Initial draft
  'pending',              // Awaiting approval
  'approved',             // Approved
  'rejected',             // Rejected
  'fulfilled'             // Inventory issued or PO created
]
```

### Advance Request / Refund Request
```javascript
enum: [
  'pending',              // Awaiting approval
  'approved',             // Approved
  'rejected'              // Rejected
]
```

### Purchase Order
```javascript
enum: [
  'draft',                // Initial draft
  'pending',              // Awaiting approval
  'issued',               // Sent to vendor
  'approved',             // Approved by vendor
  'payment_pending',      // Ready for payment
  'partly_paid',          // Partial payment made
  'paid',                 // Fully paid
  'received',             // Goods received
  'closed',               // Completed
  'cancelled'             // Cancelled
]
```

---

## Debugging Approval Issues

### Problem: Request not routing to approver
**Checklist:**
1. ✓ ApprovalRule exists for module type?
2. ✓ Rule is status "Active"?
3. ✓ Conditions match request data (amount, duration, etc.)?
4. ✓ Approver role can be resolved (Manager exists in org)?
5. ✓ Manager has user email configured?

**Debug:** 
```javascript
// server/utils/approvalRuleHelper.js
const rule = await findMatchingApprovalRule('Leave Requests', requestData);
console.log('Matched rule:', rule);

const chain = await buildApprovalChain('Leave Requests', requestData);
console.log('Built chain:', chain);
```

### Problem: Approver doesn't see request in Approval.jsx
**Checklist:**
1. ✓ Request.approvalChain[currentLevel].status === 'pending'?
2. ✓ approvalChain[currentLevel].approverId matches currentUser._id?
3. ✓ API endpoint filtering by approver ID correctly?

**Debug:**
```javascript
// Approval.jsx
const pendingForMe = requests.filter(r => {
  const pending = r.approvalChain?.find(item => item.status === 'pending');
  console.log('Approver check:', {
    requestId: r._id,
    pendingApproverId: pending?.approverId,
    currentUserId: currentUserId,
    match: pending?.approverId === currentUserId
  });
  return pending && pending.approverId === currentUserId;
});
```

### Problem: Approval email not sent
**Checklist:**
1. ✓ `emailService.js` called with correct approver email?
2. ✓ Email service credentials configured (SMTP/SendGrid)?
3. ✓ Email template exists for request type?
4. ✓ Check server logs for email errors?

**Debug:**
```javascript
// Check email helper
const { sendApprovalEmail } = require('../utils/emailService');
await sendApprovalEmail(approverEmail, requestData);
```

---

## Testing Approval Workflow

### Manual Test Steps
1. **Admin**: Create approval rule via ApprovalSettings UI
   - Module: "Leave Requests"
   - Conditions: "All Requests"
   - Levels: Manager → HR Director

2. **Employee**: Submit leave request via Approval.jsx form
   - Select dates, reason, etc.
   - Click [Submit]

3. **Manager**: Check Approval dashboard
   - Should see leave request pending approval
   - Click [Approve]

4. **HR Director**: Check Approval dashboard  
   - Should now see same request pending their approval
   - Click [Approve]

5. **Verify**: Check request status = "approved"
   - Check activities log shows 2 approval entries
   - Check LeaveAllocation updated

---

## Performance Considerations

### Indexing for Approval Queries
```javascript
// In request models, add indexes for fast approver lookup:
schema.index({ 'approvalChain.approverId': 1, 'approvalChain.status': 1 });
schema.index({ currentApprovalLevel: 1, status: 1 });
schema.index({ userId: 1, status: 1 });
```

### Notification Query Optimization
```javascript
// Get pending approvals for a user efficiently
Notification.find({
  targetUser: userId,
  readBy: { $nin: [userId] },  // Unread only
  expiresAt: { $gt: Date.now() || null }
})
.lean()
.limit(100);
```

---

## Related Documentation
- [APPROVAL_WORKFLOW_ANALYSIS.md](APPROVAL_WORKFLOW_ANALYSIS.md) - Detailed workflow documentation
- [APPROVAL_WORKFLOW_DIAGRAMS.md](APPROVAL_WORKFLOW_DIAGRAMS.md) - Visual flowcharts and data flows
- [server/utils/approvalRuleHelper.js](server/utils/approvalRuleHelper.js) - Source code reference
- [server/models/ApprovalRule.js](server/models/ApprovalRule.js) - Schema definition
