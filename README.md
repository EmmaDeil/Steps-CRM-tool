# 🚀 Steps CRM - Enterprise Resource Management System

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)

## 🎯 Overview

Steps CRM is a modern, enterprise-grade resource management system built with React and Express/MongoDB, featuring:
- 18+ Integrated modules
- Role-based access control (RBAC)
- Approval workflow engine with auto-approval rules
- Multi-currency support with global and per-request currency settings
- Real-time analytics dashboard
- Digital document signing
- Admin-managed SKU/Item catalog
- Database backup & audit logging
- Mobile-responsive design

## ✨ Features

### Business Modules
- ✅ **Accounting / Finance** — Journal entries, bank statement import, reconciliation, accounts payable
- ✅ **Inventory Management** — Stock tracking, item management
- ✅ **HR Management** — Employee records, profiles, job titles, departments, leave management, retirement
- ✅ **Payroll** — Payroll runs, advance requests, salary processing
- ✅ **Attendance** — Check-in/check-out tracking
- ✅ **Facility Maintenance** — Maintenance tickets and tracking
- ✅ **Material Requests** — Procurement requests with admin-managed SKU/item catalog, per-request currency, @mention comments, activity tracking
- ✅ **Purchase Orders** — Order management and vendor integration
- ✅ **Vendor Management** — Vendor records, categories, documents
- ✅ **Budget Management** — Budget categories and tracking
- ✅ **Document Signing (DocSign)** — Digital signature requests, templates, signing workflow
- ✅ **Analytics** — Dashboard charts, stats, and insights
- ✅ **Security Logs** — Access and activity monitoring
- ✅ **Physical Security** — Physical access control and monitoring
- ✅ **Policy Management** — Company policies and compliance
- ✅ **Admin Controls** — User management, role configuration, system settings, approval flow settings, SKU/item management, audit logs, database backup

### Platform Features
- ✅ **Authentication** — JWT-based auth with login, signup, forgot password
- ✅ **Approval Workflow** — Multi-step approval chains with auto-approval rules
- ✅ **Multi-Currency** — Global currency setting + per-request currency override
- ✅ **@Mention System** — Tag users in comments with @ mentions
- ✅ **Activity Tracking** — Full activity log on material requests (created, comments, approvals, rejections, status changes)
- ✅ **Breadcrumb Navigation** — Consistent navigation across all module sub-views
- ✅ **Notification Center** — Real-time notifications with badges
- ✅ **Error Boundaries** — Graceful error handling
- ✅ **Lazy Loading** — Code splitting for optimal performance
- ✅ **Mobile Responsive** — Works on all devices

## 🛠️ Tech Stack

### Frontend
- **React 19** with Vite
- **React Router 6** — Client-side routing
- **Tailwind CSS** — Utility-first styling
- **Recharts** — Data visualization
- **Axios** — HTTP client
- **React Hot Toast** — Notifications
- **Font Awesome** — Icons

### Backend
- **Node.js + Express** — REST API server
- **MongoDB + Mongoose** — Database and ODM
- **JWT** — Authentication tokens
- **Multer** — File uploads (avatars, vendor docs)

### Development Tools
- **ESLint** — Code linting
- **PostCSS** — CSS processing
- **Git** — Version control

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- MongoDB instance (local or Atlas)

### Steps

1. **Clone the repository**
```bash
git clone https://github.com/EmmaDeil/Steps-CRM-tool.git
cd Steps-CRM-tool
```

2. **Install frontend dependencies**
```bash
npm install
```

3. **Install server dependencies**
```bash
cd server
npm install
cd ..
```

4. **Set up environment variables**

Create `.env` in the root:
```env
VITE_API_BASE_URL=http://localhost:4000
```

Create `.env` in `server/`:
```env
MONGODB_URI=mongodb://localhost:27017/steps-crm
JWT_SECRET=your_jwt_secret
PORT=4000
```

5. **Start the server**
```bash
cd server
npm run start
```

6. **Start the frontend** (in a new terminal)
```bash
npm run dev
```

7. **Open browser** — Navigate to `http://localhost:5173`

