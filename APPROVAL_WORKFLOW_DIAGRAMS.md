# Approval Workflow - Visual Diagrams

## 1. Request Submission to Approval Execution Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  REQUESTOR SUBMITS REQUEST                                          │
│  (User fills form: Leave, Advance, Material, Purchase, Travel)      │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND POSTS TO API                                              │
│  POST /api/approval/leave-requests                                  │
│  POST /api/advance-requests                                         │
│  POST /api/material-requests                                        │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────────┐
│  BACKEND: FIND MATCHING RULE                                        │
│  findMatchingApprovalRule(moduleType, requestData)                  │
│  • Search ApprovalRule collection by moduleType                     │
│  • Evaluate conditions: amount, duration, policy, etc.              │
│  • Return first matching rule (or null)                             │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ├─── NO RULE FOUND ───────┐
                     │                          ↓
                     │              Request stored without approval
                     │              (direct approval or draft state)
                     │
                     └─── RULE FOUND ──────────┐
                                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│  BACKEND: BUILD APPROVAL CHAIN                                      │
│  buildApprovalChain(moduleType, requestData)                        │
│  For each level in ApprovalRule.levels:                             │
│    • Get approver role (e.g., "Manager", "Finance Manager")        │
│    • Resolve to actual User via getApproverByRole()                 │
│    • Create chain entry with status="pending"/"awaiting"            │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────────┐
│  SAVE REQUEST WITH APPROVAL CHAIN                                   │
│  • approvalChain[] populated                                         │
│  • currentApprovalLevel = 1                                         │
│  • status = "pending" (or module-specific pending state)            │
│  • activities[] logged: "requested", started with Level 1 pending   │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────────┐
│  SEND EMAIL NOTIFICATION                                            │
│  sendApprovalEmail(level1Approver)                                  │
│  • Email to: approvalChain[0].approverEmail                         │
│  • Subject: "Approval Needed: [Request Type]"                       │
│  • Deep link to approval action URL                                 │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────────┐
│  CREATE NOTIFICATION RECORD                                         │
│  Notification collection:                                           │
│  • targetUser = approvalChain[0].approverId                         │
│  • title = "New Approval Pending"                                   │
│  • metadata = { requestId, type, amount, ... }                      │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ↓
        ┌────────────────────────────┐
        │   APPROVER Dashboard       │
        │   Approval.jsx             │
        │ Shows pending requests     │
        │ [Approve] [Reject]  BTN    │
        └────────────┬───────────────┘
                     │
          ┌──────────┴──────────┐
          ↓                     ↓
    ┌───────────────┐     ┌────────────────┐
    │   APPROVED    │     │    REJECTED    │
    └───────┬───────┘     └────────┬───────┘
            │                      │
            ↓                      ↓
    ┌───────────────────┐  ┌──────────────────────┐
    │ POST .../approve  │  │ POST .../reject      │
    │ {comment?}        │  │ {rejectionReason}    │
    └───────┬───────────┘  └──────────┬───────────┘
            │                         │
            ↓                         ↓
    UPDATE CHAIN ITEM          UPDATE CHAIN ITEM
    .status="approved"          .status="rejected"
    .approvedAt=now()           request.status="rejected"
            │                         │
            ├─ Has Next Level? ───┐  │
            │                      │  └─→ APPROVAL COMPLETE (REJECTED)
            │                      │
            └─ NO ─────────────────┤
                                   │
                    ┌──────────────┘
                    ↓
        ┌─────────────────────────┐
        │  YES - MORE LEVELS      │
        │  Move to next level     │
        │  Notify Level 2 Approver│
        └──────────┬──────────────┘
                   │
                   ↓
        ┌─────────────────────────┐
        │ CYCLE REPEATS FOR       │
        │ NEXT APPROVAL LEVEL     │
        └─────────────────────────┘
```

## 2. Approval Chain Status Progression

```
REQUEST CREATED
    ↓
┌───────────────────────────────────────────────────────────────────┐
│ Approval Chain Populated by Rule                                  │
│                                                                   │
│  Level 1: Manager                  status: "pending"   ← START    │
│  Level 2: Department Head          status: "awaiting"             │
│  Level 3: Finance Manager          status: "awaiting"             │
│  Level 4: Admin                    status: "awaiting"             │
└────────────────┬──────────────────────────────────────────────────┘
                 │
    ┌────────────────────────────────┬────────────────────────────┐
    │ Approver 1 (Manager) ACTION    │          OR                │
    ↓                                ↓                            ↓
