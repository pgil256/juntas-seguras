import mongoose from 'mongoose';

// Use MongoDB Atlas URI from environment or fallback to local (for development)
// When using MongoDB Atlas, set MONGODB_URI in your environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/juntas-app';

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

// For MongoDB Atlas connection diagnostics
if (!process.env.MONGODB_URI) {
  console.log('Warning: Using local MongoDB instance. Set MONGODB_URI for production.');
}

// Define the type for our mongoose cache
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  isConnected: boolean;
}

// Extend the global namespace to include our mongoose cache
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

// Global variable to track connection status - ensure it's always defined
function getMongooseCache(): MongooseCache {
  if (!global.mongooseCache) {
    global.mongooseCache = {
      conn: null,
      promise: null,
      isConnected: false
    };
  }
  return global.mongooseCache;
}

async function connectToDatabase() {
  const cached = getMongooseCache();

  if (cached.conn && cached.isConnected) {
    console.log('Using existing MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    // Connection pool configuration
    // - Serverless environments (Vercel, Lambda) need smaller pools due to cold starts
    // - Traditional servers can maintain larger pools
    const poolConfig = isServerless
      ? {
          maxPoolSize: 5,     // Smaller pool for serverless
          minPoolSize: 1,     // Allow pool to shrink when idle
        }
      : {
          maxPoolSize: 10,    // Standard pool for long-running servers
          minPoolSize: 2,     // Keep minimum connections ready
        };

    const opts = {
      bufferCommands: false,
      connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      // Connection pool settings
      ...poolConfig,
      // Server selection and heartbeat
      serverSelectionTimeoutMS: isProduction ? 10000 : 5000, // Faster timeout in dev
      heartbeatFrequencyMS: 10000, // Check connection health every 10 seconds
      // Connection retry settings
      retryWrites: true,
      retryReads: true,
      // Write concern for production data integrity
      ...(isProduction && {
        w: 'majority' as const,
        wtimeoutMS: 2500,
      }),
    };

    console.log('Connecting to MongoDB...');
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongooseInstance) => {
        console.log('MongoDB connected successfully');
        cached.isConnected = true;
        return mongooseInstance;
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
    const db = mongoose.connection.db;
    if (db) {
      const collections = await db.listCollections().toArray();
      console.log(`MongoDB connection verified with ${collections.length} collections`);
    }

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

// Connection pool stats for monitoring and debugging
export interface ConnectionPoolStats {
  isConnected: boolean;
  readyState: number; // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  poolSize: number;
  availableConnections: number;
  waitingRequests: number;
  serverDescription: string;
}

export function getConnectionPoolStats(): ConnectionPoolStats {
  const connection = mongoose.connection;

  // Get pool stats if available
  let poolSize = 0;
  let availableConnections = 0;
  let waitingRequests = 0;

  // MongoDB driver internal access - may vary by version
  try {
    // Access pool stats through the client's internal topology
    // Using 'as any' because these are internal APIs not exposed in types
    const client = connection.getClient() as any;
    if (client?.s?.options) {
      poolSize = client.s.options.maxPoolSize || 0;
    }
    // The actual connection counts require accessing internal topology state
    // which varies between driver versions - these are best-effort stats
  } catch {
    // Pool stats may not be available depending on driver version
  }

  return {
    isConnected: connection.readyState === 1,
    readyState: connection.readyState,
    poolSize,
    availableConnections,
    waitingRequests,
    serverDescription: connection.host ? `${connection.host}:${connection.port}` : 'not connected',
  };
}

// Health check function for use in API endpoints
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
  poolStats: ConnectionPoolStats;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    await connectToDatabase();

    // Execute a simple ping command to verify the connection
    const db = mongoose.connection.db;
    if (db) {
      await db.admin().ping();
    }

    return {
      status: 'healthy',
      latencyMs: Date.now() - startTime,
      poolStats: getConnectionPoolStats(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      poolStats: getConnectionPoolStats(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export default connectToDatabase;