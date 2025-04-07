// Script to check the MongoDB database for Juntas App
// This will list all collections and count documents in each
// Usage: node scripts/check-db.js

const mongoose = require('mongoose');

// Use MongoDB connection string from environment variables or default local
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/juntas-app';

async function checkDatabase() {
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
      console.log(`Found ${collections.length} collections in the database:`);
      console.log('-------------------------------------------');
      
      // List each collection and count documents
      for (const collection of collections) {
        const count = await collection.countDocuments();
        console.log(`- ${collection.collectionName}: ${count} documents`);
        
        // For User collection, show some details
        if (collection.collectionName === 'users') {
          const users = await collection.find({}).limit(5).toArray();
          
          if (users.length > 0) {
            console.log('  Sample users:');
            users.forEach((user, index) => {
              console.log(`  ${index + 1}. ${user.name} (${user.email})`);
              console.log(`     MFA Enabled: ${user.twoFactorAuth?.enabled || false}`);
              console.log(`     MFA Method: ${user.twoFactorAuth?.method || 'none'}`);
            });
          }
        }
      }
      
      console.log('-------------------------------------------');
    }
  } catch (error) {
    console.error('Error checking database:', error);
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

// Run the check function
checkDatabase();