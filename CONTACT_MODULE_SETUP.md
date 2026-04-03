# Contact Module Integration Guide

## Overview
The Contact module is a comprehensive contact management system that allows you to manage relationships with clients, vendors, employees, and partners. It includes full CRUD operations, advanced filtering, search capabilities, and bulk actions.

## Files Created

### Backend (Server)

#### 1. **Model: `server/models/Contact.js`**
Mongoose schema defining the contact structure with the following fields:
- **Core Information**: `contactId`, `firstName`, `lastName`, `email`, `phone`, `alternatePhone`
- **Professional**: `company`, `jobTitle`, `department`
- **Address**: `address`, `city`, `state`, `zipCode`, `country`
- **Online Presence**: `website`, `socialMedia` (LinkedIn, Twitter, Facebook)
- **Contact Management**: `category` (Client, Vendor, Employee, Partner, Other), `status` (Active, Inactive, Archived)
- **Preferences**: `preferredContactMethod` (Email, Phone, SMS, LinkedIn, Other)
- **Additional**: `tags`, `notes`, `lastContactDate`, `documents`, `createdBy`

**Auto-generated Fields:**
- Unique `contactId` with format: `CON-XXXXX`
- Timestamps: `createdAt`, `updatedAt`

**Indexes for Performance:**
- Combined index on `firstName + lastName`
- Single indexes on `email`, `phone`, `company`, `category`

#### 2. **Routes: `server/routes/contacts.routes.js`**
RESTful API endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/contacts` | Fetch all contacts with pagination, search, and filters |
| GET | `/api/contacts/:id` | Fetch a specific contact by ID |
| POST | `/api/contacts` | Create a new contact |
| PUT | `/api/contacts/:id` | Update an existing contact |
| DELETE | `/api/contacts/:id` | Delete a contact |
| GET | `/api/contacts/by-category/:category` | Fetch contacts by category |
| POST | `/api/contacts/bulk` | Bulk operations (delete, update) |

**Features:**
- Authentication required on all routes (via `authMiddleware`)
- Full-text search on name, email, phone, company
- Filter by category and status
- Pagination support (default: 20 per page, max: 100)
- Audit logging for all operations
- Input validation and duplicate email prevention

#### 3. **Integration: `server/index.js`**
Added contact routes to main Express app:
```javascript
const contactsRoutes = require('./routes/contacts.routes');
app.use('/api/contacts', contactsRoutes);
```

### Frontend (React)

#### **Component: `src/components/modules/Contact.jsx`**
Feature-rich React component with:

**Main Features:**
1. **List View** - Display all contacts with:
   - Responsive DataTable
   - Search across name, email, company
   - Filter by category and status
   - Configurable pagination (10, 20, 50, 100 per page)
   - Contact count and status badges

2. **Add Contact Modal** - Form for creating new contacts with:
   - Required field validation (First Name, Last Name, Email, Phone)
   - Professional information (Company, Job Title, Department)
   - Address fields (Street, City, State, Zip Code, Country)
   - Online presence (Website, LinkedIn, Twitter, Facebook)
   - Category and status selection
   - Preferred contact method selection
   - Notes section

3. **Edit Contact** - In-place editing with same form as add modal

4. **Contact Details View** - Comprehensive profile showing:
   - Full contact information
   - Status and category badges
   - Organized sections (Contact Info, Professional Info, Address, Social Media)
   - Edit and Delete buttons
   - Separate view for better UX

5. **Actions:**
   - Create new contact
   - View full details
   - Edit existing contact
   - Delete contact (with confirmation)
   - Search in real-time
   - Filter by category and status

**UI Features:**
- Dark mode support
- ModuleLoader animation on entry
- Toast notifications for success/error feedback
- Loading states
- Empty state handling
- Responsive design (mobile-friendly)
- Professional color scheme

### Database Setup

#### **Migration Script: `server/scripts/add-contact-module.js`**
Automatically adds the Contact module to the `modules` collection with:
- Module name and display name
- Component reference
- Description and icon
- Assigned roles (Admin, Manager, Employee)
- Feature metadata

## Setup Instructions

### 1. Install Dependencies (if needed)
```bash
npm install
```

### 2. Start MongoDB
Ensure your MongoDB instance is running and `MONGODB_URI` is set in `.env`.

### 3. Run Migration Script
Add the Contact module to your database:
```bash
node server/scripts/add-contact-module.js
```

**Expected Output:**
```
Connected to MongoDB
✓ Contacts module created successfully
  Module ID: [generated-id]
  Module Name: Contacts
  Component: Contact

