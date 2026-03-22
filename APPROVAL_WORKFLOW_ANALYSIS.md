# StepsProject Approval Workflow Analysis

## Executive Summary

The StepsProject uses a **multi-level, rule-based approval system** that applies consistently across multiple modules (HR, Procurement, Finance). Approvals are automatically triggered when requests are submitted, configured through approval rules, and routed to the appropriate approvers based on request attributes and organizational hierarchy.

---

## 1. How Approvals Are Triggered

### Request Submission Flow

When a request is created (POST endpoint), the system:

1. **Receives request data** from frontend components
2. **Finds matching ApprovalRule** via `buildApprovalChain()` helper
3. **Builds approval chain** with role-based approvers
4. **Stores chain in request** as `approvalChain` array
5. **Sets initial status** and marks as pending first approver

### Request Types with Approval Support

| Module | Model | Status Enum | API Endpoint |
|--------|-------|-------------|--------------|
| HR | LeaveRequest | `pending_manager`, `approved_manager`, `rejected_manager`, `pending_hr`, `approved`, `rejected` | `/api/approval/leave-requests` |
| HR | TravelRequest | `pending_manager`, `approved_manager`, `rejected_manager`, `pending_booking`, `booked`, `completed`, `cancelled` | `/api/approval/travel-requests` |
| Finance | AdvanceRequest | `pending`, `approved`, `rejected` | `/api/advance-requests` |
| Finance | RefundRequest | `pending`, `approved`, `rejected` | `/api/refund-requests` |
| Procurement | MaterialRequest | `draft`, `pending`, `approved`, `rejected`, `fulfilled` | `/api/material-requests` |
| Procurement | PurchaseOrder | `draft`, `pending`, `issued`, `approved`, `payment_pending`, `partly_paid`, `paid`, `received`, `closed`, `cancelled` | `/api/purchase-orders` |

### Example: Material Request Approval Trigger

