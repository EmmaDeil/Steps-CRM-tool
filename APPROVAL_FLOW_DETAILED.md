# Complete Approval Request Flow - Module Level Breakdown

## **MODULE 1: APPROVAL MODULE** (Approval.jsx)
### Used for: Leave, Travel, Advance, Refund Requests

---

## 📋 **MODULE 1 FLOW DIAGRAM**

```
STEP 1: USER SUBMITS REQUEST IN SOURCE MODULE
═══════════════════════════════════════════════════
┌─────────────────────────────────────────────────┐
│ User in HR Module creates:                      │
│  • Leave Request                                │
│  • Travel Request                               │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ Backend generates Approval Chain:               │
│ - Fetches ApprovalRule for "Leave Requests"    │
│ - Builds chain: Manager → HR Director           │
│ - Records in database                           │
│ - Sets status: "pending"                        │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
      ┌─────────────────────────────┐
      │   EMAIL SENT TO MANAGER     │
      │   "You have approval to do" │
      └─────────────────────────────┘
                     │
                     ▼
STEP 2: APPROVER VIEWS IN APPROVAL MODULE DASHBOARD
═══════════════════════════════════════════════════
┌─────────────────────────────────────────────────┐
│ Approval.jsx fetches:                           │
│ GET /api/advance-requests?userId={currentUser}  │
│ GET /api/refund-requests?userId={currentUser}   │
│ GET /api/leave-requests (filtered by user)      │
│                                                  │
│ Database query finds requests where:             │
│ - approver = currentUser.email/id               │
│ - approval chain has pending step for user      │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ DASHBOARD DISPLAYS:                             │
│ ┌─────────────────────────────────────────────┐ │
│ │ ADVANCE REQUESTS                            │ │
│ │  • Request 001: $500 → John Doe             │ │
│ │    Status: Pending Your Approval [⚠️ BADGE] │ │
│ │                                             │ │
│ │ REFUND REQUESTS                             │ │
│ │  • Request 002: $200 → Jane Smith           │ │
│ │    Status: Pending Your Approval [⚠️ BADGE] │ │
│ │                                             │ │
│ │ LEAVE REQUESTS                              │ │
│ │  • Request 003: 5 days → Bob Johnson        │ │
│ │    Status: Pending Your Approval [⚠️ BADGE] │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ Each request shows:                              │
│ ✓ Request ID                                    │
│ ✓ Requester name                                │
│ ✓ Amount/Duration                               │
│ ✓ Status badge                                  │
│ ✓ Current approval level indicator              │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
STEP 3: APPROVER CLICKS TO VIEW DETAILS
════════════════════════════════════════
┌─────────────────────────────────────────────────┐
│ Detail modal shows:                             │
│ ┌─────────────────────────────────────────────┐ │
│ │ REQUEST #MR-2026-001                        │ │
│ │ ─────────────────────────────────────────   │ │
│ │ Requester: John Doe (EMP-001)               │ │
│ │ Amount: $5,000 USD                          │ │
│ │ Reason: Office renovation                   │ │
│ │ Department: Operations                      │ │
│ │                                             │ │
│ │ APPROVAL CHAIN:                             │ │
│ │ ✅ Level 1: Manager (Sarah) - APPROVED     │ │
│ │ ⏳ Level 2: YOU (Finance) - PENDING        │ │
│ │ ⏳ Level 3: Admin - AWAITING                │ │
│ │                                             │ │
│ │ COMMENTS/HISTORY:                           │ │
│ │ • Sarah: "Looks good" (2hrs ago)            │ │
│ │                                             │ │
│ │ [View Document] [Add Comment]               │ │
│ └─────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
    APPROVE                  REJECT
    │                        │
    ▼                        ▼
STEP 4A: APPROVAL ACTION
════════════════════════════════════════════════════
POST /api/advance-requests/{id}/approve
┌─────────────────────────────────────────────────┐
│ BACKEND PROCESSING:                             │
│ 1. Find request by ID                           │
│ 2. Check if approver matches current step       │
│ 3. Mark current approval level: "approved"      │
│ 4. Add timestamp: approvedAt                    │
│ 5. Log activity:                                │
│    "Sarah approved at level 2"                  │
│                                                 │
│ 6. Check if more approvers exist:               │
│    YES → Move to next (status stays "pending")  │
│    NO → Final approval reached                  │
│        → Set status: "approved"                 │
│        → TRIGGER AUTO-ACTIONS:                  │
│           • For Advance: Queue for payment      │
│           • For Refund: Prepare reimbursement   │
│           • For Leave: Update leave balance     │
│           • For Travel: Allocate travel budget  │
│        → Send success notification              │
│                                                 │
│ 7. Return result to frontend                    │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
              FRONTEND UPDATES:
              • Sound notification ✓
              • Toast: "Approved successfully"
              • Refresh list (request disappears)
              • Next approver gets notified

STEP 4B: REJECTION ACTION
════════════════════════════════════════════════════
POST /api/advance-requests/{id}/reject
┌─────────────────────────────────────────────────┐
│ BACKEND PROCESSING:                             │
│ 1. Find request by ID                           │
│ 2. Validate rejection reason (required)         │
│ 3. Mark current approval level: "rejected"      │
│ 4. Store rejection reason in approval chain     │
│ 5. Set request status: "rejected"               │
│ 6. Log activity:                                │
│    "Sarah rejected: Budget exceeded"            │
│                                                 │
│ 7. CHAIN STOPS HERE (no further levels)         │
│    Requester gets notification:                 │
│    "Your request was rejected by Sarah:         │
│     Budget exceeded"                            │
│                                                 │
│ 8. Requester can:                               │
│    • Edit and resubmit                          │
│    • Appeal to admin                            │
│    • Abandon request                            │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
              FRONTEND UPDATES:
              • Toast: "Request rejected"
              • Refresh list (shows as rejected)
              • Back to list view
```

