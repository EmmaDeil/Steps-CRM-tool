# Complete Material Request to Payment Workflow

## Overview
This document explains the end-to-end workflow from material request submission to payment processing.

## Workflow Steps

### 1. Material Request Submission
**Location:** Material Requests Module

- User fills out a material request form with:
  - Request type (e.g., Office Supplies, Equipment)
  - Approver
  - Department
  - Line items (Item name, quantity, quantity type, amount, description)
  - Optional message with @mentions
  - Optional file attachments

- On submission:
  - Request is saved to database with "pending" status
  - **Email is automatically sent to the approver** with:
    - Request details
    - Line items table
    - Approval link that routes to the approval screen

### 2. Approval Process
**Location:** Material Requests Module (via email link)

- Approver clicks the link in email
- Link format: `http://yoursite.com/material-requests?action=approve&id={requestId}`
- Approval modal opens automatically showing:
  - All request details
  - Line items
  - Message and attachments

**Approver Actions:**
- **Approve:** 
  - Select a vendor from dropdown
  - Click "Approve & Create PO"
  - System automatically:
    - Updates request status to "approved"
    - Creates a new Purchase Order with:
      - Auto-generated PO number (PO-000001, PO-000002, etc.)
      - Status: "draft"
      - All line items copied from material request
      - Selected vendor
      - Link to original material request
    - PO appears in Purchase Orders list for procurement team

- **Reject:**
  - Enter rejection reason
  - Click "Reject Request"
  - Request status updated to "rejected"
  - Reason stored in database

### 3. Procurement Team Review
**Location:** Purchase Orders Module

- Procurement team sees all POs with "draft" status in the PO list
- Click "Review" button on any draft PO
- Review modal opens showing:
  - PO number (read-only)
  - Requester and Approver (read-only)
  - Vendor (editable dropdown)
  - Order date (read-only)
  - Delivery date (editable)
  - Line items table (fully editable)

**Procurement Team Actions:**
- Can make corrections:
  - Change vendor
  - Update delivery date
  - Edit line items (add, remove, modify quantities, prices)
  - Add review notes
- Click "Submit to Finance"
- System automatically:
  - Updates PO with changes
  - Recalculates total amount
  - Changes status from "draft" to "payment_pending"
  - PO appears in Finance module

### 4. Payment Processing
**Location:** Finance Module

- Finance team sees "Pending Payments" section
- Table shows all POs with "payment_pending" status
- Each row displays:
  - PO Number
  - Vendor
  - Requester
  - Order Date
  - Total Amount (₦)
  - Review Notes

**Finance Actions:**
- Click "Mark as Paid" button
- Confirm action
- System automatically:
  - Updates PO status to "paid"
  - Records payment date
  - Removes from pending payments list

## Status Flow

### Material Request Statuses:
1. `pending` - Awaiting approval
2. `approved` - Approved and PO created
3. `rejected` - Rejected by approver

### Purchase Order Statuses:
1. `draft` - Auto-created from approved request, awaiting procurement team review
2. `payment_pending` - Reviewed by procurement team and sent to finance
3. `paid` - Payment completed by finance
4. `received` - Items received (manual update)
5. `cancelled` - Cancelled order

## Email Configuration

### Development Mode (Current)
- Emails are logged to console instead of being sent
- Check server terminal to see email content
- Useful for testing without actual email sending

### Production Mode
To enable actual email sending:

1. Set environment variable:
   ```bash
   NODE_ENV=production
   ```

2. Configure email credentials in `server/.env`:
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   FRONTEND_URL=http://localhost:5173
   ```

3. For Gmail, create an "App Password":
   - Go to Google Account settings
   - Security → 2-Step Verification
   - App passwords → Generate new
   - Use the generated password in .env

## API Endpoints

### Material Requests
- `POST /api/material-requests` - Create new request (sends approval email)
- `POST /api/material-requests/:id/approve` - Approve request (creates PO, sends review email)
- `POST /api/material-requests/:id/reject` - Reject request

### Purchase Orders
- `GET /api/purchase-orders` - Get all POs
- `POST /api/purchase-orders` - Create new PO (manual)
- `POST /api/purchase-orders/:id/review` - Submit reviewed PO (changes to payment_pending)
- `GET /api/purchase-orders/pending-payment` - Get POs awaiting payment
- `POST /api/purchase-orders/:id/mark-paid` - Mark PO as paid

### Vendors
- `GET /api/vendors` - Get list of vendors for dropdowns

## Features

### Email Notifications
- ✅ Professional HTML email templates
- ✅ Direct links to approval screens
- ✅ Detailed request information
- ✅ Line items table in email
- ✅ Dev/production mode switching
- ❌ No email to requester (PO created directly in list)

### Approval Screen
- ✅ Full request details display
- ✅ Line items table
- ✅ Vendor selection dropdown
- ✅ Approve/reject actions
- ✅ Rejection reason capture
- ✅ Automatic PO creation on approval

### Procurement Review
- ✅ Review button on draft POs
- ✅ Editable line items
- ✅ Add/remove items
- ✅ Auto-calculated totals
- ✅ Vendor change option
- ✅ Review notes field
- ✅ Submit to finance

### Finance Module
- ✅ Pending payments section
- ✅ Payment details table
- ✅ Mark as paid action
- ✅ Payment date recording
- ✅ Real-time updates

## Testing the Workflow

### Complete Test Flow:

1. **Create Material Request:**
   - Go to Material Requests module
   - Click "New Request"
   - Fill in details and line items
   - Submit
   - Check server console for approval email

2. **Approve Request:**
   - Copy the approval link from console
   - Open in browser (or manually navigate with query params)
   - Select vendor
   - Click "Approve & Create PO"
   - PO is created with "draft" status

3. **Review Purchase Order (Procurement Team):**
   - Go to Purchase Orders module
   - Find the PO with "draft" status
   - Click "Review" button
   - Edit line items if needed
   - Add review notes
   - Click "Submit to Finance"

4. **Process Payment:**
   - Go to Finance module
   - See PO in "Pending Payments"
   - Click "Mark as Paid"
   - Confirm action
   - PO status changes to "paid"

5. **Mark as Received:**
   - Go back to Purchase Orders
   - Find the paid PO
   - Click "Mark Received"
   - PO status changes to "received"

## Troubleshooting

### Email not sending in production:
- Check EMAIL_USER and EMAIL_PASSWORD in .env
- Ensure NODE_ENV=production is set
- For Gmail, use App Password not regular password
- Check firewall allows port 587

### Approval/Review screen not opening:
- Check URL parameters: ?action=approve&id={requestId}
- Ensure request/PO exists in database
- Check browser console for errors

### PO not appearing in Finance:
- Verify status is "payment_pending"
- Check Finance is fetching from correct endpoint
- Refresh the page

### Line item totals not calculating:
- Ensure quantity and unitPrice are numbers
- Check for JavaScript errors in console

## Future Enhancements

### Possible additions:
- Real-time notifications (WebSocket/Pusher)
- Email to Finance when PO submitted
- SMS notifications
- PDF generation for POs
- Digital signatures
- Audit trail/history
- File attachment storage on server
- Advanced search and filtering
- Dashboard analytics
- Mobile app