APPROVE                        REJECT                        TIMEOUT
    │                            │                               │
    │                            ↓                               │
    │                       ┌──────────────┐                     │
    │                       │ REJECTED     │                     │
    │                       │ status=rej   │                     │
    │                       │ COMPLETE ✗   │                     │
    │                       └──────────────┘                     │
    │                                                            │
    ├─ NOT LAST LEVEL ──┐
    │                   ↓
    │         ┌─────────────────────────────────────┐
    │         │ Update Chains:                      │
    │         │ Level 1: approved, approvedAt=now() │
    │         │ Level 2: pending   ← MOVE HERE      │
    │         │ Level 3: awaiting                   │
    │         │ Level 4: awaiting                   │
    │         │                                     │
    │         │ Notify Level 2 Approver             │
    │         │ Send email + notification           │
    │         └─────────────────────────────────────┘
    │                   │
    │                   ↓
    │         ┌─────────────────────┐
    │         │ CYCLE FOR LEVEL 2   │
    │         └─────────────────────┘
    │
    └─ LAST LEVEL ──────┐
                        ↓
                ┌──────────────────────┐
                │ APPROVED             │
                │ status="approved"    │
                │ COMPLETE ✓           │
                │                      │
                │ Post-Approval:       │
                │ • Update inventory   │
                │ • Deduct payroll     │
                │ • Create PO          │
                │ • Send confirmation  │
                └──────────────────────┘
```

## 3. Module-Specific Approval Rules

```
APPROVAL RULE CONFIGURATION
┌──────────────────────────────────────┐
│ Module Type: "Leave Requests"        │
│ Conditions: ["All Requests"]         │
│ Levels:                              │
│  ├─ Level 1: Direct Manager          │
│  └─ Level 2: HR Director             │
│ Status: Active                       │
└────────────────┬─────────────────────┘
                 │
    ┌────────────┴─────────────────┐
    ↓                              ↓
LEAVE REQUEST               TRAVEL REQUEST
Resolver:                   Resolver:
 EMP.managerId              EMP.managerId
    → User                      → User
    │                           │
    └─→ Manager                 └─→ Manager
                                    + Booking team


APPROVAL RULE CONFIGURATION
┌──────────────────────────────────────┐
│ Module Type: "Advance Requests"      │
│ Conditions: ["Amount > 5000"]        │
│ Levels:                              │
│  ├─ Level 1: Manager                 │
│  ├─ Level 2: Finance Manager         │
│  └─ Level 3: Admin                   │
│ Status: Active                       │
└────────────────┬─────────────────────┘
                 │
    ┌────────────┴──────────────┐
    ↓                           ↓
ADVANCE REQUEST        REFUND REQUEST
Resolver:              Resolver:
 EMP.managerId         EMP.managerId
    → User                → User
    │                     │
 User.role="FM"        User.role="FM"
    │                     │
    │                  Admin
    └─────┬┬┬─────────────────
          ││└→ Finance Processing
          │└──→ Payroll Deduction
          └───→ Retirement Setup


APPROVAL RULE CONFIGURATION
┌──────────────────────────────────────┐
│ Module Type: "Material Requests"     │
│ Conditions: ["Amount > 1000"]        │
│ Levels:                              │
│  ├─ Level 1: Department Head         │
│  ├─ Level 2: Finance Manager         │
│  └─ Level 3: Admin                   │
│ Status: Active                       │
└────────────────┬─────────────────────┘
                 │
    ┌────────────┴──────────────┐
    ↓                           ↓
MATERIAL REQUEST        PURCHASE ORDER
Resolver:               Resolver:
 Department.               Manager
 headEmployeeId            +
    → User                  Finance Manager
    │                       +
    └─ Finance              Vendor Contact
       Manager
       +
       Admin
       │
       ├─→ Internal Transfer?
       │   └─ Auto StockTransfer
       │   └─ Update Inventory
       │
       └─→ Purchase Req?
           └─ Link to PO
           └─ Vendor Mgmt
```

## 4. Approver Resolution Logic

```
REQUEST: LeaveRequest from Employee (EMP123)
Employee Record:
  _id: EMP_OBJ_123
  employeeId: "EMP123"
  managerId: "EMP456"
  department: "Marketing"
  firstName: "John"

