# Create Purchase Order Feature - Complete Guide

## ✅ FEATURE NOW ENABLED

The **Create Purchase Order** button is now **fully functional** and opens a form page to create new POs directly.

---

## 📋 What Changed

### **Frontend** (src/components/modules/PurchaseOrders.jsx)

#### 1. **New State Added**
```javascript
const [showCreatePoForm, setShowCreatePoForm] = useState(false);
const [isSubmittingPo, setIsSubmittingPo] = useState(false);
const [createPoForm, setCreatePoForm] = useState({
  requestTitle: "",
  vendor: "",
  expectedDelivery: "",
  lineItems: [{ itemName: "", quantity: 1, amount: 0 }],
  notes: "",
  currency: "NGN",
});
```

#### 2. **New Handler Function** `handleCreatePo()`
- Validates vendor and line items
- Serializes form data to API payload
- Posts to `/api/purchase-orders`
- Opens new PO details after creation
- Handles errors gracefully

#### 3. **Updated Button**
```javascript
// BEFORE:  onClick={() => toast("...auto-created from material requests...")}
// AFTER:   onClick={() => setShowCreatePoForm(true)}
```

#### 4. **New Modal Form** 
- Request Title (optional)
- Vendor selection (required)
- Expected Delivery Date (optional)
- Dynamic Line Items (at least 1 required):
  - Item Name, Quantity, Unit Price per line
  - Add/Remove line items
- Notes (optional)
- Create/Cancel buttons

---

## 🔄 Complete Approval Request Flow

### **TWO WAYS TO CREATE POs NOW**

#### **Method 1: Direct Creation** (NEW) 
```
User clicks "Create Purchase Order" button
           ↓
Form opens with fields
           ↓
User fills: Vendor, Items, Dates
           ↓
User clicks "Create PO"
           ↓
POST /api/purchase-orders
           ↓
PO created in "draft" status
           ↓
Opens PO details page
```

#### **Method 2: From Material Request Approval** (Existing)
```
Material Request submitted
           ↓
Approver approves final level
           ↓
Approval chain complete
           ↓
Backend auto-creates PO from MR
           ↓
PO linked to Material Request
           ↓
PO status: "draft" + approval chain attached
```

---

## 🎯 HOW THE APPROVAL FLOW WORKS (Module 1)

The **Approval Module Dashboard** displays pending approvals that need action from the current user.

### **STEP-BY-STEP REQUEST APPROVAL PROCESS**

#### **1. REQUEST SUBMITTED IN SOURCE MODULE**
```
User in HR Module submits:
• Leave Request (5 days)
• Setting manager as approver
• Amount, department, dates

Backend:
 • Matches ApprovalRule ("Duration > 2 Days")
 • Builds chain: Manager → HR Director → Admin
 • Sets status: "pending"
 • Sends email to Manager
```

#### **2. APPROVER SEES REQUEST IN APPROVAL DASHBOARD**
```
Manager opens Approval module:
 • Sees list of pending approvals
 • Filters by request type (Leave/Travel/Advance/Refund)
 • Shows:
   - Request ID
   - Requester name
   - Amount/Duration
   - Current approval level
   - Badges showing "Pending Your Approval" ⚠️

Data fetched from:
  GET /api/{request-type}?userId={currentUser}
  
Example endpoints:
  • GET /api/leave-requests?userId=abc123
  • GET /api/travel-requests?userId=abc123
  • GET /api/advance-requests?userId=abc123
  • GET /api/refund-requests?userId=abc123
```

#### **3. APPROVER VIEWS REQUEST DETAILS**
```
Modal/Card shows:
┌────────────────────────────────┐
│ REQUEST #LR-2026-001          │
├────────────────────────────────┤
│ Requester: John Doe           │
│ Duration: 5 days             │
│ Leave Type: Annual           │
│ Reason: Vacation             │
│                               │
│ APPROVAL CHAIN:               │
│ ✅ Lv1: Manager (You) - NOW  │
│ ⏳ Lv2: HR Director - Next    │
│ ⏳ Lv3: Admin - Awaiting      │
│                               │
│ Comments: (Editable)          │
│ [View Doc]                    │
│ [Add Comment]                 │
│                               │
│ [✓ Approve] [✗ Reject]       │
└────────────────────────────────┘
```

#### **4A. APPROVE ACTION**
```
Approver clicks "Approve"
           ↓
POST /api/{type}/{id}/approve
           ↓
Backend processes:
 • Marks THIS level: "approved" ✅
 • Records timestamp: approvedAt
 • Creates activity log entry
 • Checks if more levels exist:
   
   YES → Move to next level
         Status stays "pending"
         Next approver notified
         
   NO → Final approval ✅
        Status = "approved"
        TRIGGER AUTO-ACTIONS:
        • Payment queued
        • Leave balance updated
        • Travel budget allocated
        • Budget reserved
           ↓
Requester notified: "Your request was approved!"
All approvers notified: "Request completed"
Request disappears from approver lists
```

