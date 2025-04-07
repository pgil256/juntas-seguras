// Script to reset the MongoDB database for Juntas App
// This will clear all collections from the database
// Usage: node scripts/reset-db.js

const mongoose = require('mongoose');

// Use MongoDB connection string from environment variables or default local
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/juntas-app';

async function resetDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    console.log(`Connection string: ${MONGODB_URI.replace(/mongodb\+srv:\/\/([^:]+):[^@]+@/, 'mongodb+srv://$1:****@')}`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully!');
    
    // Get all collections
    const collections = await mongoose.connection.db.collections();
    
    if (collections.length === 0) {
      console.log('No collections found in the database.');
    } else {
      console.log(`Found ${collections.length} collections in the database.`);
      
      // Drop each collection
      for (const collection of collections) {
        const result = await collection.deleteMany({});
        console.log(`Cleared collection '${collection.collectionName}' - removed ${result.deletedCount} documents`);
      }
      
      console.log('Database reset complete!');
    }
  } catch (error) {
    console.error('Error resetting database:', error);
  } finally {
    try {
      await mongoose.disconnect();
      console.log('MongoDB connection closed.');
    } catch (err) {
      console.error('Error disconnecting from MongoDB:', err);
    }
    
    process.exit(0);
  }
}

// Run the reset function
resetDatabase();