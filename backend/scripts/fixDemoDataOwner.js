require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Lead = require('../models/Lead');
const Meeting = require('../models/Meeting');
const Reminder = require('../models/Reminder');
const KnowledgeBase = require('../models/KnowledgeBase');
const AIInsight = require('../models/AIInsight');

// This migration targets only the demo documents shipped in the AutoCRM demo-data pack.
// It does not update user accounts, passwords, or non-demo document IDs.
const DEMO_ID_RANGES = {
  leads: ['68f200000000000000000001', '68f20000000000000000000f'],
  knowledgebases: ['68f400000000000000000001', '68f40000000000000000000f'],
  meetings: ['68f500000000000000000001', '68f50000000000000000000f'],
  reminders: ['68f600000000000000000001', '68f60000000000000000000f'],
  aiinsights: ['68f700000000000000000001', '68f70000000000000000000f'],
};

const idRange = (range) => ({
  $gte: new mongoose.Types.ObjectId(range[0]),
  $lte: new mongoose.Types.ObjectId(range[1]),
});

async function main() {
  const targetEmail = (process.env.TARGET_USER_EMAIL || '').trim().toLowerCase();
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing. Add it to backend/.env before running this script.');
  }
  if (!targetEmail) {
    throw new Error('Set TARGET_USER_EMAIL to the email of the account you actually use to log in to AutoCRM.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  const targetUser = await User.findOne({ email: targetEmail }).select('_id name email role');
  if (!targetUser) {
    throw new Error(`No user found with email: ${targetEmail}. Check the email in MongoDB users collection.`);
  }

  console.log(`Database: ${mongoose.connection.name}`);
  console.log(`Target account: ${targetUser.name} <${targetUser.email}> (${targetUser._id})`);
  console.log('Updating only the known demo record ID ranges...');

  const results = {};
  results.leads = await Lead.updateMany(
    { _id: idRange(DEMO_ID_RANGES.leads) },
    { $set: { userId: targetUser._id } }
  );
  results.knowledgebases = await KnowledgeBase.updateMany(
    { _id: idRange(DEMO_ID_RANGES.knowledgebases) },
    { $set: { createdBy: targetUser._id, updatedBy: targetUser._id } }
  );
  results.meetings = await Meeting.updateMany(
    { _id: idRange(DEMO_ID_RANGES.meetings) },
    { $set: { userId: targetUser._id, assignedTo: targetUser._id } }
  );
  results.reminders = await Reminder.updateMany(
    { _id: idRange(DEMO_ID_RANGES.reminders) },
    { $set: { userId: targetUser._id } }
  );
  results.aiinsights = await AIInsight.updateMany(
    { _id: idRange(DEMO_ID_RANGES.aiinsights) },
    { $set: { generatedBy: targetUser._id } }
  );

  for (const [collection, result] of Object.entries(results)) {
    console.log(`${collection}: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
  }
  console.log('Done. Chat messages are linked through demo leadId values, so they need no owner-field update.');
}

main()
  .catch((error) => {
    console.error('Demo ownership migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
