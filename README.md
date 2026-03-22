# Netlink CRM

Enterprise resource management platform built with React, Express, and MongoDB.

## Overview

Netlink CRM combines operations across HR, procurement, finance, payroll, inventory, maintenance, security, analytics, and admin controls in one system.

Current implementation highlights:

- Multi-module workspace with role-based access
- Approval workflow engine with configurable multi-level routing
- Material request to purchase order lifecycle support
- Direct purchase order creation and approval controls
- Accounts payable tracking including partial and full payment flow
- Notification center and activity timelines
- Audit-oriented admin capabilities

## Core Modules

- HRM: employees, departments, job titles, leave allocations, leave and travel requests
- Finance: invoicing, accounts payable, advance and refund requests
- Procurement: material requests, purchase orders, vendor management, stock-linked fulfillment
- Inventory: item management, stock movements, internal transfers, issues
- Payroll: payroll run management and related workflows
- Attendance: attendance records and external attendance integration fallback
- Security: physical security logs, visitor sign-in, security settings
- Admin: module setup, users, roles, approval settings, backups, system settings
- Analytics and Reporting: consolidated operational dashboards and generated reports

## Approval Workflow (Current Routing)

Approval rules are defined in the approval settings area and stored in the ApprovalRule model.

High-level flow:

1. Request is submitted from a source module (for example Material Requests, Leave Requests, Advance Requests).
2. Server matches an active rule for that module and condition set.
3. Server builds an approvalChain with level-based approvers.
4. Current approver sees the request as pending.
5. Approve action advances to next level or finalizes request.
6. Reject action stops the chain and marks request rejected.

Notable behavior in procurement:

- Material request final approval can trigger purchase order creation.
- Purchase orders also support their own approval chain and status progression.

## Approval Workflow Diagrams

### 1) Request Submission to Approval Execution Flow

```text
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

### 2) Approval Chain Status Progression

```text
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

### 3) Module-Specific Approval Rules

```text
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

### 4) Approver Resolution Logic

```text
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

### 5) Cross-Module Request Flow: Material Request to Purchase Order

```text
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

### 6) Internal Transfer to Auto Stock Transfer

```text
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

## Tech Stack

Frontend:

- React (Vite)
- React Router
- Tailwind CSS
- Axios-based API service
- React Hot Toast
- Recharts

Backend:

- Node.js and Express
- MongoDB with Mongoose
- JWT auth middleware
- Multer for uploads

## Project Structure

```text
StepsProject/
   public/
   server/
      index.js
      api.js
      middleware/
      models/
      routes/
      utils/
      uploads/
   src/
      App.jsx
      main.jsx
      components/
         auth/
         common/
         modules/
      context/
      services/
      home/
      utils/
   package.json
   vite.config.js
   tailwind.config.js
   vercel.json
```

### Folder Structure Diagram

```text
                           ┌──────────────────────┐
                           │      StepsProject    │
                           └──────────┬───────────┘
                                      │
          ┌───────────────────────────┼────────────────────────────┐
          │                           │                            │
          ↓                           ↓                            ↓
 ┌──────────────────┐       ┌──────────────────┐        ┌──────────────────┐
 │    Frontend      │       │     Backend      │        │   Project Root   │
 │      src/        │       │     server/      │        │   config files   │
 └────────┬─────────┘       └────────┬─────────┘        └────────┬─────────┘
          │                           │                            │
   ┌──────┼────────────────┐   ┌──────┼────────────────┐    ┌──────┼──────────────┐
   │      │                │   │      │                │    │      │              │
   ↓      ↓                ↓   ↓      ↓                ↓    ↓      ↓              ↓
components/ context/    services/   routes/ models/  middleware/ package.json README.md vite.config.js
   │                    home/ utils/ utils/ uploads/  index.js
   │
   ├─ auth/
   ├─ common/
   └─ modules/

Runtime flow:
  Browser (React/Vite)  ->  /api/* requests  ->  Express routes  ->  Mongoose models  ->  MongoDB
```

## Local Setup

Prerequisites:

- Node.js 18+
- npm
- MongoDB (local or Atlas)

1. Install dependencies in root and server:

```bash
npm install
cd server
npm install
cd ..
```

2. Create root .env:

```env
VITE_API_BASE_URL=http://localhost:4000
```

3. Create server/.env:

