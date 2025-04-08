// Script to clear the MongoDB database
// Usage: node scripts/clear-db.js

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const mongoose = require('mongoose');

console.log('Starting database cleanup...');
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Found' : 'Not found');

async function clearDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections`);

    // Drop each collection
    for (const collection of collections) {
      await mongoose.connection.db.dropCollection(collection.name);
      console.log(`Dropped collection: ${collection.name}`);
    }

    console.log('Database cleanup completed successfully');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Database cleanup failed:', error);
    process.exit(1);
  }
}

clearDatabase();