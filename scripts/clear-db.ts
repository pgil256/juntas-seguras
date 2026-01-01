import mongooseLib from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function clearDatabase() {
  try {
    // Connect to MongoDB using URI from environment
    await mongooseLib.connect(process.env.MONGODB_URI as string);

    // Get all collections
    const db = mongooseLib.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    const collections = await db.collections();

    // Drop each collection
    for (const collection of collections) {
      await collection.drop();
      console.log(`Dropped collection: ${collection.collectionName}`);
    }

    console.log('Database cleared successfully');
    await mongooseLib.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
}

clearDatabase(); 