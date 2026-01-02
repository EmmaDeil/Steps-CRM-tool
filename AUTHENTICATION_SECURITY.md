# Authentication & Security Enhancements

## Overview
This document outlines the authentication and security enhancements implemented in the Steps Project application.

## Key Security Features

### 1. **Enhanced JWT Token Security**
- **Token Type Verification**: Tokens now include a `type` field (access/refresh) to prevent token misuse
- **Role-Based Token Claims**: User role is embedded in JWT and verified on each request
- **Token Expiration**: 
  - Access tokens: 7 days
  - Refresh tokens: 30 days (prepared for future implementation)
- **Issued At (iat) Timestamp**: Tracks when token was created

### 2. **Session Management**
- **Remember Me Feature**: Users can choose to stay logged in longer
- **Activity Tracking**: User activity is tracked via mouse, keyboard, scroll, and touch events
- **Last Activity Timestamp**: Stored in localStorage for session monitoring
- **Manual Logout Only**: System will NOT auto-logout users unless they explicitly click logout button

### 3. **No Auto-Logout on Errors**
- **Network Error Handling**: Network failures don't trigger logout
- **401 Error Handling**: Shows warning message but doesn't force logout
- **Session Expired Notice**: Clear messaging when token expires, but user stays in control
- **Offline Resilience**: App continues to work with cached data when offline

### 4. **Backend Security Middleware**

#### Enhanced authMiddleware:
```javascript
- Verifies token signature and expiration
- Checks token type (access vs refresh)
- Validates user still exists and is active
- Verifies role hasn't changed
- Attaches user and token payload to request
```

#### Role-Based Access Control (RBAC):
```javascript
requireRole('Admin', 'HR Manager') // Restrict routes by role
```

### 5. **Logout Confirmation**
- When "Remember Me" is enabled, logout shows confirmation dialog
- Prevents accidental logouts
- Can be skipped with `forceLogout()` for security reasons

### 6. **Frontend Auth Context Features**
```javascript
- login(email, password, rememberMe) // Enhanced login with remember me
- logout(skipConfirmation) // Optional confirmation
- forceLogout() // Emergency logout without confirmation
- checkAuth() // Verify token validity
- updateActivity() // Track user activity
- sessionConfig // Access to session settings
```

## Security Best Practices Implemented

### 1. **Token Storage**
- ✅ Tokens stored in localStorage (client-side)
- ✅ Tokens sent via Authorization header (Bearer scheme)
- ⚠️ **Note**: For maximum security, consider httpOnly cookies (requires backend changes)

### 2. **Password Security**
- ✅ Passwords hashed with bcrypt before storage
- ✅ Password comparison uses bcrypt.compare()
- ✅ Passwords never sent in responses
- ✅ Password field excluded from user queries by default

### 3. **API Security**
- ✅ Rate limiting: 100 req/15min (general), 5 req/15min (auth)
- ✅ Helmet.js for security headers
- ✅ MongoDB sanitization to prevent injection
- ✅ CORS configured with specific origin
- ✅ Request timeouts (60s) to prevent hanging connections

### 4. **Error Handling**
- ✅ Generic error messages for failed auth (no information leakage)
- ✅ Detailed logging server-side for debugging
- ✅ User-friendly error messages client-side
- ✅ Toast notifications for auth errors with deduplication

## Logout Behavior

### When Logout Occurs:
1. **Manual Logout Button Click**: User explicitly clicks logout in navbar
2. **Force Logout**: Called programmatically for security reasons (e.g., account suspended)

### What Happens on Logout:
1. Confirmation dialog (if Remember Me is enabled)
2. Backend notification via `/api/auth/logout`
3. Clear authToken from localStorage
4. Clear rememberMe preference
5. Clear lastActivity timestamp
6. Reset user state to null
7. Redirect to login page

### When Logout DOES NOT Occur:
- ❌ 401 errors
- ❌ Network failures
- ❌ Token expiration (shows warning, no auto-logout)
- ❌ Page refresh
- ❌ Tab close/reopen
- ❌ API errors

## Token Lifecycle

### 1. **Login**
```
User enters credentials
→ Backend validates
→ Generates access token with userId + role
→ Returns token + user data
→ Frontend stores token in localStorage
→ Frontend stores rememberMe preference
→ Token automatically attached to all API requests
```

### 2. **Token Verification**
```
Every protected API request
→ Frontend sends token in Authorization header
→ Backend authMiddleware verifies:
   - Token signature valid?
   - Token not expired?
   - Token type is 'access'?
   - User still exists?
   - User account still active?
   - Role matches token?
→ If all pass: request proceeds
→ If any fail: 401 error returned
```

