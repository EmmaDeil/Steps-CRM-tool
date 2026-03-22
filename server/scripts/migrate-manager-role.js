const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const ApprovalRule = require('../models/ApprovalRule');
const MaterialRequest = require('../models/MaterialRequest');
const AdvanceRequest = require('../models/AdvanceRequest');
const LeaveRequest = require('../models/LeaveRequest');
const RefundRequest = require('../models/RefundRequest');
const TravelRequest = require('../models/TravelRequest');
const PurchaseOrder = require('../models/PurchaseOrder');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in server/.env');
  process.exit(1);
}

async function migrateNestedRole({ model, modelName, arrayPath }) {
  const queryPath = `${arrayPath}.approverRole`;
  const setPath = `${arrayPath}.$[elem].approverRole`;

  const before = await model.countDocuments({ [queryPath]: 'Direct Manager' });

  if (before === 0) {
    return { modelName, before: 0, modifiedCount: 0, after: 0 };
  }

  const updateResult = await model.updateMany(
    { [queryPath]: 'Direct Manager' },
    { $set: { [setPath]: 'Manager' } },
    { arrayFilters: [{ 'elem.approverRole': 'Direct Manager' }] },
  );

  const after = await model.countDocuments({ [queryPath]: 'Direct Manager' });

  return {
    modelName,
    before,
    modifiedCount: updateResult.modifiedCount || 0,
    after,
  };
}

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const results = [];

    results.push(
      await migrateNestedRole({
        model: ApprovalRule,
        modelName: 'ApprovalRule.levels',
        arrayPath: 'levels',
      }),
    );

    const approvalChainModels = [
      { model: MaterialRequest, modelName: 'MaterialRequest.approvalChain' },
      { model: AdvanceRequest, modelName: 'AdvanceRequest.approvalChain' },
      { model: LeaveRequest, modelName: 'LeaveRequest.approvalChain' },
      { model: RefundRequest, modelName: 'RefundRequest.approvalChain' },
      { model: TravelRequest, modelName: 'TravelRequest.approvalChain' },
      { model: PurchaseOrder, modelName: 'PurchaseOrder.approvalChain' },
    ];

    for (const entry of approvalChainModels) {
      results.push(
        await migrateNestedRole({
          model: entry.model,
          modelName: entry.modelName,
          arrayPath: 'approvalChain',
        }),
      );
    }

    console.log('\nMigration summary:');
    results.forEach((r) => {
      console.log(
        `- ${r.modelName}: before=${r.before}, modified=${r.modifiedCount}, remaining=${r.after}`,
      );
    });

    const totalBefore = results.reduce((sum, r) => sum + r.before, 0);
    const totalRemaining = results.reduce((sum, r) => sum + r.after, 0);

    if (totalBefore === 0) {
      console.log('\nNo legacy "Direct Manager" records found.');
    } else if (totalRemaining === 0) {
      console.log('\nMigration completed successfully.');
    } else {
      console.warn(
        `\nMigration completed with remaining legacy records: ${totalRemaining}`,
      );
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

run();
