# Material Request Workflow API Documentation

## Overview

Complete end-to-end procurement workflow:
1. Material Request (existing) → RFQ (Request for Quotation)
2. Vendor Quotes Selection → Purchase Order (PO) Creation
3. Payment Processing (Partial or Full) → Item Receiving
4. Inventory Integration → Workflow Completion

---

## API Endpoints

### 1. MATERIAL REQUEST WORKFLOW PROGRESS

#### Get Workflow Progress
```
GET /api/workflow/material-requests/{id}/progress
```

**Response:**
```json
{
  "success": true,
  "data": {
    "materialRequest": {
      "id": "507f1f77bcf86cd799439011",
      "requestId": "MR-001",
      "status": "approved",
      "createdAt": "2024-03-22T10:00:00Z"
    },
    "rfqs": [
      {
        "id": "507f1f77bcf86cd799439012",
        "rfqNumber": "RFQ-240322-4521",
        "status": "quotation_received",
        "vendor": "TechSupply Ltd",
        "createdAt": "2024-03-22T11:00:00Z"
      }
    ],
    "pos": [
      {
        "id": "507f1f77bcf86cd799439013",
        "poNumber": "PO-240322-8934",
        "status": "partly_paid",
        "vendor": "TechSupply Ltd",
        "totalAmount": 500000,
        "paidAmount": 250000,
        "createdAt": "2024-03-22T12:00:00Z"
      }
    ],
    "payments": [
      {
        "id": "507f1f77bcf86cd799439014",
        "paymentNumber": "PAY-240322-9283",
        "amount": 250000,
        "percentage": 50,
        "status": "completed",
        "date": "2024-03-22T13:00:00Z"
      }
    ],
    "receipts": [
      {
        "id": "507f1f77bcf86cd799439015",
        "receiptNumber": "GRN-240322-1234",
        "status": "inspected",
        "itemsReceived": 5,
        "date": "2024-03-22T14:00:00Z"
      }
    ],
    "summary": {
      "stage": "ready_for_receiving",
      "progress": {
        "rfqGenerated": true,
        "poCreated": true,
        "paymentReceived": true,
        "itemsReceived": false
      }
    }
  }
}
```

---

### 2. RFQ ENDPOINTS

#### Generate RFQ from Material Request
```
POST /api/workflow/material-requests/{id}/generate-rfq
Content-Type: application/json
Authorization: Bearer <token>

{
  "vendorId": "507f1f77bcf86cd799439016"
}
```

**Response:**
```json
{
  "success": true,
  "message": "RFQ generated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "rfqNumber": "RFQ-240322-4521",
    "materialRequestId": "507f1f77bcf86cd799439011",
    "vendor": {
      "vendorId": "507f1f77bcf86cd799439016",
      "vendorName": "TechSupply Ltd",
      "vendorEmail": "contact@techsupply.com",
      "vendorPhone": "+234123456789"
    },
    "status": "draft",
    "lineItems": [
      {
        "itemName": "Laptop",
        "quantity": 5,
        "quantityType": "units",
        "estimatedAmount": 500000
      }
    ],
    "quotations": [],
    "activities": [
      {
        "type": "created",
        "author": "john.doe",
        "description": "RFQ created from Material Request"
      }
    ]
  }
}
```

#### Get All RFQs
```
GET /api/workflow/rfqs?status=quotation_received&page=1&limit=20
Authorization: Bearer <token>
```

#### Get Single RFQ
```
GET /api/workflow/rfqs/{id}
Authorization: Bearer <token>
```

#### Add Quotation to RFQ
```
POST /api/workflow/rfqs/{id}/add-quotation
Content-Type: application/json
Authorization: Bearer <token>

{
  "quotedAmount": 500000,
  "quotedBy": "TechSupply Ltd",
  "notes": "Delivery in 7 days",
  "attachments": []
}
```

---

### 3. PURCHASE ORDER ENDPOINTS