Disconnected from MongoDB
```

### 4. Start Server and Client
```bash
# Terminal 1: Start backend server
npm run server

# Terminal 2: Start frontend (in parallel)
npm run dev
```

### 5. Access the Module
1. Navigate to your application
2. Login with your credentials
3. You should see "Contacts" in the module list
4. Click to open and start managing contacts

## API Usage Examples

### Create a Contact
```bash
curl -X POST http://localhost:3001/api/contacts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "company": "Acme Corp",
    "jobTitle": "Manager",
    "category": "Client",
    "status": "Active"
  }'
```

### Search Contacts
```bash
curl http://localhost:3001/api/contacts?search=john&category=Client&status=Active&limit=20&page=1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update a Contact
```bash
curl -X PUT http://localhost:3001/api/contacts/[contact-id] \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobTitle": "Senior Manager",
    "status": "Active"
  }'
```

### Delete a Contact
```bash
curl -X DELETE http://localhost:3001/api/contacts/[contact-id] \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Bulk Operations
```bash
curl -X POST http://localhost:3001/api/contacts/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update",
    "contactIds": ["id1", "id2", "id3"],
    "payload": {
      "status": "Inactive"
    }
  }'
```

## Data Categories

The Contact module supports the following categories:
- **Client** - Customers or business clients
- **Vendor** - Suppliers or service providers
- **Employee** - Company employees
- **Partner** - Business partners or affiliate contacts
- **Other** - Miscellaneous contacts

## Contact Statuses

- **Active** - Current, usable contact
- **Inactive** - Temporarily inactive
- **Archived** - Archived for record-keeping

## Preferred Contact Methods

- **Email** - Primary communication via email
- **Phone** - Primary communication via phone
- **SMS** - Primary communication via SMS
- **LinkedIn** - Primary communication via LinkedIn
- **Other** - Other communication methods

## Security Features

1. **Authentication Required** - All endpoints require valid authentication token
2. **Role-Based Access** - Initially available to Admin, Manager, and Employee roles
3. **Audit Logging** - All operations (Create, Read, Update, Delete) are logged
4. **Input Validation** - Server-side validation for all inputs
5. **Duplicate Prevention** - Cannot create contacts with duplicate email addresses

## Performance Optimizations

1. **Database Indexes** - Composite and single-field indexes for fast queries
2. **Pagination** - Limits data transfer with configurable page sizes
3. **Lean Queries** - MongoDB lean() for read-only operations
4. **Request Limits** - Maximum 100 records per page

## Future Enhancement Ideas

1. **Contact Groups** - Organize contacts into custom groups/segments
2. **Activity Timeline** - Track interactions and communications with contacts
3. **Email Integration** - Send emails directly from the contact module
4. **Import/Export** - CSV import and export functionality
5. **Duplicate Detection** - Automatic detection of similar/potential duplicate contacts
6. **Advanced Search** - Date range filters, complex queries
7. **Contact Merge** - Merge duplicate contacts
8. **Custom Fields** - Allow dynamic custom fields per organization
9. **Contact History** - Track changes to contact records over time
10. **Calendar Integration** - Schedule follow-ups and meetings

## Troubleshooting

### Module not appearing in list
1. Check if migration script was run: `node server/scripts/add-contact-module.js`
2. Verify MongoDB connection
3. Clear browser cache and reload

### API returns 401 Unauthorized
- Ensure authentication token is included in request headers
- Check if user role has access to Contacts module

### Cannot create contacts
- Check that required fields (firstName, lastName, email, phone) are provided
- Verify email is not already in use
- Check server logs for validation errors

### Search not working
- Ensure search query is properly encoded
- Try searching for specific fields (name, email, phone)
- Check MongoDB connection and indexes

## Support and Maintenance

For issues or feature requests, contact the development team. The module is actively maintained and welcomes feedback.

---

**Module Version:** 1.0.0
**Last Updated:** 2024
**Status:** Production Ready
