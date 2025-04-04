// Test MongoDB connection
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/juntas-app';

console.log('Attempting to connect to MongoDB...');
console.log(`Connection string: ${MONGODB_URI.replace(/mongodb\+srv:\/\/([^:]+):[^@]+@/, 'mongodb+srv://$1:****@')}`);

mongoose.connect(MONGODB_URI, {
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ MongoDB connection successful!');
  console.log('Connection details:', {
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name,
  });
  
  // Close the connection after successful test
  return mongoose.disconnect();
})
.then(() => {
  console.log('MongoDB connection closed');
  process.exit(0);
})
.catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
  
  if (err.name === 'MongoNetworkError') {
    console.log('\nTROUBLESHOOTING TIPS:');
    console.log('1. For local MongoDB: Make sure MongoDB is running on your machine');
    console.log('2. For MongoDB Atlas: Check your network connection and firewall settings');
    console.log('3. Verify the connection string format and credentials');
  }
  
  process.exit(1);
});