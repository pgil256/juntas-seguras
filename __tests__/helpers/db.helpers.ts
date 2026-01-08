import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

/**
 * Database test helpers
 * Provides utilities for setting up and tearing down test database
 */

let mongoServer: MongoMemoryServer | null = null;

/**
 * Sets up an in-memory MongoDB server for testing
 */
export const setupTestDb = async (): Promise<void> => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri, {
    maxPoolSize: 10,
  });
};

/**
 * Tears down the test database connection and server
 */
export const teardownTestDb = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
};

/**
 * Clears all collections in the test database
 */
export const clearTestDb = async (): Promise<void> => {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

/**
 * Drops all collections in the test database
 */
export const dropTestDb = async (): Promise<void> => {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    try {
      await collections[key].drop();
    } catch (error) {
      // Collection might not exist, ignore
    }
  }
};

/**
 * Gets the current MongoDB URI
 */
export const getTestDbUri = (): string | null => {
  return mongoServer?.getUri() || null;
};

/**
 * Checks if the test database is connected
 */
export const isTestDbConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

/**
 * Wait for database connection
 */
export const waitForConnection = async (
  maxWaitMs: number = 10000
): Promise<boolean> => {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (mongoose.connection.readyState === 1) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
};

/**
 * Inserts test documents into a collection
 */
export const insertTestDocuments = async <T>(
  modelName: string,
  documents: T[]
): Promise<void> => {
  const model = mongoose.model(modelName);
  await model.insertMany(documents);
};

/**
 * Gets a test document by ID
 */
export const getTestDocument = async <T>(
  modelName: string,
  id: string
): Promise<T | null> => {
  const model = mongoose.model(modelName);
  return model.findById(id).lean() as Promise<T | null>;
};

/**
 * Creates a test document and returns it with _id
 */
export const createTestDocument = async <T>(
  modelName: string,
  data: Partial<T>
): Promise<T & { _id: mongoose.Types.ObjectId }> => {
  const model = mongoose.model(modelName);
  const doc = new model(data);
  await doc.save();
  return doc.toObject();
};

/**
 * Generates a valid MongoDB ObjectId
 */
export const generateObjectId = (): string => {
  return new mongoose.Types.ObjectId().toString();
};

/**
 * Creates multiple ObjectIds
 */
export const generateObjectIds = (count: number): string[] => {
  return Array.from({ length: count }, () => generateObjectId());
};
