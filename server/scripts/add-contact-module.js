const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Module = require('../models/Module');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in server/.env');
  process.exit(1);
}

async function addContactModule() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if module already exists
    const existingModule = await Module.findOne({ name: 'Contacts' });
    if (existingModule) {
      console.log('✓ Contacts module already exists');
      return;
    }

    // Get the highest existing ID to assign the next one
    const lastModule = await Module.findOne().sort({ id: -1 });
    const nextId = (lastModule?.id || 0) + 1;

    // Create Contact module
    const contactModule = new Module({
      id: nextId,
      name: 'Contacts',
      componentName: 'Contact',
    });

    const savedModule = await contactModule.save();
    console.log('✓ Contacts module created successfully');
    console.log(`  Module ID: ${savedModule.id}`);
    console.log(`  Module Name: ${savedModule.name}`);
    console.log(`  Component: ${savedModule.componentName}`);
  } catch (error) {
    console.error('Error adding module:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

addContactModule();
