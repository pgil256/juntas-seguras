// Script to clear the MongoDB database
// Usage: node scripts/clear-db.js

const mongoose = require('mongoose');

// Use MongoDB Atlas URI from environment or fallback to local (for development)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/juntas-app';

async function clearDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    console.log('Clearing all collections...');
    
    // Get all collections
    const collections = await mongoose.connection.db.collections();
    
    // Drop each collection
    for (const collection of collections) {
      await collection.deleteMany({});
      console.log(`Cleared collection: ${collection.collectionName}`);
    }
    
    console.log('Database cleared successfully!');
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

clearDatabase();