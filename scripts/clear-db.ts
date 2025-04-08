const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function clearDatabase() {
  try {
    // Connect to MongoDB using URI from environment
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Get all collections
    const collections = await mongoose.connection.db.collections();
    
    // Drop each collection
    for (const collection of collections) {
      await collection.drop();
      console.log(`Dropped collection: ${collection.collectionName}`);
    }
    
    console.log('Database cleared successfully');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
}

clearDatabase(); 