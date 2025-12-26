# API Reference - Security Settings

## Authentication
All endpoints require authentication via Clerk or your auth system.

---

## Security Settings Endpoints

### Get Security Settings
```http
GET /api/security/settings
```

**Response:**
```json
{
  "passwordPolicy": {
    "enabled": true,
    "minLength": 12,
    "specialChars": true,
    "expiry": 90
  },
  "mfaSettings": {
    "enabled": true,
    "method": "Authenticator App",
    "enforcement": "All Users",
    "gracePeriod": "None"
  },
  "sessionControl": {
    "idleTimeout": 30,
    "concurrentSessions": 3,
    "activeUsers": 0
  }
}
```

### Update Security Settings
```http
PATCH /api/security/settings
Content-Type: application/json
```

**Request Body:**
```json
{
  "passwordPolicy": {
    "enabled": true,
    "minLength": 16,
    "specialChars": true,
    "expiry": 60
  }
}
```

**Response:**
```json
{
  "message": "Settings updated successfully",
  "settings": { /* updated settings */ }
}
```

### Get Active Users Count
```http
GET /api/security/active-users
```

**Response:**
```json
{
  "count": 42
}
```

---

## Audit Log Endpoints

### Get Audit Logs (Paginated)
```http
GET /api/audit-logs?page=1&limit=10&action=Login&status=Failed
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `action` (string): Filter by action type
- `status` (string): Filter by status (Success/Failed)
- `search` (string): Search in user name/email
- `startDate` (ISO date): Filter logs after this date
- `endDate` (ISO date): Filter logs before this date

**Response:**
```json
{
  "logs": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "timestamp": "2025-12-26T10:30:00.000Z",
      "action": "Login",
      "description": "User logged in successfully",
      "status": "Success",
      "actor": {
        "userName": "John Doe",
        "userEmail": "john@example.com",
        "initials": "JD"
      },
      "ipAddress": "192.168.1.100",
      "actionColor": "blue"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "pages": 15
  }
}
```

### Create Audit Log
```http
POST /api/audit-logs
Content-Type: application/json
```

**Request Body:**
```json
{
  "action": "Config Update",
  "description": "Updated password policy",
  "status": "Success",
  "actor": {
    "userName": "Admin User",
    "userEmail": "admin@example.com",
    "initials": "AU"
  },
  "ipAddress": "192.168.1.1",
  "actionColor": "purple"
}
```

**Response:**
```json
{
  "log": { /* created log */ }
}
```

### Export All Logs (CSV)
```http
GET /api/audit-logs/export?action=Login&status=Failed
```

**Query Parameters:**
- Same as GET /api/audit-logs (except page/limit)

**Response:**
- Content-Type: text/csv
- Downloads file: audit-logs.csv

### Export Selected Logs (CSV)
```http
POST /api/audit-logs/export
Content-Type: application/json
```

**Request Body:**
```json
{
  "logIds": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012"
  ]
}
```

**Response:**
- Content-Type: text/csv
- Downloads file: selected-audit-logs.csv

---

## Notification Rules Endpoints

### Get All Notification Rules
```http
GET /api/security/notification-rules
```

**Response:**
```json
{
  "rules": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Failed Login Alerts",
      "event": "Login",
      "condition": "Failed",
      "recipient": "admin@example.com",
      "enabled": true,
      "createdAt": "2025-12-26T10:00:00.000Z"
    }
  ]
}
```

### Create Notification Rule
```http
POST /api/security/notification-rules
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Failed Login Alerts",
  "event": "Login",
  "condition": "Failed",
  "recipient": "admin@example.com",
  "enabled": true
}
```

**Response:**
```json
{
  "rule": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Failed Login Alerts",
    "event": "Login",
    "condition": "Failed",
    "recipient": "admin@example.com",
    "enabled": true,
    "createdAt": "2025-12-26T10:00:00.000Z"
  }
}
```

### Delete Notification Rule
```http
DELETE /api/security/notification-rules/:ruleId
```

**Response:**
```json
{
  "message": "Notification rule deleted"
}
```

---

## Settings History Endpoint

### Get Settings Change History
```http
GET /api/security/settings-history
```

**Response:**
```json
{
  "history": [
    {
      "setting": "Password Policy",
      "change": "Updated password policy settings",
      "timestamp": "2025-12-26T10:30:00.000Z",
      "changedBy": {
        "userName": "Admin User",
        "userEmail": "admin@example.com",
        "initials": "AU"
      }
    }
  ]
}
```

**Notes:**
- Returns last 50 entries
- Sorted by timestamp (descending)
- Automatically created via pre-save middleware

---

## Emergency Actions

### Panic Logout (Emergency)
```http
POST /api/security/panic-logout
Content-Type: application/json
```

**Request Body:**
```json
{
  "userName": "Admin User",
  "userEmail": "admin@example.com",
  "initials": "AU"
}
```

**Response:**
```json
{
  "message": "All users have been logged out",
  "count": 0
}
```

**Side Effects:**
- Creates audit log entry
- In production: Clears all session tokens
- In production: Forces logout for all users

---

## Event Types Reference

### Action Types
- `Login` - User authentication attempts
- `Config Update` - Security settings changes
- `Export` - Data export operations
- `Access Denied` - Unauthorized access attempts
- `Password Change` - Password modifications

### Status Types
- `Success` - Operation completed successfully
- `Failed` - Operation failed or was denied

### Condition Types (for Notification Rules)
- `Success` - Trigger on successful events
- `Failed` - Trigger on failed events
- `Any` - Trigger on any event

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "message": "Missing required fields"
}
```

### 404 Not Found
```json
{
  "message": "Settings not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Failed to fetch audit logs"
}
```

---

## Rate Limiting

All endpoints are subject to rate limiting:
- **General**: 100 requests per 15 minutes per IP
- **Auth endpoints**: 5 requests per 15 minutes per IP

Rate limit headers are included in responses:
```
RateLimit-Limit: 100
RateLimit-Remaining: 99
RateLimit-Reset: 1640532000
```

---

## Security Headers

All responses include security headers via Helmet.js:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

---

## CORS Configuration

CORS is enabled for:
- Origin: `http://localhost:5173` (development)
- Or: Custom `FRONTEND_URL` from environment variable
- Credentials: true
- Methods: GET, POST, PATCH, DELETE

---

## MongoDB Query Sanitization

All inputs are sanitized using `express-mongo-sanitize` to prevent:
- NoSQL injection attacks
- Operator injection ($where, $ne, etc.)

---

*Last Updated: December 26, 2025*
*Version: 1.0.0*
