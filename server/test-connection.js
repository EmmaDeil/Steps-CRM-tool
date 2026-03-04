#!/usr/bin/env node

/**
 * MongoDB Connection Test Script
 * 
 * This script tests the MongoDB connection independently
 * Run with: node test-connection.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

console.log('========================================');
console.log('MongoDB Connection Test');
console.log('========================================\n');

// Check if MONGODB_URI is set
if (!MONGODB_URI) {
  console.error('❌ ERROR: MONGODB_URI is not set in .env file');
  console.error('\nPlease create a .env file with:');
  console.error('MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database\n');
  process.exit(1);
}

// Mask password in URI for logging
const maskedURI = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
console.log('📡 Testing connection to:', maskedURI);
console.log('');

// Connection options
const options = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  family: 4,
  maxPoolSize: 10,
  minPoolSize: 2,
  tls: true,
  tlsAllowInvalidCertificates: false,
  retryWrites: true,
  w: 'majority',
};

console.log('🔧 Connection options:');
console.log(JSON.stringify(options, null, 2));
console.log('\n⏳ Connecting...\n');

// Attempt connection
mongoose.connect(MONGODB_URI, options)
  .then(() => {
    console.log('✅ SUCCESS! Connected to MongoDB');
    console.log('');
    console.log('📊 Connection details:');
    console.log('  - Host:', mongoose.connection.host);
    console.log('  - Database:', mongoose.connection.name);
    console.log('  - Ready State:', mongoose.connection.readyState);
    console.log('');
    
    // Test a simple operation
    console.log('🧪 Testing database operation...');
    
    return mongoose.connection.db.admin().ping();
  })
  .then(() => {
    console.log('✅ Database ping successful!');
    console.log('');
    console.log('🎉 All tests passed! Your MongoDB connection is working correctly.');
    console.log('');
    
    // Clean up
    mongoose.connection.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ CONNECTION FAILED\n');
    console.error('Error Type:', err.name);
    console.error('Error Message:', err.message);
    console.error('');
    
    // Provide specific troubleshooting based on error type
    if (err.message.includes('ENOTFOUND')) {
      console.error('💡 Troubleshooting Tip:');
      console.error('  DNS resolution failed. Check your connection string.');
      console.error('  Make sure the cluster URL is correct.');
    } else if (err.message.includes('Authentication failed')) {
      console.error('💡 Troubleshooting Tip:');
      console.error('  Authentication failed. Check your username and password.');
      console.error('  Remember to URL-encode special characters in password.');
    } else if (err.message.includes('SSL') || err.message.includes('TLS')) {
      console.error('💡 Troubleshooting Tip:');
      console.error('  SSL/TLS error detected.');
      console.error('  1. Update Node.js to version 18+ (current:', process.version + ')');
      console.error('  2. Update mongoose: npm install mongoose@latest');
      console.error('  3. Check MongoDB Atlas cluster is running');
      console.error('  4. Verify your IP is whitelisted in MongoDB Atlas');
      console.error('');
      console.error('  For development only, you can try adding to connection string:');
      console.error('  &tlsAllowInvalidCertificates=true');
      console.error('  (Do NOT use in production!)');
    } else if (err.message.includes('ECONNREFUSED')) {
      console.error('💡 Troubleshooting Tip:');
      console.error('  Connection refused. Check:');
      console.error('  1. Firewall settings');
      console.error('  2. MongoDB Atlas cluster is running (not paused)');
      console.error('  3. Your IP is whitelisted');
    } else if (err.message.includes('timeout')) {
      console.error('💡 Troubleshooting Tip:');
      console.error('  Connection timeout. Check:');
      console.error('  1. Internet connection');
      console.error('  2. MongoDB Atlas cluster status');
      console.error('  3. Network firewall settings');
    }
    
    console.error('');
    console.error('📖 For more help, see: MONGODB_TROUBLESHOOTING.md');
    console.error('');
    console.error('Full error details:');
    console.error(err);
    console.error('');
    
    process.exit(1);
  });

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Connection test interrupted');
  mongoose.connection.close();
  process.exit(0);
});