APPROVAL RULE: "Leave Requests"
Levels: [
  { level: 1, approverRole: "Manager" },
  { level: 2, approverRole: "Department Head" }
]

RESOLUTION:

┌─────────────────────────────────────────────────────┐
│ RESOLVE LEVEL 1: "Manager"                          │
│                                                    │
│ 1. Get Employee(EMP123)                            │
│ 2. Get Employee.managerId = "EMP456"               │
│ 3. Find Employee by id "EMP456"                    │
│    ├─ userRef → User._id                           │
│    ├─ email → "john.manager@company.com"           │
│    ├─ fullName → "John Manager"                    │
│    └─ role → "Manager"                             │
│                                                    │
│ Result:                                            │
│  approverId: "USER_OBJ_ID_456"                     │
│  approverName: "John Manager"                      │
│  approverEmail: "john.manager@company.com"         │
│  approverRole: "Manager"                           │
└─────────────────────────────────────────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────────┐
│ RESOLVE LEVEL 2: "Department Head"                  │
│                                                    │
│ 1. Get requestData.department = "Marketing"        │
│ 2. Find Department(Marketing)                      │
│    └─ headEmployeeId → "EMP789"                    │
│ 3. Find Employee("EMP789")                         │
│    ├─ userRef → User._id                           │
│    ├─ email → "dept.head@company.com"              │
│    ├─ fullName → "Jane HeadOfMarketing"            │
│    └─ role → "Manager" (or Department Head)        │
│                                                    │
│ Result:                                            │
│  approverId: "USER_OBJ_ID_789"                     │
│  approverName: "Jane HeadOfMarketing"              │
│  approverEmail: "dept.head@company.com"            │
│  approverRole: "Department Head"                   │
└─────────────────────────────────────────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────────┐
│ APPROVAL CHAIN BUILT:                               │
│ [                                                  │
│   {                                                │
│     level: 1,                                      │
│     approverRole: "Manager",                       │
│     approverId: "USER_OBJ_ID_456",                 │
│     approverName: "John Manager",                  │
│     approverEmail: "john.manager@company.com",     │
│     status: "pending"  ← Ready for action           │
│   },                                               │
│   {                                                │
│     level: 2,                                      │
│     approverRole: "Department Head",               │
│     approverId: "USER_OBJ_ID_789",                 │
│     approverName: "Jane HeadOfMarketing",          │
│     approverEmail: "dept.head@company.com",        │
│     status: "awaiting" ← Waiting for L1            │
│   }                                                │
│ ]                                                  │
└─────────────────────────────────────────────────────┘
```

## 5. Cross-Module Request Flow: Material Request → Purchase Order

```
┌─────────────────────────┐
│ Material Request        │
│ (PROCUREMENT MODULE)    │
└──────────┬──────────────┘
           │
           │ POST /api/material-requests
           ├─ requestType: "Purchase Request"
           ├─ lineItems: [...items...]
           ├─ amount: 15000
           └─ requestedBy: "John Procurement"
           │
           ↓
┌──────────────────────────────────────────────────┐
│ APPROVAL FLOW                                    │
│ Rule: "Material Requests" + "Amount > 10000"     │
│                                                  │
│ Level 1: Department Head  [PENDING]              │
│ Level 2: Finance Manager  [AWAITING]             │
│ Level 3: Admin            [AWAITING]             │
└──────────┬───────────────────────────────────────┘
           │
           ↓ (All 3 levels approve)
           │