```env
MONGODB_URI=mongodb://localhost:27017/steps-crm
JWT_SECRET=change_me
PORT=4000
INVENTORY_EXPIRY_ALERT_DAYS=30
INVENTORY_ALERT_EMAILS=ops@company.com,warehouse@company.com
```

4. Start backend:

```bash
cd server
npm run start
```

5. Start frontend in a second terminal:

```bash
npm run dev
```

Frontend default URL: http://localhost:5173

## Scripts

Root:

- npm run dev
- npm run build
- npm run preview
- npm run lint

Server:

- npm run start
- node seed.js

## API Surface (Selected)

Authentication:

- POST /api/auth/signup
- POST /api/auth/login
- GET /api/auth/verify
- POST /api/auth/forgot-password
- POST /api/auth/reset-password

Approval Settings:

- Base path: /api/approval-settings
- Managed by approval rule routes

Material Requests:

- GET /api/material-requests
- POST /api/material-requests
- POST /api/material-requests/:id/approve
- POST /api/material-requests/:id/reject
- POST /api/material-requests/:id/comments

Purchase Orders:

- GET /api/purchase-orders
- GET /api/purchase-orders/:id
- POST /api/purchase-orders
- POST /api/purchase-orders/:id/approve
- POST /api/purchase-orders/:id/lock
- PUT /api/purchase-orders/:id

Finance / AP:

- GET /api/finance/accounts-payable
- POST /api/purchase-orders/:id/mark-paid

Users and Notifications:

- GET /api/users
- GET /api/notifications
- PATCH /api/notifications/:id/read
- POST /api/notifications/clear-all

## API Examples

Use these examples as reference payloads for local testing.

### 1) Login

Request:

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
   "email": "admin@company.com",
   "password": "StrongPassword123!"
}
```

Response (success):

```json
{
   "success": true,
   "message": "Login successful",
   "data": {
      "user": {
         "_id": "65f0a1...",
         "fullName": "Admin User",
         "email": "admin@company.com",
         "role": "Admin",
         "status": "Active"
      },
      "token": "eyJhbGciOi..."
   }
}
```

### 2) Create Material Request

Request:

```http
POST /api/material-requests
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
   "requestType": "Purchase Request",
   "requestTitle": "Engineering Laptops",
   "requestedBy": "EMP00012",
   "department": "Engineering",
   "lineItems": [
      {
         "itemName": "Laptop",
         "quantity": 5,
         "quantityType": "pcs",
         "amount": 1250
      }
   ],
   "currency": "USD",
   "message": "Needed for onboarding Q2"
}
```

Response (success):

```json
{
   "message": "Request created and email sent",
   "data": {
      "_id": "65f0b2...",
      "requestId": "MR-03222026-001",
      "status": "pending",
      "approvalChain": [
         {
            "level": 1,
            "approverName": "Team Manager",
            "status": "pending"
         }
      ]
   }
}
```

### 3) Approve Material Request

Request:

```http
POST /api/material-requests/:id/approve
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
   "comment": "Approved for this sprint",
   "vendor": "Acme Supplies"
}
```

Response (example progression):

```json
{
   "success": true,
   "message": "Approval recorded and moved to next approver",
   "type": "approval_progress",
   "request": {
      "_id": "65f0b2...",
      "status": "pending",
      "currentApprovalLevel": 2
   }
}
```

Final-level approval can return a purchase order creation result depending on request type.

### 4) Create Purchase Order (Direct)

Request:

```http
POST /api/purchase-orders
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
   "requestTitle": "Office Internet Renewal",
   "vendor": "FiberNet Ltd",
   "expectedDelivery": "2026-04-10",
   "lineItems": [
      {
         "itemName": "Internet Subscription",
         "quantity": 1,
         "amount": 3500
      }
   ],
   "currency": "NGN",
   "notes": "Annual contract"
}
```

Response (success):

```json
{
   "_id": "65f0c3...",
   "poNumber": "PO-2026-042",
   "status": "draft",
   "vendor": "FiberNet Ltd",
   "totalAmount": 3500,
   "currency": "NGN"
}
```

### 5) Accounts Payable Query with Filters

Request:

```http
GET /api/finance/accounts-payable?vendor=FiberNet%20Ltd&status=payment_pending&dateRange=last30&minAmount=1000&page=1
Authorization: Bearer <token>
```

Response (success):

```json
{
   "success": true,
   "invoices": [
      {
         "_id": "65f0d4...",
         "poNumber": "PO-2026-042",
         "vendor": "FiberNet Ltd",
         "status": "payment_pending",
         "amount": 3500,
         "currency": "NGN"
      }
   ],
   "pagination": {
      "page": 1,
      "totalPages": 1,
      "total": 1
   }
}
```

## Architecture Diagrams

### A) Request Flow Across Modules

```mermaid
flowchart LR
   U[Requester] --> M[Source Module\nHR/Finance/Procurement]
   M --> R[Approval Rule Matching]
   R --> C[Approval Chain Built]
   C --> A[Approver Dashboard]
   A -->|Approve| N{More Levels?}
   A -->|Reject| X[Rejected + Notify Requester]
   N -->|Yes| A
   N -->|No| F[Final Approved]
   F --> P[Post-Approval Action\nPayment/PO/Leave Update]