## ⚙️ Configuration

### Role Permissions

| Role    | Access Level | Description |
|---------|-------------|-------------|
| Staff   | Basic | Standard module access |
| Manager | Extended | Staff access + approval capabilities |
| Admin   | Full | All modules + Admin Controls, user management, system settings |

### Admin Controls

Admins can manage:
- **Users** — Create, edit, activate/deactivate users, assign roles
- **Roles** — Configure role permissions
- **Approval Flow Settings** — Set up approval rules and auto-approval thresholds
- **System Settings** — Global currency, company info, system preferences
- **Item / SKU Management** — Manage catalog of items available in material requests
- **Audit Logs** — View all system activity with filtering
- **Database Backup** — Export full database as JSON

## 🏗️ Architecture

### Project Structure
```
StepsProject/
├── public/                     # Static assets
├── server/
│   ├── index.js               # Express entry point & routes
│   ├── api.js                 # Vercel serverless adapter
│   ├── seed.js                # Database seeder
│   ├── middleware/
│   │   ├── auth.js            # JWT auth middleware
│   │   ├── securityAuth.js    # Security middleware
│   │   └── validation.js      # Input validation
│   ├── models/                # Mongoose models (33 models)
│   │   ├── User.js, Employee.js, Role.js, Department.js
│   │   ├── MaterialRequest.js, PurchaseOrder.js, InventoryItem.js
│   │   ├── ApprovalRule.js, AuditLog.js, SkuItem.js
│   │   └── ... (and more)
│   ├── routes/
│   │   ├── admin.routes.js    # Admin, audit logs, backup
│   │   ├── hr.routes.js       # HR & employee management
│   │   ├── payroll.routes.js  # Payroll processing
│   │   ├── budget.routes.js   # Budget management
│   │   ├── procurement.routes.js  # Material requests, POs, vendors
│   │   ├── approvalRule.routes.js # Approval workflow rules
│   │   ├── physicalSecurity.routes.js
│   │   └── maintenance.routes.js
│   ├── uploads/               # File uploads (avatars, vendor docs)
│   └── utils/
│       └── emailService.js    # Email notifications
├── src/
│   ├── App.jsx                # Root component with routing
│   ├── main.jsx               # Entry point
│   ├── index.css              # Global styles (Tailwind)
│   ├── components/
│   │   ├── Breadcrumb.jsx     # Navigation breadcrumbs
│   │   ├── Navbar.jsx         # Top navigation bar
│   │   ├── Footer.jsx         # Page footer
│   │   ├── Pagination.jsx     # Reusable pagination
│   │   ├── NotificationCenter.jsx
│   │   ├── PrivateRoute.jsx   # Auth route guard
│   │   ├── Profile.jsx        # User profile
│   │   ├── auth/              # Login, Signup, ForgotPassword
│   │   ├── common/            # DataTable and shared components
│   │   └── modules/           # All business module components
│   │       ├── Admin.jsx, Analytics.jsx, Attendance.jsx
│   │       ├── MaterialRequests.jsx, PurchaseOrders.jsx
│   │       ├── HRM.jsx, Payroll.jsx, Finance.jsx
│   │       ├── DocSign.jsx, DocSignRequest.jsx
│   │       ├── VendorManagement.jsx, Inventory.jsx
│   │       ├── SkuItemManager.jsx, ApprovalSettings.jsx
│   │       ├── SystemSettings.jsx, SecuritySettings.jsx
│   │       └── ... (and more)
│   ├── context/               # React Context providers
│   │   ├── AuthContext.jsx    # Auth state
│   │   ├── AppContext.jsx     # App-wide state
│   │   └── useDepartments.js  # Department hook
│   ├── services/
│   │   ├── api.js             # Axios API service
│   │   ├── currency.js        # Currency formatting
│   │   └── websocket.js       # WebSocket service
│   ├── home/
│   │   └── Home.jsx           # Home/dashboard page
│   └── utils/
│       ├── validation.js      # Client-side validation
│       └── fileUploadHelper.js
├── package.json
├── vite.config.js
├── tailwind.config.js
├── vercel.json                # Vercel deployment config
└── eslint.config.js
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` — User login
- `POST /api/auth/signup` — User registration
- `POST /api/auth/forgot-password` — Password reset