#### **4B. REJECT ACTION**
```
Approver clicks "Reject"
Enters reason: "Budget exceeded"
           ↓
POST /api/{type}/{id}/reject
           ↓
Backend processes:
 • Marks current level: "rejected" ❌
 • Stores rejection reason
 • Status = "rejected"
 • Chain terminates (no more levels process)
           ↓
Requester notified with reason:
"Your request was REJECTED by Manager:
 Budget exceeded"
           ↓
Requester can:
 • Edit and resubmit
 • Contact approver
 • Appeal to admin
```

---

## 📊 COMPARISON: APPROVAL MODULE vs MATERIAL REQUESTS MODULE

| Feature | Approval Module (HR) | Material Requests Module |
|---------|---------------------|--------------------------|
| **Used For** | Leave, Travel, Advance, Refund | Material/Purchase Requests |
| **Where Approver Acts** | Approval.jsx dashboard | MaterialRequests.jsx list |
| **Data Fetch** | Per-user endpoint (`?userId=...`) | All requests + client filter |
| **Approval Filter** | Server-side | Client-side (check isUserApprover) |
| **UI for Actions** | Modal dialog | Inline action buttons |
| **Auto-Action** | Payment/Leave/Budget update | Create Purchase Order |
| **Next Module** | Finance/Payroll | Vendor Management |

---

## 🚀 IMPLEMENTATION SUMMARY

### **Frontend Implementation**
✅ Add form state to track Create PO form data
✅ Add handler function `handleCreatePo()` that:
  - Validates required fields
  - Builds API payload
  - POSTs to `/api/purchase-orders`
  - Opens details view on success
  - Shows success/error toast

✅ Add modal form UI with fields:
  - Request Title (text input)
  - Vendor (dropdown select)
  - Expected Delivery (date input)
  - Line Items (dynamic array):
    * Item Name (text input)
    * Quantity (number input)
    * Unit Price (number input)
    * Delete button per line
    * Add Line button
  - Notes (textarea)
  - Create/Cancel buttons

✅ Update button from `onClick={toast(...)}` to `onClick={() => setShowCreatePoForm(true)}`

### **Backend Implementation**
✅ Endpoint already exists: `router.post('/purchase-orders', ...)`

**What it does:**
- Accepts PO data from frontend
- Auto-calculates `totalAmount` from lineItems
- Sets default currency to "NGN"
- Calculates `totalAmountNgn` with exchange rate
- Saves to database
- Returns created PO object

**Payload Format:**
```javascript
{
  requestTitle: "Office Equipment",    // optional
  vendor: "Tech Supplies Inc",         // required
  expectedDelivery: "2026-04-15",      // optional (date string)
  lineItems: [                          // required (array)
    {
      itemName: "Laptop",
      quantity: 5,
      amount: 1000
    }
  ],
  notes: "Urgent purchase",            // optional
  currency: "NGN",                     // optional (defaults to NGN)
  status: "draft"                      // optional (defaults to draft)
}
```

---

## 📝 TESTING THE FEATURE

### **Test 1: Direct PO Creation**
```
1. Navigate to Purchase Orders module
2. Click "Create Purchase Order" button
3. ✅ Form modal opens
4. Fill in:
   - Vendor: "Tech Supplies Inc"
   - Items: 
     * 5x Laptop @ ₦1,000,000 = ₦5,000,000
     * 10x Mouse @ ₦5,000 = ₦50,000
5. Click "Create PO"
6. ✅ PO created and details page opens
7. ✅ PO appears in list with "draft" status
```

### **Test 2: Approval Request Flow (Material Request)**
```
1. Navigate to Material Requests
2. Create Material Request (₦10,000 amount)
3. Request submitted
4. ✅ Approval rule matched (Amount > 5000)
5. ✅ Approval chain built: Manager → Dept Head → Finance
6. Open Approval module as Manager
7. ✅ Request shows in pending list
8. Click Approve
9. ✅ Request moves to Dept Head
10. Dept Head approves
11. ✅ Request moves to Finance Manager
12. Finance Manager approves
13. ✅ Final approval triggered
14. ✅ Purchase Order AUTO-CREATED from MR
15. Navigate back to Purchase Orders
16. ✅ New PO appears with linked Material Request
```

