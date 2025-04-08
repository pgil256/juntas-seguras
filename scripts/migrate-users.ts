const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { getUserModel } = require('../lib/db/models/user');

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

console.log('Starting migration...');
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Found' : 'Not found');

async function migrateUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = getUserModel();
    console.log('User model initialized');

    const result = await User.updateMany(
      { resetToken: { $exists: false } },
      { $set: { resetToken: null, resetTokenExpiry: null } }
    );

    console.log(`Migration completed. Updated ${result.modifiedCount} users`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
console.log('Starting migration script...');
migrateUsers(); 