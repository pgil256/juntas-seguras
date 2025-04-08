import mongoose from 'mongoose';

// Use MongoDB Atlas URI from environment or fallback to local (for development)
// When using MongoDB Atlas, set MONGODB_URI in your environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/juntas-app';

// For MongoDB Atlas connection diagnostics
if (!process.env.MONGODB_URI) {
  console.log('Warning: Using local MongoDB instance. Set MONGODB_URI for production.');
}

// Global variable to track connection status
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { 
    conn: null, 
    promise: null,
    isConnected: false 
  };
}

async function connectToDatabase() {
  if (cached.conn && cached.isConnected) {
    console.log('Using existing MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    console.log('Connecting to MongoDB...');
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('MongoDB connected successfully');
        cached.isConnected = true;
        return mongoose;
      })
      .catch(err => {
        console.error('MongoDB connection error:', err);
        cached.isConnected = false;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    
    // Test the connection by executing a simple query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`MongoDB connection verified with ${collections.length} collections`);
    
    return cached.conn;
  } catch (e) {
    console.error('Failed to establish MongoDB connection:', e);
    cached.promise = null;
    cached.isConnected = false;
    throw e;
  }
}

// Export a function to explicitly test if connection is working
export async function testConnection() {
  try {
    await connectToDatabase();
    return true;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
}

export default connectToDatabase;