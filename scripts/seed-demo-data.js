/**
 * Demo Data Seeding Script
 *
 * This script creates demo users and pools for testing the application.
 * Run with: node scripts/seed-demo-data.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in .env.local');
  process.exit(1);
}

// User Schema (simplified for seeding)
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  name: { type: String },
  phone: { type: String },
  pools: [{ type: String }],
  twoFactorAuth: {
    enabled: { type: Boolean, default: false },
    method: { type: String, default: 'email' },
    verified: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Pool Schema (simplified for seeding)
const PoolMemberSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  joinDate: { type: String, required: true },
  role: { type: String, required: true },
  position: { type: Number, required: true },
  status: { type: String, required: true },
  paymentsOnTime: { type: Number, default: 0 },
  paymentsMissed: { type: Number, default: 0 },
  totalContributed: { type: Number, default: 0 },
  payoutReceived: { type: Boolean, default: false },
  payoutDate: { type: String },
  avatar: { type: String }
});

const PoolTransactionSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  member: { type: String, required: true },
  status: { type: String, required: true },
  round: { type: Number }
});

const PoolMessageSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  author: { type: String, required: true },
  content: { type: String, required: true },
  date: { type: String, required: true }
});

const PoolSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  createdAt: { type: String, required: true },
  status: { type: String, required: true },
  totalAmount: { type: Number, default: 0 },
  contributionAmount: { type: Number, required: true },
  frequency: { type: String, required: true },
  currentRound: { type: Number, default: 1 },
  totalRounds: { type: Number, required: true },
  nextPayoutDate: { type: String },
  memberCount: { type: Number, default: 1 },
  members: [PoolMemberSchema],
  transactions: [PoolTransactionSchema],
  messages: [PoolMessageSchema]
});

async function seedDemoData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get or create models
    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Pool = mongoose.models.Pool || mongoose.model('Pool', PoolSchema);

    // Demo users data
    const demoUsers = [
      {
        email: 'demo@example.com',
        password: await bcrypt.hash('Demo123!', 10),
        name: 'Demo User',
        phone: '+1234567890'
      },
      {
        email: 'alice@example.com',
        password: await bcrypt.hash('Alice123!', 10),
        name: 'Alice Johnson',
        phone: '+1234567891'
      },
      {
        email: 'bob@example.com',
        password: await bcrypt.hash('Bob123!', 10),
        name: 'Bob Smith',
        phone: '+1234567892'
      },
      {
        email: 'carol@example.com',
        password: await bcrypt.hash('Carol123!', 10),
        name: 'Carol Williams',
        phone: '+1234567893'
      }
    ];

    console.log('\nCreating demo users...');
    const createdUsers = [];

    for (const userData of demoUsers) {
      let user = await User.findOne({ email: userData.email });
      if (!user) {
        user = await User.create({
          ...userData,
          pools: [],
          twoFactorAuth: {
            enabled: false,
            method: 'email',
            verified: false
          }
        });
        console.log(`  Created user: ${userData.email}`);
      } else {
        console.log(`  User already exists: ${userData.email}`);
      }
      createdUsers.push(user);
    }

    // Create a demo pool
    const poolId = uuidv4();
    const now = new Date();
    const nextPayoutDate = new Date(now);
    nextPayoutDate.setDate(nextPayoutDate.getDate() + 7);

    const existingPool = await Pool.findOne({ name: 'Family Savings Pool' });

    if (!existingPool) {
      console.log('\nCreating demo pool...');

      const demoPool = {
        id: poolId,
        name: 'Family Savings Pool',
        description: 'A weekly savings pool for our family to save together.',
        createdAt: now.toISOString(),
        status: 'active',
        totalAmount: 0,
        contributionAmount: 100,
        frequency: 'weekly',
        currentRound: 1,
        totalRounds: 4,
        nextPayoutDate: nextPayoutDate.toISOString(),
        memberCount: 4,
        members: [
          {
            id: 1,
            userId: createdUsers[0]._id,
            name: createdUsers[0].name,
            email: createdUsers[0].email,
            phone: createdUsers[0].phone,
            joinDate: now.toISOString(),
            role: 'admin',
            position: 1,
            status: 'current',
            paymentsOnTime: 0,
            paymentsMissed: 0,
            totalContributed: 0,
            payoutReceived: false,
            payoutDate: nextPayoutDate.toISOString()
          },
          {
            id: 2,
            userId: createdUsers[1]._id,
            name: createdUsers[1].name,
            email: createdUsers[1].email,
            phone: createdUsers[1].phone,
            joinDate: now.toISOString(),
            role: 'member',
            position: 2,
            status: 'upcoming',
            paymentsOnTime: 0,
            paymentsMissed: 0,
            totalContributed: 0,
            payoutReceived: false,
            payoutDate: new Date(nextPayoutDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 3,
            userId: createdUsers[2]._id,
            name: createdUsers[2].name,
            email: createdUsers[2].email,
            phone: createdUsers[2].phone,
            joinDate: now.toISOString(),
            role: 'member',
            position: 3,
            status: 'upcoming',
            paymentsOnTime: 0,
            paymentsMissed: 0,
            totalContributed: 0,
            payoutReceived: false,
            payoutDate: new Date(nextPayoutDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 4,
            userId: createdUsers[3]._id,
            name: createdUsers[3].name,
            email: createdUsers[3].email,
            phone: createdUsers[3].phone,
            joinDate: now.toISOString(),
            role: 'member',
            position: 4,
            status: 'upcoming',
            paymentsOnTime: 0,
            paymentsMissed: 0,
            totalContributed: 0,
            payoutReceived: false,
            payoutDate: new Date(nextPayoutDate.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString()
          }
        ],
        transactions: [],
        messages: [
          {
            id: 1,
            author: 'System',
            content: 'Pool "Family Savings Pool" has been created. Demo User is the administrator.',
            date: now.toISOString()
          },
          {
            id: 2,
            author: 'Demo User',
            content: 'Welcome everyone! Let\'s start saving together.',
            date: now.toISOString()
          }
        ]
      };

      await Pool.create(demoPool);
      console.log(`  Created pool: ${demoPool.name}`);

      // Update users with pool reference
      for (const user of createdUsers) {
        if (!user.pools.includes(poolId)) {
          user.pools.push(poolId);
          await user.save();
          console.log(`  Added pool to user: ${user.email}`);
        }
      }
    } else {
      console.log('\nDemo pool already exists');
    }

    console.log('\n========================================');
    console.log('Demo data seeding completed!');
    console.log('========================================');
    console.log('\nDemo Accounts:');
    console.log('  Email: demo@example.com');
    console.log('  Password: Demo123!');
    console.log('\n  Email: alice@example.com');
    console.log('  Password: Alice123!');
    console.log('\n  Email: bob@example.com');
    console.log('  Password: Bob123!');
    console.log('\n  Email: carol@example.com');
    console.log('  Password: Carol123!');
    console.log('\nAll users are members of "Family Savings Pool"');
    console.log('demo@example.com is the pool administrator');
    console.log('========================================\n');

  } catch (error) {
    console.error('Error seeding demo data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedDemoData();