┌──────────────────────────────────────────────────┐
│ POST /api/material-requests/:id/approve          │
│ (Called by Admin)                                │
│                                                  │
│ Status Changes:                                  │
│  Level 3: status = "approved" ✓                  │
│  Request.status = "approved"                     │
│  Request.currentApprovalLevel = null             │
└──────────┬───────────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────────────┐
│ CHECK REQUEST TYPE                               │
│                                                  │
│ requestType = "Purchase Request"?                │
│       └─ YES                                     │
└──────────┬───────────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────────────┐
│ FRONTEND CONVERSION                              │
│ User clicks: "Convert to Purchase Order"         │
│                                                  │
│ POST /api/purchase-orders                        │
│ {                                                │
│   poNumber: "PO-2026-00123",                     │
│   vendor: "TechSupplies Ltd",                    │
│   lineItems: [...from MR...],                    │
│   totalAmount: 15000,                            │
│   sourceFromMaterialRequestId: "MR-ID"           │
│ }                                                │
└──────────┬───────────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────────────┐
│ NEW PURCHASE ORDER CREATED                       │
│                                                  │
│ PurchaseOrder Record:                            │
│  _id: "PO_OBJ_ID"                                │
│  poNumber: "PO-2026-00123"                       │
│  vendor: "TechSupplies Ltd"                      │
│  status: "draft"           ← New PO              │
│  approvalChain: [...]      ← New chain per PO    │
│  sourceFromMaterialRequest: "MR-ID" ← Link back  │
└──────────┬───────────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────────────┐
│ PO GOES THROUGH OWN APPROVAL                     │
│                                                  │
│ Separate rule for Purchase Orders                │
│ Level 1: Finance Manager  [PENDING]              │
│ Level 2: Vendor Manager   [AWAITING]             │
│                                                  │
│ Notifications sent to Finance & Vendor contacts  │
└──────────────────────────────────────────────────┘
           │
           ↓
        ... (PO approval cycle)
           │
           ↓
┌──────────────────────────────────────────────────┐
│ PO APPROVED                                      │
│                                                  │
│ status = "approved"                              │
│ Marked ready for payment processing              │
│ Linked back to original Material Request         │
└──────────────────────────────────────────────────┘
```

## 6. Internal Transfer (Material Request) → Auto Stock Transfer

```
┌──────────────────────────────┐
│ Material Request             │
│ Type: "Internal Transfer"    │
├──────────────────────────────┤
│ sourceLocationId: "LOC_A"    │
│ sourceLocationName: "Store A"│
│ destLocationId: "LOC_B"      │
│ destLocationName: "Store B"  │
│ lineItems: [                 │
│   { itemName: "Widget",      │
│     quantity: 100 }          │
│ ]                            │
└──────────┬───────────────────┘
           │
    (Approval chain completes)
           │
           ↓
┌──────────────────────────────────────────────┐
│ POST .../approve (last level)                │
│                                              │
│ System checks:                               │
│  ✓ Is this Internal Transfer?                │
│  ✓ Do all items exist in inventory?         │
│  ✓ Is stock sufficient at source location?  │
└──────────┬───────────────────────────────────┘
           │
        (Validations pass)
           │
           ↓
┌──────────────────────────────────────────────┐
│ AUTO-GENERATE STOCK TRANSFER                 │
│                                              │
│ 1. Create StockTransfer record:              │
│    ├─ fromLocationId: "LOC_A"                │
│    ├─ toLocationId: "LOC_B"                  │
│    ├─ lineItems: [100 Widgets, ...]          │
│    ├─ status: "completed"                    │
│    ├─ linkedToMaterialRequestId: "MR_ID"     │
│    └─ waybillNumber: "WB-2026-00456"         │
│                                              │
│ 2. Update InventoryItem:                     │
│    ├─ Deduct from Store A locations          │
│    ├─ Add to Store B locations               │
│    ├─ Create StockMovement record            │
│    └─ Update lastUpdated timestamp           │
│                                              │
│ 3. Log Movement:                             │
│    logs.push({                               │
│      type: "transfer",                       │
│      fromLocation: "Store A",                │
│      toLocation: "Store B",                  │
│      quantity: -100,                         │
│      reason: "Internal Transfer MR-..."      │
│    })                                        │
└──────────┬───────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────────┐
│ UPDATE MATERIAL REQUEST                      │
│                                              │
│ PR Status: "approved" → "fulfilled"          │
│ linkedStockTransferId: "TRANSFER_OBJ_ID"     │
│ activities.push({                            │
│   type: "auto_action",                       │
│   text: "Stock transfer created: WB-...",    │
│   linkedTransfer: "TRANSFER_ID"              │
│ })                                           │
└──────────────────────────────────────────────┘
           │
           ↓
        COMPLETE
└─ All inventory movements logged
└─ Waybill generated & accessible
└─ Both request types linked & auditable
```

---

**Legend:**
- `→` : Flow direction
- `├─` : Sub-item
- `↓` : Transition
- `✓` : Completed/Success
- `✗` : Rejected/Failure
- `[ ]` : Status
- `{ }` : Data structure
- `"` : String/identifier