```

### B) Module Interaction Overview

```mermaid
flowchart TB
   HR[HRM]
   FIN[Finance]
   PROC[Procurement]
   INV[Inventory]
   PAY[Payroll]
   APP[Approval]
   ADM[Admin Settings]
   NOTIF[Notifications]

   HR --> APP
   FIN --> APP
   PROC --> APP
   APP --> NOTIF
   APP --> PROC
   PROC --> INV
   FIN --> PAY
   ADM --> APP
   ADM --> HR
   ADM --> PROC
   ADM --> FIN
```

### C) Material Request to Purchase Order Lifecycle

```mermaid
sequenceDiagram
   participant Req as Requester
   participant MR as Material Requests
   participant AP as Approval Engine
   participant PO as Purchase Orders
   participant APV as Accounts Payable

   Req->>MR: Submit material request
   MR->>AP: Build approval chain
   AP-->>MR: pending level 1
   AP->>AP: approve/reject decisions
   AP-->>MR: final approved
   MR->>PO: Auto-create purchase order
   PO->>APV: payment_pending / partly_paid / paid
```

## Developer Quickstart

Common daily tasks for developers working on this repo.

### 1) Seed Data

```bash
cd server
node seed.js
```

Use this when bootstrapping a new local environment or restoring baseline module data.

### 2) Reset Local Database (MongoDB)

Option A: drop entire local database.

```bash
mongosh "mongodb://localhost:27017/steps-crm" --eval "db.dropDatabase()"
```

Then reseed:

```bash
cd server
node seed.js
```

Option B: clear specific collections only (safer for partial resets).

```bash
mongosh "mongodb://localhost:27017/steps-crm" --eval "db.materialrequests.deleteMany({}); db.purchaseorders.deleteMany({}); db.approvalrules.deleteMany({});"
```

### 3) Dev Run Checklist

```bash
# Terminal 1
cd server
npm run start

# Terminal 2
npm run dev
```

Verify:

- Backend health endpoint responds: GET /api/health
- Frontend loads at http://localhost:5173
- Login works and protected modules render

### 4) Manual Test Checklist (High Value)

- Auth:
   - Signup, login, token verification, logout
- Approval flow:
   - Submit request, approve level 1, approve final level, reject with reason
- Procurement:
   - Create material request, create direct PO, lock/unlock PO, PO approve/reject
- Finance/AP:
   - Filter AP list by status/date/amount, run partial payment then full payment
- Notifications:
   - Read single, clear all, verify badge updates
- Reporting:
   - Generate report and verify status transitions

### 5) Before Commit

- Run lint in root: npm run lint
- Smoke-test affected module pages
- Confirm no server startup errors in terminal logs

## Security Notes

- JWT-based authentication with protected routes
- Role-aware access controls for sensitive areas
- Password policy support and email verification flow
- Activity and audit logs for operational traceability

## Deployment

The repository includes vercel.json for deployment alignment.

Typical production steps:

1. Build frontend: npm run build
2. Configure environment variables in host platform
3. Deploy frontend and backend with matching API base URL and database credentials

## Contributing

1. Create a branch from main.
2. Keep changes scoped to one feature/fix.
3. Run lint and smoke-test impacted modules.
4. Open a pull request with clear testing notes.

## License

MIT. See LICENSE.

## Maintainer

Emmanuel Clef (EmmaDeil)

Last updated: March 22, 2026
