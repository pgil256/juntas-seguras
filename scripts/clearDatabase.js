const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function clearDatabase() {
  // Get the MongoDB URI from .env.local
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('MONGODB_URI not defined in .env.local file');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    // Get the database name from the connection string
    const dbName = uri.split('/').pop().split('?')[0];
    console.log(`Using database: ${dbName}`);
    const db = client.db(dbName);
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    
    // Drop each collection
    console.log(`Found ${collections.length} collections`);
    
    for (const collection of collections) {
      console.log(`Dropping collection: ${collection.name}`);
      await db.collection(collection.name).drop();
    }
    
    console.log('All collections dropped successfully');
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

clearDatabase()
  .then(() => console.log('Database clearing complete'))
  .catch(err => console.error('Failed to clear database:', err)); 