---

## 🔄 **WHAT HAPPENS IN EACH SCENARIO**

### **Scenario 1: Multi-Level Approval Chain**

```
User submits $10,000 Advance Request
           ↓
Approval Rule: "Amount > $5,000" requires 3 levels
           ↓
Chain Built:
  Level 1: Manager (John) - status: pending
  Level 2: Finance Manager (Sarah) - status: awaiting
  Level 3: Admin (Bob) - status: awaiting
           ↓
NOTIFICATION TO JOHN (Level 1)
  John opens Approval module
  Sees request, clicks Approve
           ↓
Backend Updates:
  John's level: approved ✅
  Sarah's level: pending ⏳ (moved from awaiting)
  Status: still "pending" (more approvers exist)
           ↓
NOTIFICATION TO SARAH (Level 2)
  Email: "You have a pending approval"
  Sarah opens Approval module
  Sees request (request appeared in her list)
  Clicks Approve
           ↓
Backend Updates:
  Sarah's level: approved ✅
  Bob's level: pending ⏳
  Status: still "pending"
           ↓
NOTIFICATION TO BOB (Level 3)
  Bob approves
           ↓
Backend Updates:
  Bob's level: approved ✅
  Status: APPROVED ✅
  TRIGGERS AUTO-ACTION:
    • Advance payment queued
    • Sent to payment processing
    • Notification to requester: "Approved!"
```

### **Scenario 2: Rejection at Any Level**

```
Level 1 Approver (John) views request
  Sees issues, clicks Reject
  Enters reason: "Budget documentation incomplete"
           ↓
Backend Updates:
  John's level: rejected ❌
  Status: REJECTED ❌
  Reason stored in chain
           ↓
ALL FURTHER APPROVERS SKIPPED
  (Chain terminates)
           ↓
Requester Notified:
  "Your request was rejected by John:
   Budget documentation incomplete"
  
Requester can:
  • Edit request
  • Resubmit
  • Contact John for clarification
```

---

## 📊 **HOW APPROVERS ARE DETERMINED**

### **Role-Based Resolution** (approvalRuleHelper.js)

```javascript
Approval Rule: { approverRole: "Manager" }
                    ↓
Call: getApproverByRole("Manager", requestData)
                    ↓
Logic:
  1. Get requester's employee record
  2. Find employee.managerId
  3. Look up Manager by ID in Employee collection
  4. Extract: { id, name, email }
                    ↓
Result → Jane Smith (jane@company.com)
```

**Supported Approver Types:**
- **Manager** → Employee's direct supervisor
- **Department Head** → Department's head person
- **Finance Manager** → User with Finance role
- **HR Director** → User with HR Director role
- **Admin** → System admin

---

## 🔐 **SECURITY & VALIDATION**

Each approve/reject request validates:

✅ User identity (token-based auth)
✅ User is actually the current approver
✅ Request is in "pending" status
✅ Rejection reason provided (if rejecting)
✅ No duplicate approvals (idempotent)

---

## 🎯 **KEY DIFFERENCES: MODULE 1 vs MATERIAL REQUESTS**

| Feature | Approval Module (Leave/Travel/Advance) | Material Requests Module |
|---------|------|------|
| **Where Approval Happens** | Approval.jsx dashboard | MaterialRequests.jsx list |
| **Fetch Endpoint** | `/api/advance-requests?userId=...` | `/api/material-requests` |
| **Approval Filter** | Server-side (by user approval role) | Client-side (check isUserApprover) |
| **UI for Approve/Reject** | Modal in Approval.jsx | Inline buttons in MR row |
| **Auto-Action on Approval** | Payment process, leave update | Create Purchase Order |
| **Next Module Flow** | Finance → Payroll | Procurement → Vendor |

---

## 📲 **NOTIFICATION FLOW**

```
Request Submitted
       ↓
Backend sends EMAIL to Level 1 Approver
  "You have a pending approval request"
       ↓
Approver opens Approval Module
  (or gets notified in real-time if connected)
       ↓
Approver sees in dashboard
       ↓
Clicks Approve/Reject
       ↓
If Approve → Email to Level 2 Approver
If Reject → Email to Requester + Admin log
If Final Approve → Email to Requester + Auto-action fires
```