### 3. **Token Expiration**
```
Token expires after 7 days
→ User makes API request
→ Backend returns 401 with expired: true
→ Frontend shows "Session expired" toast
→ User remains logged in locally
→ User can either:
   - Logout and login again
   - Continue using cached data
   - Wait for admin action
```

## Environment Variables

Add these to your `.env` file for enhanced security:

```env
# JWT Secrets (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars

# Frontend URL for CORS
FRONTEND_URL=http://localhost:5173

# MongoDB Connection
MONGODB_URI=your-mongodb-connection-string

# Server Port
PORT=4000
```

## Future Security Enhancements (Recommended)

### 1. **Refresh Token Implementation**
- Implement refresh token rotation
- Short-lived access tokens (15-30 min)
- Long-lived refresh tokens (30 days)
- Auto-refresh before expiration

### 2. **httpOnly Cookies**
- Store tokens in httpOnly cookies instead of localStorage
- Prevents XSS attacks from accessing tokens
- Requires CSRF protection

### 3. **Two-Factor Authentication (2FA)**
- TOTP (Time-based One-Time Password)
- SMS verification
- Email verification codes

### 4. **Account Security Features**
- Failed login attempt tracking
- Account lockout after X failed attempts
- Suspicious activity detection
- Login history/session management
- Device fingerprinting

### 5. **Password Policies**
- Minimum length requirements (8+ chars)
- Complexity requirements (upper, lower, number, special)
- Password strength meter
- Password history (prevent reuse)
- Periodic password rotation reminders

### 6. **Session Security**
- Concurrent session limiting
- Remote session termination
- Session timeout warnings
- Automatic session extension on activity

### 7. **Audit Logging**
- Log all authentication attempts
- Log all security-related events
- Track IP addresses and user agents
- Alert on suspicious patterns

## Testing Authentication

### Test Scenarios:

1. **✅ Login with valid credentials**
   - Should receive token and user data
   - Should be redirected to /home

2. **✅ Login with invalid credentials**
   - Should show error message
   - Should NOT auto-logout existing session

3. **✅ Remember Me checkbox**
   - Should store preference in localStorage
   - Should show confirmation on logout

4. **✅ Token expiration**
   - Should show "session expired" message
   - Should NOT force logout
   - User can continue browsing cached data

5. **✅ Network failure during auth check**
   - Should NOT logout user
   - Should retry on next request

6. **✅ Manual logout**
   - Should clear all auth data
   - Should redirect to login
   - Should notify backend

7. **✅ Page refresh**
   - Should maintain logged-in state
   - Should verify token with backend
   - Should restore user session

8. **✅ Protected routes**
   - Should redirect to login if not authenticated
   - Should allow access if authenticated
   - Should show loading state during auth check

## Monitoring & Debugging

### Frontend Console Logs:
- ✅ Auth check results
- ✅ Token verification status
- ✅ Session configuration
- ✅ Activity tracking

### Backend Console Logs:
- ✅ Login attempts (with outcome)
- ✅ Token verification failures
- ✅ Unauthorized access attempts
- ✅ Rate limit violations

### Common Issues:

**Issue**: "Session expired" message appears immediately after login
**Solution**: Check system clock synchronization, verify JWT_SECRET matches between instances

**Issue**: User gets logged out randomly
**Solution**: This should NOT happen anymore. Check browser console for errors.

**Issue**: Token not being sent with requests
**Solution**: Verify token exists in localStorage, check API interceptor configuration

**Issue**: CORS errors
**Solution**: Verify FRONTEND_URL in server .env matches your frontend URL exactly

## Security Checklist

- [x] Passwords hashed with bcrypt
- [x] JWT tokens with expiration
- [x] Role-based access control
- [x] Rate limiting on auth endpoints
- [x] MongoDB injection prevention
- [x] CORS configured properly
- [x] Helmet security headers
- [x] Request timeouts
- [x] No auto-logout on errors
- [x] Remember me functionality
- [x] Logout confirmation
- [x] Activity tracking
- [x] Session persistence
- [ ] Refresh token rotation (TODO)
- [ ] httpOnly cookies (TODO)
- [ ] Two-factor authentication (TODO)
- [ ] Password strength requirements (TODO)
- [ ] Account lockout policy (TODO)
- [ ] Security audit logging (TODO)

## Support

For security concerns or questions, please:
1. Check this documentation first
2. Review console logs (browser & server)
3. Verify environment variables are set correctly
4. Test in incognito/private mode to rule out cache issues
5. Contact the development team with specific error messages
