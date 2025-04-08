require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const mongoose = require('mongoose');

console.log('Starting migration...');
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Found' : 'Not found');

async function migrateUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the User collection directly
    const User = mongoose.connection.collection('users');
    console.log('User collection accessed');

    // First, let's check if the collection exists and has any documents
    const count = await User.countDocuments();
    console.log(`Found ${count} users in the database`);

    // Update all users to ensure they have resetToken and resetTokenExpiry fields
    const result = await User.updateMany(
      { resetToken: { $exists: false } },
      { $set: { resetToken: null, resetTokenExpiry: null } }
    );

    console.log(`Migration completed. Updated ${result.modifiedCount} users`);
    
    // Verify the update
    const updatedCount = await User.countDocuments({ resetToken: { $exists: true } });
    console.log(`Users with resetToken field: ${updatedCount}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateUsers(); 