#### Generate PO from RFQ
```
POST /api/workflow/rfqs/{id}/generate-po
Content-Type: application/json
Authorization: Bearer <token>

{
  "quotationIndex": 0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Purchase Order created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "poNumber": "PO-240322-8934",
    "vendor": "TechSupply Ltd",
    "totalAmount": 500000,
    "totalAmountNgn": 800000000,
    "paidAmount": 0,
    "status": "pending",
    "lineItems": [...],
    "linkedMaterialRequestId": "507f1f77bcf86cd799439011",
    "rfqReference": "RFQ-240322-4521"
  }
}
```

#### Get Payment History for PO
```
GET /api/workflow/pos/{id}/payments
Authorization: Bearer <token>
```

---

### 4. PAYMENT ENDPOINTS

#### Record Payment for PO
```
POST /api/workflow/pos/{id}/record-payment
Content-Type: application/json
Authorization: Bearer <token>

{
  "amount": 250000,
  "paymentType": "partial",
  "paymentMethod": "bank_transfer",
  "reference": {
    "transactionId": "TXN-001",
    "bankName": "First Bank"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment of 250000 NGN recorded successfully",
  "data": {
    "payment": {
      "_id": "507f1f77bcf86cd799439014",
      "paymentNumber": "PAY-240322-9283",
      "poId": "507f1f77bcf86cd799439013",
      "amount": 250000,
      "amountNgn": 250000,
      "percentage": 50,
      "paymentMethod": "bank_transfer",
      "status": "completed",
      "paymentDate": "2024-03-22T13:00:00Z"
    },
    "updatedPO": {
      "_id": "507f1f77bcf86cd799439013",
      "poNumber": "PO-240322-8934",
      "status": "partly_paid",
      "paidAmount": 250000,
      "paidPercentage": 50
    },
    "remainingBalance": 250000
  }
}
```

---

### 5. ITEM RECEIVING ENDPOINTS

#### Receive Items from PO into Inventory
```
POST /api/workflow/pos/{id}/receive-items
Content-Type: application/json
Authorization: Bearer <token>

{
  "receivedItems": [
    {
      "itemName": "Laptop",
      "quantityReceived": 5,
      "quantityType": "units",
      "condition": "excellent",
      "batchNumber": "BATCH-001",
      "expiryDate": "2025-03-22",
      "notes": "All items in perfect condition"
    }
  ],
  "storeLocation": {
    "locationId": "507f1f77bcf86cd799439017",
    "locationName": "Main Warehouse A"
  },
  "qualityInspection": {
    "inspectedBy": {
      "userId": "user123",
      "userName": "Jane Inspector"
    },
    "passed": true,
    "comments": "All items match specifications"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Items received successfully into inventory",
  "data": {
    "receipt": {
      "_id": "507f1f77bcf86cd799439015",
      "receiptNumber": "GRN-240322-1234",
      "poId": "507f1f77bcf86cd799439013",
      "grnNumber": "GRN-1711097200000",
      "status": "inspected",
      "receivedItems": [
        {
          "itemName": "Laptop",
          "quantityReceived": 5,
          "condition": "excellent"
        }
      ],
      "inventoryUpdated": true
    },
    "updatedPO": {
      "status": "received",
      "paidAmount": 250000
    },
    "itemsUpdated": 1
  }
}
```

#### Get All Receipts
```
GET /api/workflow/receipts?poId={id}&status=inspected&page=1&limit=20
Authorization: Bearer <token>
```

#### Get Single Receipt
```
GET /api/workflow/receipts/{id}
Authorization: Bearer <token>
```

---

## Workflow States & Transitions

### Material Request Status
- `draft` → `submitted` → `approved` → `fulfilled` / `rejected`

### RFQ Status
- `draft` → `sent` → `quotation_received` → `quotation_accepted` → `po_generated` / `cancelled`

### Purchase Order Status
- `pending` → `partly_paid` → `paid` → `received` → `closed`
- Can transition to `cancelled` from any state

