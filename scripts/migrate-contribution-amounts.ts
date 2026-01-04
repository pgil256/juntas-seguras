/**
 * Migration script: Normalize contribution amounts to valid $1-$20 range
 *
 * This script finds any existing pools with contribution amounts outside
 * the valid range (1-20) and updates them to a valid amount.
 *
 * Run with: npx ts-node scripts/migrate-contribution-amounts.ts
 * Or: node -r ts-node/register scripts/migrate-contribution-amounts.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set');
  process.exit(1);
}

// Define a minimal pool schema for migration
const PoolSchema = new mongoose.Schema({
  id: String,
  name: String,
  contributionAmount: Number,
});

async function migrateContributionAmounts() {
  console.log('Starting contribution amount migration...');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Pool = mongoose.models.Pool || mongoose.model('Pool', PoolSchema);

    // Find pools with invalid contribution amounts
    const invalidPools = await Pool.find({
      $or: [
        { contributionAmount: { $lt: 1 } },
        { contributionAmount: { $gt: 20 } },
        { contributionAmount: { $not: { $type: 'int' } } }
      ]
    });

    console.log(`Found ${invalidPools.length} pools with invalid contribution amounts`);

    if (invalidPools.length === 0) {
      console.log('No migration needed - all pools have valid contribution amounts');
      return;
    }

    // Update each invalid pool
    for (const pool of invalidPools) {
      const oldAmount = pool.contributionAmount;
      let newAmount: number;

      // Determine the new amount based on the old value
      if (typeof oldAmount !== 'number' || isNaN(oldAmount)) {
        newAmount = 10; // Default to $10 if invalid
      } else if (oldAmount < 1) {
        newAmount = 1; // Minimum $1
      } else if (oldAmount > 20) {
        newAmount = 20; // Maximum $20
      } else {
        newAmount = Math.round(oldAmount); // Round to nearest integer
      }

      console.log(`Pool "${pool.name}" (${pool.id}): $${oldAmount} -> $${newAmount}`);

      await Pool.updateOne(
        { _id: pool._id },
        { $set: { contributionAmount: newAmount } }
      );
    }

    console.log(`Successfully migrated ${invalidPools.length} pools`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
migrateContributionAmounts();