### **Test 3: Multi-Level Approval Chain**
```
1. Create Material Request with ₦50,000 amount
2. Open Approval module as Manager
3. View request details
4. Click "Approve"
5. ✅ Request status: still "pending"
6. ✅ Current level marked "approved"
7. ✅ Next level marked "pending"
8. ✅ Activity log: "Manager approved"
9. Open Approval module as Dept Head
10. ✅ Same request now appears in HIS approvals
11. Click "Approve"
12. ✅ Request moves to Finance level
13. Finance Manager approves
14. ✅ Final approval triggers PO creation
```

### **Test 4: Rejection Flow**
```
1. Create Material Request
2. Manager views in Approval module
3. Click "Reject"
4. Enter reason: "Insufficient budget"
5. Click "Confirm Reject"
6. ✅ Request status: "rejected"
7. ✅ Activity log shows reason
8. ✅ Requester notified with rejection reason
9. ✅ Dept Head does NOT see request
10. ✅ Finance Manager does NOT see request
11. ✅ No PO created
12. Requester can now edit and resubmit
```

---

## 🔗 MODULE FLOW SUMMARY

### **Request Journey Through System**

```
┌─────────────────────────────┐
│  SOURCE MODULE              │
│  (HR/Procurement)           │
│  User creates request       │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  APPROVAL RULE MATCHING     │
│  (approvalRuleHelper.js)    │
│  Build approval chain       │
└──────────────┬──────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
   ┌────────────┐ ┌───────────┐
   │ MULTI-     │ │ AUTO-     │
   │ LEVEL      │ │ ACTIONS   │
   │ APPROVALS  │ │ (Post     │
   │ in         │ │ Approval) │
   │ Approval   │ │           │
   │ Module     │ │ • Payment │
   │            │ │ • Leave   │
   │            │ │ • PO      │
   └────────────┘ │ • Budget  │
                  └───────────┘
```

---

## 📞 APPROVER RESOLUTION

**How the system finds approvers:**

```javascript
Rule says: approverRole = "Manager"
                    ↓
Get requester's employee record
                    ↓
Look up employee.managerId
                    ↓
Find Manager in Employee collection
                    ↓
Extract: { id, name, email, role }
                    ↓
Return Manager as approver
```

**Supported Approver Roles:**
- Manager (employee's direct supervisor)
- Department Head (department's head employee)
- Finance Manager (user with Finance role)
- HR Director (user with HR Director role)
- Admin (system admin)

---

## ✨ KEY FEATURES

✅ **Direct PO Creation** - Users can now create POs directly without Material Requests
✅ **Vendor Selection** - Dropdown of active vendors
✅ **Dynamic Line Items** - Add/remove items freely
✅ **Auto-Calculation** - Total amount calculated from items
✅ **Multi-Level Approvals** - Requests route through approval chain
✅ **Activity Logging** - All actions tracked with timestamps
✅ **Email Notifications** - Approvers notified when action needed
✅ **Rejection Feedback** - Denials include reason text
✅ **Status Tracking** - Clear indication of which step is pending
✅ **Auto-Actions** - Post-approval triggers (PO creation, payment queue, leave update)

---

## 🎓 WORKFLOW ARCHITECTURE

```
┌────────────────────────────────────────────────────────────┐
│                    REQUEST LIFECYCLE                        │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  USER CREATES REQUEST                                       │
│         ↓                                                    │
│  RULE MATCHES → Defines approval levels                    │
│         ↓                                                    │
│  APPROVAL CHAIN BUILT → Each level has approver info       │
│         ↓                                                    │
│  REQUEST SAVED → Status: "pending"                         │
│         ↓                                                    │
│  LEVEL 1 APPROVER EMAIL SENT                               │
│         ↓                                                    │
│  APPROVAL MODULE DASHBOARD                                 │
│  Approver sees request in their pending list               │
│         ↓                                                    │
│  APPROVER ACTIONS:                                          │
│    ├─ APPROVE:                                             │
│    │  • This level: approved ✅                            │
│    │  • Next level: pending ⏳ (EMAIL SENT)               │
│    │  • Status: still "pending"                            │
│    │                                                        │
│    └─ REJECT:                                              │
│       • This level: rejected ❌                            │
│       • Chain STOPS                                         │
│       • Status: "rejected"                                 │
│       • Requester notified with reason                     │
│         ↓                                                    │
│  FINAL APPROVER APPROVES                                   │
│         ↓                                                    │
│  STATUS: "APPROVED" ✅                                     │
│         ↓                                                    │
│  AUTO-ACTIONS TRIGGERED                                    │
│  (Payment, Leave Update, PO Creation, Budget Reserve)      │
│         ↓                                                    │
│  NOTIFICATIONS SENT                                         │
│  (Requester, All Approvers, Finance, HR)                   │
│         ↓                                                    │
│  REQUEST FLOW COMPLETE                                     │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