### Payment Status
- `pending` → `completed` / `failed`

### Receipt Status
- `pending` → `received` → `inspected` → `accepted` / `rejected`

---

## Key Business Rules

1. **RFQ Generation**: Material Request must be in "approved" status
2. **PO Creation**: RFQ must have at least one received quotation
3. **Item Receiving**: PO must be in "partly_paid" or "paid" status (payment must be initiated)
4. **Payment Validation**: Payment amount cannot exceed remaining balance
5. **Inventory Update**: Items are automatically added to inventory when receipt is created

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Quotation index is required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "RFQ not found"
}
```

### 500 Server Error
```json
{
  "success": false,
  "error": "Failed to record payment: <specific error>"
}
```

---

## Example Complete Workflow

### Step 1: Generate RFQ
```bash
curl -X POST http://localhost:5000/api/workflow/material-requests/507f1f77bcf86cd799439011/generate-rfq \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vendorId": "507f1f77bcf86cd799439016"}'
```

### Step 2: Add Quotation
```bash
curl -X POST http://localhost:5000/api/workflow/rfqs/507f1f77bcf86cd799439012/add-quotation \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quotedAmount": 500000,
    "quotedBy": "TechSupply Ltd",
    "notes": "Price includes delivery"
  }'
```

### Step 3: Generate PO
```bash
curl -X POST http://localhost:5000/api/workflow/rfqs/507f1f77bcf86cd799439012/generate-po \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quotationIndex": 0}'
```

### Step 4: Record Payment (Partial)
```bash
curl -X POST http://localhost:5000/api/workflow/pos/507f1f77bcf86cd799439013/record-payment \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 250000,
    "paymentType": "partial",
    "paymentMethod": "bank_transfer"
  }'
```

### Step 5: Receive Items
```bash
curl -X POST http://localhost:5000/api/workflow/pos/507f1f77bcf86cd799439013/receive-items \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "receivedItems": [
      {
        "itemName": "Laptop",
        "quantityReceived": 5,
        "quantityType": "units",
        "condition": "excellent"
      }
    ],
    "storeLocation": {
      "locationName": "Main Warehouse A"
    }
  }'
```

### Step 6: Check Workflow Progress
```bash
curl -X GET http://localhost:5000/api/workflow/material-requests/507f1f77bcf86cd799439011/progress \
  -H "Authorization: Bearer TOKEN"
```

---

## Frontend Integration

### Using the MaterialRequestWorkflow Component

```jsx
import MaterialRequestWorkflow from '@/components/modules/MaterialRequestWorkflow';

export default function ProcurementDashboard() {
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  return (
    <div>
      {selectedRequestId && (
        <MaterialRequestWorkflow
          materialRequestId={selectedRequestId}
          onClose={() => setSelectedRequestId(null)}
          onSuccess={() => {
            // Refresh data
          }}
        />
      )}
    </div>
  );
}
```

---

## Database Models

### Models Involved
1. **MaterialRequest**: Original material request
2. **RFQ**: Request for Quotation with vendor quotes
3. **PurchaseOrder**: Generated from selected RFQ quote
4. **Payment**: Payment records linked to PO
5. **POReceipt**: Goods receipt with inventory integration
6. **InventoryItem**: Updated when receipt is created

### Audit Trail
All actions are logged in `AuditLog` with:
- Action type
- Actor (user info)
- Description
- Timestamp
- IP address

---

## Performance Considerations

1. **Pagination**: Use page/limit parameters for large datasets
2. **Indexes**: Indexed on materialRequestId, poId, rfqId for fast queries
3. **Caching**: Frontend can cache workflow progress with 5-second auto-refresh
4. **Batch Operations**: Platform supports processing multiple payments in single request

---

## Security

- All endpoints require authentication (`authMiddleware`)
- User information derived from JWT token (`req.user`)
- Audit logs capture all modifications
- IP address tracking for security compliance
- Activity logs for all workflow state changes

