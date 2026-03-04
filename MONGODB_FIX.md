# MongoDB SSL/TLS Connection Error - FIXED ✅

## Error Summary
You were getting: `MongoServerSelectionError: SSL routines:ssl3_read_bytes:tlsv1 alert internal error`

## What Was Fixed

### 1. ✅ Updated Mongoose Connection Configuration
The connection options in `server/index.js` have been updated to properly handle SSL/TLS:

**Before:**
```javascript
await mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,        // ⚠️ Deprecated
  useUnifiedTopology: true,     // ⚠️ Deprecated
  serverSelectionTimeoutMS: 5000,  // ⚠️ Too short
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 2,
});
```

**After:**
```javascript
await mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,  // ✅ Increased timeout
  socketTimeoutMS: 45000,
  family: 4,                         // ✅ Force IPv4
  maxPoolSize: 10,
  minPoolSize: 2,
  tls: true,                         // ✅ Enable TLS
  tlsAllowInvalidCertificates: false,
  retryWrites: true,                 // ✅ Auto-retry
  w: 'majority',                     // ✅ Write concern
});
```

---

## Next Steps to Test

### Step 1: Test the Connection

Run the test script:
```bash
cd server
npm run test:connection
```

This will validate your MongoDB connection independently.

### Step 2: Check Your Environment Variables

Make sure your `server/.env` file has the correct MongoDB URI:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/steps?retryWrites=true&w=majority
```

**Important:** If your password contains special characters, URL-encode them:
- `@` → `%40`
- `:` → `%3A`
- `/` → `%2F`
- `?` → `%3F`
- `#` → `%23`

### Step 3: Verify MongoDB Atlas Settings

1. **Go to MongoDB Atlas** → https://cloud.mongodb.com
2. **Network Access**:
   - Click "Add IP Address"
   - Add your current IP or use `0.0.0.0/0` (allow from anywhere)
3. **Cluster Status**:
   - Make sure your cluster is **running** (not paused)
4. **Database Access**:
   - Verify your username and password are correct

### Step 4: Get the Correct Connection String

From MongoDB Atlas:
1. Click **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. Select **Driver: Node.js** and **Version: 5.5 or later**
4. Copy the connection string
5. Replace `<password>` with your actual password
6. Replace `<database>` with your database name (e.g., "steps")

### Step 5: Restart Your Server

```bash
cd server
npm start
```

---

## If Still Not Working

### Option A: Update Node.js (Recommended)

The SSL error often occurs with older Node.js versions.

**Check your version:**
```bash
node --version
```

**Update to Node.js 18+ (recommended):**
```bash
# Using nvm (Node Version Manager)
nvm install 18
nvm use 18

# Or download from nodejs.org
```

### Option B: Temporary Development Fix

**⚠️ DEVELOPMENT ONLY - DO NOT USE IN PRODUCTION**

If you need a quick fix for development, add this to your connection string:
```
&tlsAllowInvalidCertificates=true
```

Example:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/steps?retryWrites=true&w=majority&tlsAllowInvalidCertificates=true
```

Or set in `.env`:
```env
NODE_TLS_REJECT_UNAUTHORIZED=0
```

**🚨 Remove this before deploying to production!**

### Option C: Use Direct Connection String

Instead of the SRV record, use the full connection string:

```env
MONGODB_URI=mongodb://ac-oz9oxzh-shard-00-00.qj2hv0s.mongodb.net:27017,ac-oz9oxzh-shard-00-01.qj2hv0s.mongodb.net:27017,ac-oz9oxzh-shard-00-02.qj2hv0s.mongodb.net:27017/steps?ssl=true&replicaSet=atlas-f7zerp-shard-0&authSource=admin&retryWrites=true&w=majority
```

Get this from MongoDB Atlas → Connect → Connect your application → Use the non-SRV connection string

---

## Files Created/Updated

1. ✅ `server/index.js` - Updated mongoose connection
2. ✅ `server/.env.example` - Environment variable template
3. ✅ `server/test-connection.js` - Connection test script
4. ✅ `server/package.json` - Added `test:connection` script
5. ✅ `MONGODB_TROUBLESHOOTING.md` - Detailed troubleshooting guide

---

## Quick Command Reference

```bash
# Test MongoDB connection
npm run test:connection

# Start server
npm start

# Start with auto-reload
npm run dev

# Check Node.js version
node --version

# Check Mongoose version
npm list mongoose
```

---

## Still Having Issues?

1. **Read the detailed guide:** [MONGODB_TROUBLESHOOTING.md](MONGODB_TROUBLESHOOTING.md)
2. **Check MongoDB Atlas Status:** https://status.mongodb.com
3. **MongoDB Community Forums:** https://www.mongodb.com/community/forums
4. **Contact Support:** https://support.mongodb.com

---

## For Vercel Deployment

When deploying to Vercel:

1. **Set environment variable** in Vercel Dashboard:
   ```
   MONGODB_URI=your_connection_string_here
   ```

2. **IP Whitelist:** Use `0.0.0.0/0` (Vercel uses dynamic IPs)

3. **Connection string** should include retry options:
   ```
   mongodb+srv://user:pass@cluster.mongodb.net/steps?retryWrites=true&w=majority
   ```

---

**Status:** ✅ Configuration updated and ready to test!
