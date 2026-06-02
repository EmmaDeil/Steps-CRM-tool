const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '.env') });
const MONGODB_URI = process.env.MONGODB_URI;

const TemplateModel = require('./models/Template');

async function test() {
  try {
    console.log("Connecting to:", MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully! Fetching templates...");
    const templates = await TemplateModel.find({}).sort({ createdAt: -1 });
    console.log("Fetched templates:", templates);
  } catch (err) {
    console.error("Diagnostic error caught:", err);
  } finally {
    await mongoose.disconnect();
  }
}

test();
