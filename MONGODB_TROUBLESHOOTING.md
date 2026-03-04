# MongoDB Connection Troubleshooting Guide

## Error: SSL/TLS Connection Error

If you see this error:
```
MongoServerSelectionError: 98730000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error
```

### Solution 1: Update Mongoose Connection Options ✅ (Applied)

The connection options have been updated to:
```javascript
await mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4
  maxPoolSize: 10,
  minPoolSize: 2,
  tls: true,
  tlsAllowInvalidCertificates: false,
  retryWrites: true,
  w: 'majority',
});
```

### Solution 2: Check MongoDB Atlas IP Whitelist

1. Go to MongoDB Atlas Dashboard
2. Navigate to **Network Access**
3. Add your current IP address or use `0.0.0.0/0` (not recommended for production)

### Solution 3: Verify Connection String Format

Your `MONGODB_URI` should look like:
```
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

**Important:**
- Replace `username` with your MongoDB Atlas username
- Replace `password` with your MongoDB Atlas password (URL encode special characters!)
- Replace `cluster` with your cluster name
- Replace `database` with your database name

**Special Characters in Password:**
If your password contains special characters, URL encode them:
- `@` → `%40`
- `:` → `%3A`
- `/` → `%2F`
- `?` → `%3F`
- `#` → `%23`
- `%` → `%25`

Example:
```
# Original password: myP@ss:word#123
# Encoded password: myP%40ss%3Aword%23123
mongodb+srv://user:myP%40ss%3Aword%23123@cluster.mongodb.net/steps?retryWrites=true&w=majority
```

### Solution 4: Update Node.js Version

The SSL error can occur with older Node.js versions. Ensure you're using:
- **Node.js 18.x or higher** (recommended)
- Minimum: Node.js 16.x

Check your version:
```bash
node --version
```

Update if needed:
```bash
# Using nvm (recommended)
nvm install 18
nvm use 18

# Or download from nodejs.org
```

### Solution 5: Update MongoDB Driver (Mongoose)

Update to the latest mongoose version:
```bash
cd server
npm install mongoose@latest
```

Current version in package.json: `^7.5.0` (should work)

### Solution 6: Check Firewall/Antivirus

- Disable antivirus/firewall temporarily to test
- Some corporate networks block MongoDB Atlas (port 27017)
- Try using a different network (mobile hotspot, home wifi)

### Solution 7: Use Environment Variable for TLS Options

If issues persist, you can temporarily allow invalid certificates (DEVELOPMENT ONLY):

In `.env`:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/steps?retryWrites=true&w=majority&tlsAllowInvalidCertificates=true
```

Or set Node.js TLS options:
```env
NODE_TLS_REJECT_UNAUTHORIZED=0
```

**⚠️ WARNING:** Never use this in production!

### Solution 8: Test Connection Separately

Create a test file `test-connection.js` in the server directory:

```javascript
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

console.log('Testing MongoDB connection...');
console.log('URI (masked):', MONGODB_URI.replace(/:[^:@]+@/, ':****@'));

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  family: 4,
  tls: true,
  tlsAllowInvalidCertificates: false,
  retryWrites: true,
  w: 'majority',
})
  .then(() => {
    console.log('✅ Connection successful!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Connection failed:');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  });
```

Run it:
```bash
cd server
node test-connection.js
```

### Solution 9: MongoDB Atlas Cluster Status

1. Check if your MongoDB Atlas cluster is running:
   - Go to https://cloud.mongodb.com
   - Navigate to your cluster
   - Ensure it's not paused or in maintenance mode

2. Verify cluster tier:
   - Free tier (M0) has limitations
   - Ensure you haven't exceeded limits

### Solution 10: DNS Resolution Issues

Try using the direct connection string instead of SRV:

Instead of:
```
mongodb+srv://user:pass@cluster.mongodb.net/steps
```

Use:
```
mongodb://ac-oz9oxzh-shard-00-00.qj2hv0s.mongodb.net:27017,ac-oz9oxzh-shard-00-01.qj2hv0s.mongodb.net:27017,ac-oz9oxzh-shard-00-02.qj2hv0s.mongodb.net:27017/steps?ssl=true&replicaSet=atlas-f7zerp-shard-0&authSource=admin&retryWrites=true&w=majority
```

Get the full connection string from MongoDB Atlas:
1. Click **Connect**
2. Choose **Connect your application**
3. Select **Driver: Node.js**
4. Copy the connection string

---

## Quick Checklist

- [ ] MongoDB Atlas cluster is running (not paused)
- [ ] IP address is whitelisted in Network Access
- [ ] Connection string format is correct
- [ ] Password is URL-encoded if it contains special characters
- [ ] Using Node.js 16.x or higher
- [ ] Mongoose is up-to-date (7.x+)
- [ ] Firewall/antivirus not blocking port 27017
- [ ] Using the correct database name
- [ ] MongoDB Atlas account is active (not suspended)

---

## Still Not Working?

### Check Server Logs

Look for specific error messages:
- `ENOTFOUND` → DNS issue, check connection string
- `ECONNREFUSED` → Firewall/network issue
- `Authentication failed` → Wrong username/password
- `SSL routines` → TLS/SSL configuration issue (main error)

### Contact MongoDB Support

If none of the above works:
1. Visit: https://support.mongodb.com
2. Or use MongoDB Community Forums: https://www.mongodb.com/community/forums

### Alternative: Use Local MongoDB

For development, you can use local MongoDB:

1. Install MongoDB Community Server
2. Update `.env`:
   ```env
   MONGODB_URI=mongodb://localhost:27017/steps
   ```

---

## Recommended Production Setup

For Vercel deployment:

1. **MongoDB Atlas** (required for Vercel)
2. **IP Whitelist:** `0.0.0.0/0` (Vercel uses dynamic IPs)
3. **Connection String:** Include all retry options
4. **Environment Variables:** Set in Vercel Dashboard (not in .env)

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/steps?retryWrites=true&w=majority&maxPoolSize=10
```

---

**Last Updated:** After applying fix to connection configuration
