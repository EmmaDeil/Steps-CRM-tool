require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const InventoryItemModel = require('./models/InventoryItem');

// Load env explicitly
require('dotenv').config({ path: path.join(__dirname, '.env') });

const VITE_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/steps';

(async () => {
    try {
        await mongoose.connect(VITE_URI);
        const count = await InventoryItemModel.countDocuments();
        if (count === 0) {
            await InventoryItemModel.create([
                { itemId: "INV-9999", name: "Backend Integration Test Item", category: "Electronics", quantity: 50, maxStock: 100, location: "Local MongoDB Server" }
            ]);
            console.log("Seeded database with test item.");
        } else {
            console.log("Database already has " + count + " items.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
})();
