// Standalone MongoDB connection check used by the local setup script.
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/juntas-app';

async function main() {
  try {
    console.log('Testing MongoDB connection...');

    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 5,
      retryWrites: true,
      retryReads: true,
    });

    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
    }

    console.log(`MongoDB connection successful (${mongoose.connection.name})`);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
