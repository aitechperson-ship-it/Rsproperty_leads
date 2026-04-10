const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Lead = require('./models/Lead');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    // Find all team members
    const teamMembers = await User.find({ role: 'Team Member' });
    const teamIds = teamMembers.map(u => u._id);
    console.log(`Found ${teamIds.length} Team Members to delete.`);
    
    // Unassign leads
    const resultLeads = await Lead.updateMany({ assigned_to: { $in: teamIds } }, { $set: { assigned_to: null } });
    console.log(`Unassigned ${resultLeads.modifiedCount} leads.`);
    
    // Delete users
    const resultUsers = await User.deleteMany({ _id: { $in: teamIds } });
    console.log(`Deleted ${resultUsers.deletedCount} Team Members.`);
    
  } catch(err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
