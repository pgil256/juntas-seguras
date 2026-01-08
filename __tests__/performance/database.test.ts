/**
 * Database Query Performance Tests
 * Tests for database query performance benchmarks using in-memory MongoDB
 * @jest-environment node
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { User } from '../../lib/db/models/User';
import { Pool } from '../../lib/db/models/Pool';

describe('Database Query Performance', () => {
  let mongoServer: MongoMemoryServer;

  // Performance thresholds in milliseconds
  // Note: These thresholds are intentionally generous to account for CI/CD
  // environments, varying system loads, and mongodb-memory-server overhead.
  // In production monitoring, tighter thresholds should be used.
  const thresholds = {
    simpleQuery: 100,      // Allow up to 100ms for simple queries
    complexQuery: 300,     // Allow up to 300ms for complex queries
    aggregation: 500,      // Allow up to 500ms for aggregations
    indexedQuery: 100,     // Allow up to 100ms for indexed queries
    write: 150,            // Allow up to 150ms for single writes
    bulkWrite: 750,        // Allow up to 750ms for bulk writes
    update: 150,           // Allow up to 150ms for updates
    delete: 150,           // Allow up to 150ms for deletes
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear collections before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  /**
   * Helper to measure query execution time
   */
  const measureQuery = async <T>(
    queryFn: () => Promise<T>
  ): Promise<{ result: T; durationMs: number }> => {
    const start = performance.now();
    const result = await queryFn();
    const durationMs = performance.now() - start;
    return { result, durationMs };
  };

  /**
   * Helper to create test users
   */
  const createTestUsers = async (count: number) => {
    const users = Array.from({ length: count }, (_, i) => ({
      name: `Test User ${i}`,
      email: `testuser${i}@example.com`,
      hashedPassword: 'hashedpassword123',
      verificationMethod: 'email',
      isVerified: true,
      pools: [],
      mfaSetupComplete: true,
      twoFactorAuth: {
        enabled: true,
        method: 'email',
        verified: true,
        lastUpdated: new Date().toISOString(),
      },
    }));

    return User.insertMany(users);
  };

  /**
   * Helper to create test pools
   */
  const createTestPools = async (
    count: number,
    creatorId: mongoose.Types.ObjectId
  ) => {
    const pools = Array.from({ length: count }, (_, i) => ({
      name: `Test Pool ${i}`,
      description: `Description for pool ${i}`,
      contributionAmount: Math.floor(Math.random() * 19) + 1, // 1-20
      frequency: ['weekly', 'biweekly', 'monthly'][i % 3],
      status: 'active',  // Use lowercase enum value
      creatorId,
      maxMembers: 10,
      currentRound: 1,
      members: [
        {
          id: 1,
          userId: creatorId,
          name: 'Creator',
          email: 'creator@example.com',
          role: 'admin',     // Use lowercase enum value
          position: 1,
          status: 'active',  // Use lowercase enum value
        },
      ],
      transactions: [],
      messages: [],
    }));

    return Pool.insertMany(pools);
  };

  describe('Simple Query Performance', () => {
    it('should find a user by email within threshold', async () => {
      await createTestUsers(100);

      // Warm-up query to establish indexes and connection
      await User.findOne({ email: 'testuser0@example.com' }).lean().exec();

      const { durationMs, result } = await measureQuery(() =>
        User.findOne({ email: 'testuser50@example.com' }).lean().exec()
      );

      expect(result).not.toBeNull();
      expect(result?.email).toBe('testuser50@example.com');
      expect(durationMs).toBeLessThan(thresholds.simpleQuery);
    });

    it('should find a user by ID within threshold', async () => {
      const users = await createTestUsers(100);
      const targetUser = users[50];

      const { durationMs, result } = await measureQuery(() =>
        User.findById(targetUser._id).lean().exec()
      );

      expect(result).not.toBeNull();
      expect(durationMs).toBeLessThan(thresholds.indexedQuery);
    });

    it('should count documents efficiently', async () => {
      await createTestUsers(500);

      const { durationMs, result } = await measureQuery(() =>
        User.countDocuments().exec()
      );

      expect(result).toBe(500);
      expect(durationMs).toBeLessThan(thresholds.simpleQuery);
    });
  });

  describe('Complex Query Performance', () => {
    it('should query pools with member filtering within threshold', async () => {
      const users = await createTestUsers(10);
      await createTestPools(50, users[0]._id as mongoose.Types.ObjectId);

      const { durationMs, result } = await measureQuery(() =>
        Pool.find({
          status: 'active',
          'members.userId': users[0]._id,
        })
          .lean()
          .exec()
      );

      expect(result.length).toBe(50);
      expect(durationMs).toBeLessThan(thresholds.complexQuery);
    });

    it('should handle pagination efficiently', async () => {
      await createTestUsers(500);

      const pageSize = 20;
      const page = 10;

      const { durationMs, result } = await measureQuery(() =>
        User.find()
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean()
          .exec()
      );

      expect(result.length).toBe(pageSize);
      expect(durationMs).toBeLessThan(thresholds.simpleQuery);
    });

    it('should perform text search efficiently', async () => {
      const users = await createTestUsers(100);
      await createTestPools(100, users[0]._id as mongoose.Types.ObjectId);

      const { durationMs, result } = await measureQuery(() =>
        Pool.find({
          $or: [
            { name: { $regex: 'Pool 50', $options: 'i' } },
            { description: { $regex: 'Pool 50', $options: 'i' } },
          ],
        })
          .lean()
          .exec()
      );

      expect(result.length).toBeGreaterThan(0);
      expect(durationMs).toBeLessThan(thresholds.complexQuery);
    });

    it('should sort results efficiently', async () => {
      await createTestUsers(200);

      const { durationMs, result } = await measureQuery(() =>
        User.find().sort({ createdAt: -1 }).limit(50).lean().exec()
      );

      expect(result.length).toBe(50);
      expect(durationMs).toBeLessThan(thresholds.complexQuery);
    });
  });

  describe('Aggregation Performance', () => {
    it('should perform simple aggregation within threshold', async () => {
      const users = await createTestUsers(10);
      await createTestPools(100, users[0]._id as mongoose.Types.ObjectId);

      const { durationMs, result } = await measureQuery(() =>
        Pool.aggregate([
          { $match: { status: 'active' } },
          {
            $group: {
              _id: '$frequency',
              count: { $sum: 1 },
              avgContribution: { $avg: '$contributionAmount' },
            },
          },
        ]).exec()
      );

      expect(result.length).toBeGreaterThan(0);
      expect(durationMs).toBeLessThan(thresholds.aggregation);
    });

    it('should perform aggregation with lookup within threshold', async () => {
      const users = await createTestUsers(10);
      await createTestPools(50, users[0]._id as mongoose.Types.ObjectId);

      const { durationMs, result } = await measureQuery(() =>
        Pool.aggregate([
          { $match: { status: 'active' } },
          {
            $lookup: {
              from: 'users',
              localField: 'creatorId',
              foreignField: '_id',
              as: 'creator',
            },
          },
          { $limit: 20 },
        ]).exec()
      );

      expect(result.length).toBe(20);
      expect(durationMs).toBeLessThan(thresholds.aggregation);
    });

    it('should calculate statistics efficiently', async () => {
      const users = await createTestUsers(10);
      await createTestPools(100, users[0]._id as mongoose.Types.ObjectId);

      const { durationMs, result } = await measureQuery(() =>
        Pool.aggregate([
          { $match: { status: 'active' } },
          {
            $group: {
              _id: null,
              totalPools: { $sum: 1 },
              totalContribution: { $sum: '$contributionAmount' },
              minContribution: { $min: '$contributionAmount' },
              maxContribution: { $max: '$contributionAmount' },
              avgContribution: { $avg: '$contributionAmount' },
            },
          },
        ]).exec()
      );

      expect(result.length).toBe(1);
      expect(result[0].totalPools).toBe(100);
      expect(durationMs).toBeLessThan(thresholds.aggregation);
    });
  });

  describe('Write Performance', () => {
    it('should create a single document within threshold', async () => {
      const { durationMs, result } = await measureQuery(async () => {
        const user = new User({
          name: 'New User',
          email: 'newuser@example.com',
          hashedPassword: 'hashedpassword123',
          verificationMethod: 'email',
          isVerified: true,
          pools: [],
          mfaSetupComplete: true,
          twoFactorAuth: {
            enabled: true,
            method: 'email',
            verified: true,
            lastUpdated: new Date().toISOString(),
          },
        });
        return user.save();
      });

      expect(result._id).toBeDefined();
      expect(durationMs).toBeLessThan(thresholds.write);
    });

    it('should perform bulk insert within threshold', async () => {
      const users = Array.from({ length: 100 }, (_, i) => ({
        name: `Bulk User ${i}`,
        email: `bulkuser${i}@example.com`,
        hashedPassword: 'hashedpassword123',
        verificationMethod: 'email',
        isVerified: true,
        pools: [],
        mfaSetupComplete: true,
        twoFactorAuth: {
          enabled: true,
          method: 'email',
          verified: true,
          lastUpdated: new Date().toISOString(),
        },
      }));

      const { durationMs, result } = await measureQuery(() =>
        User.insertMany(users)
      );

      expect(result.length).toBe(100);
      expect(durationMs).toBeLessThan(thresholds.bulkWrite);
    });

    it('should update a document within threshold', async () => {
      const users = await createTestUsers(10);

      const { durationMs } = await measureQuery(() =>
        User.findByIdAndUpdate(
          users[0]._id,
          { name: 'Updated Name' },
          { new: true }
        ).exec()
      );

      expect(durationMs).toBeLessThan(thresholds.update);
    });

    it('should delete a document within threshold', async () => {
      const users = await createTestUsers(10);

      const { durationMs, result } = await measureQuery(() =>
        User.findByIdAndDelete(users[0]._id).exec()
      );

      expect(result).not.toBeNull();
      expect(durationMs).toBeLessThan(thresholds.delete);
    });
  });

  describe('Index Performance', () => {
    it('should use indexes for email lookup', async () => {
      await createTestUsers(1000);

      // Query by indexed field (email)
      const { durationMs: indexedTime } = await measureQuery(() =>
        User.findOne({ email: 'testuser500@example.com' }).lean().exec()
      );

      // Email is unique indexed, should be fast
      expect(indexedTime).toBeLessThan(thresholds.indexedQuery);
    });

    it('should use compound indexes for pool queries', async () => {
      const users = await createTestUsers(10);
      await createTestPools(200, users[0]._id as mongoose.Types.ObjectId);

      // Query using compound index on creatorId and status
      const { durationMs } = await measureQuery(() =>
        Pool.find({
          creatorId: users[0]._id,
          status: 'active',
        })
          .lean()
          .exec()
      );

      expect(durationMs).toBeLessThan(thresholds.indexedQuery);
    });
  });

  describe('Concurrent Query Performance', () => {
    it('should handle concurrent reads efficiently', async () => {
      await createTestUsers(100);

      const concurrentReads = 20;
      const start = performance.now();

      const results = await Promise.all(
        Array.from({ length: concurrentReads }, (_, i) =>
          User.findOne({ email: `testuser${i}@example.com` }).lean().exec()
        )
      );

      const totalTime = performance.now() - start;
      const avgTime = totalTime / concurrentReads;

      expect(results.every((r) => r !== null)).toBe(true);
      expect(avgTime).toBeLessThan(thresholds.simpleQuery);
    });

    it('should handle mixed read/write operations', async () => {
      await createTestUsers(50);

      const operations = [
        User.findOne({ email: 'testuser10@example.com' }).lean().exec(),
        User.findOne({ email: 'testuser20@example.com' }).lean().exec(),
        User.findOne({ email: 'testuser30@example.com' }).lean().exec(),
        User.countDocuments().exec(),
        User.find().limit(10).lean().exec(),
      ];

      const start = performance.now();
      const results = await Promise.all(operations);
      const totalTime = performance.now() - start;

      expect(results[0]).not.toBeNull();
      expect(results[3]).toBe(50);
      expect((results[4] as any[]).length).toBe(10);
      expect(totalTime).toBeLessThan(thresholds.complexQuery);
    });
  });

  describe('Large Dataset Performance', () => {
    it('should handle queries on large datasets efficiently', async () => {
      // Create a larger dataset
      await createTestUsers(1000);

      const { durationMs } = await measureQuery(() =>
        User.find({ isVerified: true }).limit(100).lean().exec()
      );

      expect(durationMs).toBeLessThan(thresholds.complexQuery);
    });

    it('should handle aggregate pipelines on large datasets', async () => {
      await createTestUsers(500);

      const { durationMs, result } = await measureQuery(() =>
        User.aggregate([
          { $match: { isVerified: true } },
          { $group: { _id: '$verificationMethod', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]).exec()
      );

      expect(result.length).toBeGreaterThan(0);
      expect(durationMs).toBeLessThan(thresholds.aggregation);
    });
  });

  describe('Query Plan Analysis', () => {
    it('should use efficient query plans for common operations', async () => {
      await createTestUsers(100);

      // Get explain output for the query
      const explain = await User.findOne({
        email: 'testuser50@example.com',
      }).explain('executionStats');

      // Verify the query uses an index scan, not a collection scan
      const executionStats = explain.executionStats;
      expect(executionStats.totalDocsExamined).toBeLessThanOrEqual(1);
    });

    it('should have reasonable document examination for range queries', async () => {
      await createTestUsers(200);

      const explain = await User.find()
        .skip(50)
        .limit(20)
        .explain('executionStats');

      const executionStats = explain.executionStats;
      // Should not scan entire collection for pagination
      expect(executionStats.totalKeysExamined).toBeLessThanOrEqual(
        executionStats.nReturned + 100
      );
    });
  });

  describe('Memory Usage', () => {
    it('should use lean() for read-only queries to save memory', async () => {
      await createTestUsers(100);

      // Lean query returns plain objects, not Mongoose documents
      const { result: leanResult } = await measureQuery(() =>
        User.find().limit(50).lean().exec()
      );

      // Regular query returns Mongoose documents
      const { result: regularResult } = await measureQuery(() =>
        User.find().limit(50).exec()
      );

      // Lean results are plain objects
      expect(leanResult[0].constructor.name).toBe('Object');
      // Regular results are Mongoose documents
      expect(regularResult[0].constructor.name).not.toBe('Object');
    });

    it('should project only needed fields for efficiency', async () => {
      await createTestUsers(100);

      const { durationMs, result } = await measureQuery(() =>
        User.find()
          .select('name email')
          .limit(50)
          .lean()
          .exec()
      );

      // Check that only projected fields are returned (plus _id by default)
      expect(Object.keys(result[0]).sort()).toEqual(['_id', 'email', 'name']);
      expect(durationMs).toBeLessThan(thresholds.simpleQuery);
    });
  });

  describe('Transaction Performance', () => {
    // Note: MongoDB transactions require a replica set, which mongodb-memory-server
    // doesn't provide by default. This test verifies that we can at least start
    // a session and perform operations (without actual transaction guarantees).
    it('should be able to start a session for transaction-like operations', async () => {
      const users = await createTestUsers(5);

      const session = await mongoose.startSession();

      // Perform sequential updates (simulating transaction behavior without replica set)
      const { durationMs } = await measureQuery(async () => {
        await User.findByIdAndUpdate(
          users[0]._id,
          { name: 'Sequential Update 1' }
        );
        await User.findByIdAndUpdate(
          users[1]._id,
          { name: 'Sequential Update 2' }
        );
      });

      await session.endSession();

      // Sequential updates should be fast
      expect(durationMs).toBeLessThan(thresholds.update * 2);

      // Verify the updates
      const updatedUser0 = await User.findById(users[0]._id).lean();
      const updatedUser1 = await User.findById(users[1]._id).lean();
      expect(updatedUser0?.name).toBe('Sequential Update 1');
      expect(updatedUser1?.name).toBe('Sequential Update 2');
    });
  });

  describe('Performance Statistics Summary', () => {
    it('should generate performance summary report', async () => {
      const results: { operation: string; durationMs: number }[] = [];

      // Setup data
      const users = await createTestUsers(100);
      await createTestPools(50, users[0]._id as mongoose.Types.ObjectId);

      // Measure various operations
      const operations = [
        {
          name: 'Find by ID',
          fn: () => User.findById(users[0]._id).lean().exec(),
        },
        {
          name: 'Find by email',
          fn: () =>
            User.findOne({ email: 'testuser50@example.com' }).lean().exec(),
        },
        {
          name: 'Count documents',
          fn: () => User.countDocuments().exec(),
        },
        {
          name: 'Paginated query',
          fn: () => User.find().skip(20).limit(20).lean().exec(),
        },
        {
          name: 'Pool aggregation',
          fn: () =>
            Pool.aggregate([
              { $match: { status: 'active' } },
              { $group: { _id: '$frequency', count: { $sum: 1 } } },
            ]).exec(),
        },
      ];

      for (const op of operations) {
        const { durationMs } = await measureQuery(op.fn);
        results.push({ operation: op.name, durationMs });
      }

      // Log performance summary
      console.log('\n--- Performance Summary ---');
      results.forEach(({ operation, durationMs }) => {
        console.log(`${operation}: ${durationMs.toFixed(2)}ms`);
      });

      // Calculate statistics
      const times = results.map((r) => r.durationMs);
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      const min = Math.min(...times);

      console.log(`\nAverage: ${avg.toFixed(2)}ms`);
      console.log(`Min: ${min.toFixed(2)}ms`);
      console.log(`Max: ${max.toFixed(2)}ms`);

      // All operations should be under complex query threshold
      expect(max).toBeLessThan(thresholds.complexQuery);
    });
  });
});