**File**: [server/routes/procurement.routes.js](server/routes/procurement.routes.js#L1-L100)

```javascript
// POST /api/material-requests
// When request is created:
const payload = {
  ...req.body,
  requestId,
  requestType: normalizeRequestType(req.body?.requestType),
  date: req.body?.date || now.toISOString().split('T')[0],
};

const newRequest = new MaterialRequest(payload);
// ... activities/comments added ...
const savedRequest = await newRequest.save();
// Approval chain is built by frontend/backend integration
```

**Key Location**: Frontend submits to POST endpoint, backend can trigger rule-based approvals via helper functions.

---

## 2. How Approvers See Pending Approvals

### UI Components

#### **Approval.jsx** - Approver Dashboard
**File**: [src/components/modules/Approval.jsx](src/components/modules/Approval.jsx)

- **Purpose**: Main component for approvers to view and action pending requests
- **Data Display**: Shows pending advance requests, refund requests, retirement breakdowns
- **Features**:
  - Filters by request type
  - Displays approval status and current level
  - Action buttons to approve/reject with comments
  - Email notifications sent to approver

#### **ApprovalSettings.jsx** - Admin Configuration
**File**: [src/components/modules/ApprovalSettings.jsx](src/components/modules/ApprovalSettings.jsx)

- **Purpose**: Admin interface to define approval rules and workflows
- **Features**:
  - Create/Edit/Delete approval rules
  - Configure multi-level approval chains
  - Set conditions for rule matching (amount-based, duration-based, etc.)
  - Toggle rules active/inactive

### Data Fetching for Approvers

```javascript
// Approval.jsx - fetches pending requests
const [advanceRequests, setAdvanceRequests] = useState([]);
const [refundRequests, setRefundRequests] = useState([]);

// Current user's pending approvals (requests waiting for their approval)
const currentUserId = user?.id || user?._id;

// API calls filter by:
// - Current user's role or ID matches pending approvalChain[currentLevel].approverId
// - Request status indicates pending approval
```

### Notification System

**File**: [server/models/Notification.js](server/models/Notification.js)

```javascript
const NotificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'success', 'warning', 'error'] },
  category: { type: String, default: 'general' },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: { type: mongoose.Schema.Types.Mixed },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dismissedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});
```

- Notifications are created and sent to `targetUser` (the approver)
- Email notifications sent via `/api/send-approval-email` or `/api/send-leave-approval-email`
- Stored in `Notification` collection for audit trail

---

## 3. Approval Routing Logic & Status Transitions

### Approval Rule Model

**File**: [server/models/ApprovalRule.js](server/models/ApprovalRule.js)

```javascript
const approvalRuleSchema = {
  moduleType: {
    enum: [
      "Advance Requests",
      "Leave Requests",
      "Refund Requests",
      "Purchase Orders",
      "Material Requests"
    ]
  },
  condition: [String], // ["All Requests"] or ["Amount > 1000"], ["Duration > 5 Days"], etc.
  levels: [{
    level: Number,
    approverRole: String // "Manager", "Direct Manager", "Department Head", "Finance Manager", "HR Director", "Admin"
  }],
  status: { enum: ["Active", "Inactive"] }
};
```

### Approval Helper: Rule Matching & Chain Building

**File**: [server/utils/approvalRuleHelper.js](server/utils/approvalRuleHelper.js)

#### Step 1: Find Matching Rule
```javascript
async function findMatchingApprovalRule(moduleType, requestData) {
  // 1. Find all active rules for module type
  // 2. Evaluate conditions against request data
  // 3. Return first matching rule
}

// Condition Evaluation:
// - "All Requests" → always matches
// - "Amount > 1000" → requestData.amount > 1000
// - "Amount > 5000" → requestData.amount > 5000
// - "Duration > 2 Days" → requestData.duration > 2
// - "Duration > 5 Days" → requestData.duration > 5
// - "Out of Policy" → requestData.outOfPolicy === true
```

#### Step 2: Build Approval Chain
```javascript
async function buildApprovalChain(moduleType, requestData) {
  const rule = await findMatchingApprovalRule(moduleType, requestData);
  
  if (!rule) return { rule: null, approvalChain: [], usesRuleBasedApproval: false };
  
  // For each level in rule, resolve approver by role
  const approvalChain = [];
  for (const level of rule.levels) {
    const approver = await getApproverByRole(level.approverRole, requestData);
    
    approvalChain.push({
      level: level.level,
      approverRole: level.approverRole,
      approverId: approver.id,
      approverName: approver.name,
      approverEmail: approver.email,
      status: level.level === 1 ? 'pending' : 'awaiting', // First level pending
      approvedAt: null,
      comments: ''
    });
  }
  
  return { rule, approvalChain, usesRuleBasedApproval: true };
}
```

#### Step 3: Resolve Approver by Role

The `getApproverByRole()` function resolves roles to actual users:

| Approver Role | Resolution Logic | Source |
|---------------|-----------------|--------|
| **Manager** / **Direct Manager** | From `Employee.managerId` of request author | Employee model |
| **Department Head** | From `Department.headEmployeeId` or search by role | Department model |
| **Finance Manager** | User with `role: 'Finance Manager'` or department: 'finance' | User model |
| **HR Director** | User with `role: 'HR Director'` or department: 'hr' | User model |
| **Admin** | User with `role: 'Admin'` | User model |

### Approval Chain Status Transitions

Each approval chain item has status progression:

```
Initial State (when created):
├─ Level 1: "pending"     ← Awaits approval from first approver
├─ Level 2: "awaiting"    ← Waiting for previous level to complete
├─ Level 3: "awaiting"    ← Waiting for previous levels
└─ Level N: "awaiting"

After Level 1 Approval:
├─ Level 1: "approved"    ✓ (with timestamp)
├─ Level 2: "pending"     ← Now requires this approver's action
├─ Level 3: "awaiting"
└─ Level N: "awaiting"

After All Levels Approved:
├─ Level 1: "approved"    ✓
├─ Level 2: "approved"    ✓
├─ Level 3: "approved"    ✓
└─ Level N: "approved"    ✓
Request Status: "approved"

Rejection Path (if any level rejects):
├─ Current Level: "rejected"
└─ Request Status: "rejected"
└─ Stops further progression
```

### Approval Action Endpoints

**Material Request Approval**:
```
POST /api/material-requests/:id/approve
Request body: { vendor?, comment? }
Response: { success, message, request, type: "approval_progress" }
```

**Processing Logic** ([server/routes/procurement.routes.js](server/routes/procurement.routes.js#L130-L180)):

```javascript
// Multi-level approval progression
if (Array.isArray(request.approvalChain) && request.approvalChain.length > 0) {
  // Find current pending step
  let currentIdx = request.approvalChain.findIndex((s) => s.status === 'pending');
  
  // Approve current step
  const currentStep = request.approvalChain[currentIdx];
  currentStep.status = 'approved';
  currentStep.approvedAt = new Date();
  currentStep.comments = req.body?.comment;
  
  // Find next pending step
  const nextIdx = request.approvalChain.findIndex(
    (s, idx) => idx > currentIdx && (s.status === 'awaiting' || s.status === 'pending')
  );
  
  if (nextIdx >= 0) {
    // Move to next approver
    const nextStep = request.approvalChain[nextIdx];
    nextStep.status = 'pending';
    request.currentApprovalLevel = nextStep.level;
    request.approver = nextStep.approverName;
    request.status = 'pending';
    
    // Notify next approver...
  } else {
    // All levels approved, mark as approved
    request.status = 'approved';
    // Trigger fulfillment logic (if Internal Transfer, auto-issue inventory, etc.)
  }
}
```

---

## 4. Module-to-Module Flow

### Cross-Module Request Routing

The approval system routes requests **through modules** based on module type and request evolution. Requests may trigger secondary actions upon approval.

#### Example A: Material Request → Purchase Order

**Flow**:
```
1. User submits Material Request (Procurement)
   ├─ Routes through approval chain (Manager → Dept Head → Finance)
   └─ Stored in: MaterialRequest.approvalChain

2. Upon Final Approval:
   ├─ For "Internal Transfer" type:
   │  ├─ Auto-deduct inventory from source location
   │  ├─ Auto-create StockTransfer record
   │  └─ Auto-generate waybill
   │
   └─ For "Purchase Request" type:
      ├─ Frontend may convert to PurchaseOrder
      ├─ New PO starts with status: "draft"
      └─ PO may have its own approval chain

3. Session Storage Link:
   └─ materialRequestsOpenRequestId = request.id
      (used for cross-module deep linking)
```

**Files Involved**:
- [server/routes/procurement.routes.js](server/routes/procurement.routes.js) - Material Request approval
- [server/models/MaterialRequest.js](server/models/MaterialRequest.js) - schema
- [server/models/StockTransfer.js](server/models/StockTransfer.js) - auto-created upon approval
- [server/utils/stockTransferHelpers.js](server/utils/stockTransferHelpers.js) - inventory updates

#### Example B: Leave Request → HR Processing

**Flow**:
```
1. Employee submits Leave Request (HR)
   ├─ Routes to: Direct Manager (first approver)
   └─ Status: "pending_manager"

2. Manager Approves:
   ├─ Move to next level (if configured)
   ├─ Or → HR Director approval
   ├─ Or → Auto-approved if single-level rule
   └─ Update LeaveAllocation.annualLeaveUsed, sickLeaveUsed, etc.

3. Final Approval:
   ├─ Leave is "approved"
   ├─ LeaveAllocation decremented
   └─ Calendar/analytics updated

4. Rejection Path:
   └─ Stays in queue for employee resubmission
```

**Files Involved**:
- [src/components/modules/Approval.jsx](src/components/modules/Approval.jsx) - leaves shown here
- [server/models/LeaveRequest.js](server/models/LeaveRequest.js)
- [server/models/LeaveAllocation.js](server/models/LeaveAllocation.js)
- [server/routes/hr.routes.js](server/routes/hr.routes.js)

#### Example C: Advance Request → Payroll Integration

**Flow**:
```
1. Employee submits Advance Request (Finance)
   ├─ Routes through approval chain
   └─ May require: Manager → Dept Head → Finance Manager

2. Upon Approval:
   ├─ AdvanceRequest.status = "approved"
   ├─ Advance is deducted from next payroll
   └─ If hasRetirement = true, processes retirement breakdown

3. Retirement Processing:
   ├─ RetirementBreakdown records created
   ├─ Stored in RetirementBreakdown model
   └─ Payroll references these for calculation
```

**Files Involved**:
- [server/models/AdvanceRequest.js](server/models/AdvanceRequest.js)
- [server/models/RetirementBreakdown.js](server/models/RetirementBreakdown.js)
- [server/models/PayrollRun.js](server/models/PayrollRun.js)

### Activity Log & Audit Trail

All request models include an `activities` array to track:
- **Request creation**
- **Status changes**
- **Each approval action** (by whom, at what level, with comments)
- **Rejections** (reason/comments)
- **Comments** from requestor and approvers

```javascript
request.activities.push({
  type: 'approval' | 'status_change' | 'rejection' | 'comment',
  author: 'Name of actor',
  authorId: userId,
  text: 'Description of action',
  timestamp: new Date(),
  approvalLevel: currentStep.level, // For approvals
  approverRole: currentStep.approverRole,
  pendingApprover: nextStep.approverName, // For transitions
});
```

---

## 5. Data Model Relationships

### Core Approval Data Model Relationship Diagram

```
┌─────────────────────────────────────────────────────┐
│                  ApprovalRule                       │
│  ────────────────────────────────────────────────   │
│  • moduleType (enum)                                │
│  • condition[] (amount, duration, policy checks)    │
│  • levels[] ← Multi-level config                    │
│    ├─ level (1, 2, 3...)                            │
│    └─ approverRole (e.g., "Manager")                │
│  • status (Active/Inactive)                         │
│  • createdBy → User                                 │
└──────────────┬──────────────────────────────────────┘
               │
               │ Matches & Creates
               ↓
┌──────────────────────────────────────────────────────────┐
│             Request Models (One per module)              │
│  ──────────────────────────────────────────────────────  │
│  • LeaveRequest / TravelRequest (HR)                     │
│  • AdvanceRequest / RefundRequest (Finance)              │
│  • MaterialRequest / PurchaseOrder (Procurement)         │
│                                                          │
│  Common Approval Fields:                                 │
│  ├─ usesRuleBasedApproval: Boolean                       │
│  ├─ approvalRuleId → ApprovalRule._id                    │
│  ├─ currentApprovalLevel: Number                         │
│  ├─ approvalChain: [{                                    │
│  │   level, approverRole, approverId, approverName,      │
│  │   approverEmail, status, approvedAt, comments         │
│  │ }]                                                    │
│  ├─ status: String (request-specific enum)              │
│  ├─ activities: [] (audit trail)                        │
│  └─ comments: [] (discussion trail)                     │
│                                                          │
│  Resolved Approvers:                                     │
│  Each approvalChain[].approverId → User._id             │
│           └─ Resolved via Employee.managerId (manager)   │
│           └─ Resolved via Department head (dept head)    │
│           └─ Resolved via role search (Finance/HR/Admin) │
└──────────────────────────────────────────────────────────┘
```

### Entity Relationships Used in Approval

| Entity | Role in Approval | Key Fields |
|--------|-----------------|------------|
| **User** | Approver identity | _id, email, role, department, fullName |
| **Employee** | Requester & approver resolution | _id, employeeId, managerId, department, role, userRef |
| **Department** | Approver resolution (dept heads) | _id, name, headEmployeeId |
| **Manager Assignment** | Core approval path | Employee.managerId → Employee (manager) |
| **Notification** | Status communication | targetUser, title, metadata (request details) |
| **AuditLog** | Compliance & tracking | action, actor, status, timestamp |

### Example Approval Chain Resolution

```javascript
// Request submitted by: Employee (ID: EMP123, managerId: EMP456)
// Matching ApprovalRule: "Leave Requests" with levels:
//   Level 1: approverRole = "Manager"
//   Level 2: approverRole = "HR Director"

// Building approval chain:
{
  approvalChain: [
    {
      level: 1,
      approverRole: "Manager",
      approverId: "USER_EMP456",        ← Resolved from Employee.managerId
      approverName: "John Manager",
      approverEmail: "john@company.com",
      status: "pending"
    },
    {
      level: 2,
      approverRole: "HR Director",
      approverId: "USER_HRDIRECTOR",   ← Resolved from User.role = "HR Director"
      approverName: "Sarah HR",
      approverEmail: "sarah@company.com",
      status: "awaiting"
    }
  ]
}
```

---

## 6. Current Routing Patterns

### Request Type → Module → Approval Path Mapping

```
HUMAN RESOURCES
├─ Leave Requests
│  ├─ Rules: By amount or duration
│  ├─ Approvers: Manager → HR Director (typical)
│  └─ Post-approval: LeaveAllocation updates
│
└─ Travel Requests
   ├─ Rules: By budget/duration
   ├─ Approvers: Direct Manager → HR
   └─ Post-approval: Booking status update

FINANCE
├─ Advance Requests
│  ├─ Rules: By amount
│  ├─ Approvers: Manager → Finance Manager
│  └─ Post-approval: Payroll deduction setup
│
└─ Refund Requests
   ├─ Rules: By amount/category
   ├─ Approvers: Manager → Finance Manager
   └─ Post-approval: Payment processing

PROCUREMENT
├─ Material Requests
│  ├─ Rules: By amount/type
│  ├─ Approvers: Dept Head → Finance Manager → Admin
│  └─ Post-approval: 
│     ├─ Internal Transfer → Auto-generate StockTransfer
│     └─ Purchase Request → Can link to PurchaseOrder
│
└─ Purchase Orders
   ├─ Rules: By amount
   ├─ Approvers: Manager → Finance Manager → Admin
   └─ Post-approval: Issued/matched to vendor
```

### UI Navigation for Approvals

```
Main Approval Dashboard (Approval.jsx)
├─ Advance Requests Section
│  └─ [View] → Shows advance request details + approval action buttons
├─ Refund Requests Section
│  └─ [View] → Shows refund details + approval action buttons
├─ Travel Requests Section (if applicable)
│  └─ [View] → Shows travel details + approval action buttons
└─ Retirement Management
   └─ [Manage] → Process retirement breakdowns

Approval Settings (Admin only - ApprovalSettings.jsx)
├─ [Create Rule] → Select module + conditions + approval levels
├─ [Edit Rule] → Modify existing rule
└─ [Delete Rule] → Remove rule, toggle Active/Inactive
```

---

## 7. Notification Mechanisms

### Approval Notification Flow

#### When Request is Submitted:
```
1. Frontend calls POST /api/{module}/{request-type}
2. Backend creates request with approvalChain
3. Email notification sent to Level 1 approver:
   └─ /api/send-{type}-approval-email (e.g., /api/send-leave-approval-email)
4. Notification record created in Notification collection
5. Approver sees badge on "Approvals" dashboard
```

#### When Approver Actions Request:
```
1. Approver clicks [Approve] or [Reject]
2. Frontend calls POST /api/{module}/{request-id}/approve|reject
3. Backend updates approvalChain[current].status
4. If approved & more levels exist:
   ├─ Email sent to next approver
   └─ Activity log records transition
5. If approved & final level:
   ├─ Request marked "approved"
   ├─ Trigger post-approval actions
   └─ Notify original requestor
```

### Email Service Integration

**File**: [server/utils/emailService.js](server/utils/emailService.js)

```javascript
// Example: Leave approval email
/api/send-leave-approval-email
{
  to: approverEmail,
  employeeName: "John Employee",
  leaveType: "Annual",
  fromDate: "2026-04-01",
  toDate: "2026-04-05",
  days: 5,
  reason: "Vacation",
  managerName: "Jane Manager",
  approvalStage: "manager" // or "hr"
}
```

### In-App Notification System

**File**: [server/models/Notification.js](server/models/Notification.js)

- Notifications appear in `NotificationCenter` component
- Support for marking read/dismissed
- Metadata includes request details for quick actions
- Can be filtered by category, type, status

---

## Summary: Approval Workflow at a Glance

| Step | Component/File | Action |
|------|---------------|--------|
| 1. **Trigger** | Frontend Form | User submits request (leave, advance, material, etc.) |
| 2. **Receive** | Backend Route | POST endpoint receives request data |
| 3. **Rule Match** | approvalRuleHelper.js | `findMatchingApprovalRule()` finds applicable rule |
| 4. **Build Chain** | approvalRuleHelper.js | `buildApprovalChain()` resolves approvers by role |
| 5. **Store** | Database | Request saved with `approvalChain` array |
| 6. **Notify** | emailService.js | Approval email sent to Level 1 approver |
| 7. **Display** | Approval.jsx | Approver sees pending request in dashboard |
| 8. **Action** | Approval.jsx | Approver clicks [Approve] or [Reject] |
| 9. **Update** | Backend Route | `/approve` or `/reject` endpoint updates request |
| 10. **Progress** | approvalRuleHelper logic | Moves to next level or marks approved |
| 11. **Execute** | Request-specific handler | Post-approval actions (inventory, payroll, etc.) |
| 12. **Complete** | Database | Request marked "approved", activities logged |

---

## Implementation Notes

### Key Supporting Files:

1. **Approval Rule Configuration**
   - [server/routes/approvalRule.routes.js](server/routes/approvalRule.routes.js) - CRUD for rules
   - [server/models/ApprovalRule.js](server/models/ApprovalRule.js) - schema

2. **Approval Helper Functions**
   - [server/utils/approvalRuleHelper.js](server/utils/approvalRuleHelper.js) - matching, chain building, role resolution

3. **Request Models (all use same approvalChain pattern)**
   - [server/models/LeaveRequest.js](server/models/LeaveRequest.js)
   - [server/models/TravelRequest.js](server/models/TravelRequest.js)
   - [server/models/AdvanceRequest.js](server/models/AdvanceRequest.js)
   - [server/models/RefundRequest.js](server/models/RefundRequest.js)
   - [server/models/MaterialRequest.js](server/models/MaterialRequest.js)
   - [server/models/PurchaseOrder.js](server/models/PurchaseOrder.js)

4. **Approval Action Routes**
   - [server/routes/procurement.routes.js](server/routes/procurement.routes.js) - `/approve`, `/reject` for Material Requests
   - [server/routes/hr.routes.js](server/routes/hr.routes.js) - placeholder for leave approvals (extend as needed)

5. **UI Components**
   - [src/components/modules/Approval.jsx](src/components/modules/Approval.jsx) - approver dashboard
   - [src/components/modules/ApprovalSettings.jsx](src/components/modules/ApprovalSettings.jsx) - admin rule configuration

### Testing Approval Workflow:

1. Create an ApprovalRule via ApprovalSettings UI
2. Submit a request that matches the rule
3. Check notification in Notification Center
4. Approve/Reject in Approval dashboard
5. Verify activity log and status transitions
6. Check post-approval actions (inventory, payroll, etc.)

---

**Last Updated**: March 22, 2026
**Status**: Active multi-level approval system in production