### Users
- `GET /api/users` — List users
- `PUT /api/users/:id` — Update user
- `POST /api/users/:id/avatar` — Upload avatar

### Material Requests
- `GET /api/material-requests` — List all requests
- `POST /api/material-requests` — Create request (auto-generates ID, creates initial activity)
- `PUT /api/material-requests/:id` — Update request
- `PUT /api/material-requests/:id/approve` — Approve request
- `PUT /api/material-requests/:id/reject` — Reject request
- `POST /api/material-requests/:id/comments` — Add comment with @mentions

### SKU / Item Catalog
- `GET /api/sku-items` — List items (`?activeOnly=true` to filter)
- `POST /api/sku-items` — Create item
- `PUT /api/sku-items/:id` — Update item
- `DELETE /api/sku-items/:id` — Delete item

### Purchase Orders
- `GET /api/purchase-orders` — List purchase orders
- `POST /api/purchase-orders` — Create purchase order

### Vendors
- `GET /api/vendors` — List vendors
- `POST /api/vendors` — Create vendor
- `PUT /api/vendors/:id` — Update vendor
- `DELETE /api/vendors/:id` — Delete vendor

### Inventory
- `GET /api/inventory` — List inventory items
- `POST /api/inventory` — Create item
- `PUT /api/inventory/:id` — Update item
- `DELETE /api/inventory/:id` — Delete item

### HR
- `GET /api/hr/employees` — List employees
- `POST /api/hr/employees` — Create employee
- `PUT /api/hr/employees/:id` — Update employee

### Payroll
- `GET /api/payroll/runs` — List payroll runs
- `POST /api/payroll/runs` — Create payroll run

### Budget
- `GET /api/budget/categories` — List budget categories
- `POST /api/budget/categories` — Create category

### Approval Rules
- `GET /api/approval-rules` — List approval rules
- `POST /api/approval-rules` — Create rule
- `PUT /api/approval-rules/:id` — Update rule
- `DELETE /api/approval-rules/:id` — Delete rule

### Admin
- `GET /api/admin/logs` — Audit logs (with pagination and filtering)
- `GET /api/admin/roles` — List roles
- `PUT /api/admin/roles/:id` — Update role permissions
- `GET /api/admin/backup` — Download full database backup as JSON
- `GET /api/admin/stats` — System statistics

### Attendance
- `GET /api/attendance` — List records
- `POST /api/attendance` — Create record

### Facility Maintenance
- `GET /api/maintenance/tickets` — List tickets
- `POST /api/maintenance/tickets` — Create ticket

### Analytics
- `GET /api/analytics/reports` — Aggregated analytics

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

Output: `dist/` directory

### Deploy to Vercel

The project includes a `vercel.json` configuration for seamless deployment:

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Deploy**
```bash
vercel --prod
```

3. **Environment Variables** — Set in Vercel dashboard:
   - `VITE_API_BASE_URL`
   - `MONGODB_URI`
   - `JWT_SECRET`

## 🔒 Security

- ✅ JWT authentication with token expiry
- ✅ Role-based access control (RBAC)
- ✅ Password hashing (bcrypt)
- ✅ Input validation middleware
- ✅ XSS protection (React built-in)
- ✅ Audit logging for all admin actions
- ✅ HTTPS enforcement in production
- ✅ File upload validation (type + size limits)

## 📝 Scripts

```bash
# Frontend
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint

# Backend
cd server
npm run start    # Start Express server
node seed.js     # Seed database with initial data
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

MIT License - See LICENSE file for details

## 👥 Authors

- **Emmanuel Clef** - [EmmaDeil](https://github.com/EmmaDeil)

## 📞 Support

- **Issues:** https://github.com/EmmaDeil/Steps-CRM-tool/issues
- **Discussions:** https://github.com/EmmaDeil/Steps-CRM-tool/discussions

---

**Built with ❤️ using React 19, Express & MongoDB**

*Last Updated: March 7, 2026*
