# Database Seeding Guide

## Overview

The `seed.js` file is a comprehensive database seeding tool that populates your MongoDB database with initial data for development and testing purposes.

## What Was Changed

**Deleted:** `server/data.js` - Old static seed data file  
**Created:** `server/seed.js` - New comprehensive seeding script  
**Updated:** `server/index.js` - Removed dependency on data.js, now only auto-seeds modules  
**Updated:** `server/package.json` - Added convenient npm scripts

## Features

- ✅ Seeds all essential collections (users, departments, modules, etc.)
- ✅ Prevents duplicate seeding (checks if data exists)
- ✅ Option to clear existing data before seeding
- ✅ Selective seeding (seed only specific collections)
- ✅ Password hashing for user accounts
- ✅ Includes default admin and test users

## Usage

### Seed All Data
```bash
cd server
npm run seed
# or
node seed.js
```

### Clear and Re-seed
```bash
npm run seed:clear
# or
node seed.js --clear
```

### Seed Only Users
```bash
npm run seed:users
# or
node seed.js --users
```

## What Gets Seeded

### 1. **Modules** (13 items)
- Approval, Inventory, HR Management, Finance, etc.

### 2. **Departments** (8 items)
- Engineering, HR, Finance, Sales, Marketing, Operations, IT, Customer Support
- Each with icon and color

### 3. **Job Titles** (15 items)
- Software Engineer, Project Manager, HR Manager, etc.

### 4. **Users** (3 default accounts)
| Email | Password | Role | Department |
|-------|----------|------|------------|
| admin@netlink.com | Admin@123 | Admin | IT |
| john.doe@netlink.com | User@123 | user | Engineering |
| jane.smith@netlink.com | User@123 | Editor | Human Resources |

### 5. **Analytics**
- Sample module usage statistics
- Recent activity data
- Dashboard metrics

### 6. **Attendance**
- Sample attendance records for test users

### 7. **Policies**
- Code of Conduct
- Remote Work Policy

### 8. **Security Settings**
- Password policy configuration
- Session policy
- Login attempt limits
- Two-factor auth settings

## Server Auto-Seeding

The main server (`server/index.js`) automatically seeds **only modules** on startup if the modules collection is empty. This ensures the app has the minimum required data to function.

For full seeding (users, departments, etc.), you must run the seed script manually.

## Command Line Options

- `--all` - Seed all collections (default if no flags provided)
- `--clear` - Delete all existing data before seeding
- `--users` - Seed only users collection

## Examples

```bash
# First time setup - seed everything
npm run seed

# Reset database completely
npm run seed:clear

# Add test users to existing database
npm run seed:users

# Seed everything from scratch
node seed.js --clear --all
```

## Environment Variables

Make sure your `.env` file has the MongoDB connection string:

```env
MONGODB_URI=mongodb://localhost:27017/netlink
# or for MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
```

## Notes

- The script is safe to run multiple times - it checks for existing data
- Use `--clear` with caution in production environments
- Default passwords should be changed after first login
- All timestamps are automatically added by Mongoose

## Troubleshooting

**Error: "MONGODB_URI is not set"**
- Ensure your `.env` file exists in the server directory
- Check that `MONGODB_URI` is properly defined

**Error: "Duplicate key error"**
- Use `--clear` flag to remove existing data first
- Or manually drop the collections in MongoDB

**Error: "Connection timeout"**
- Check your MongoDB server is running (for local)
- Verify network access for MongoDB Atlas
- Check firewall settings
