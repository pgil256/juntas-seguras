# Database Patterns (MongoDB/Mongoose)

## Connection Pattern

```typescript
// lib/db/connect.ts - Singleton connection
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;
```

## Model Definition Pattern

```typescript
// lib/db/models/Pool.ts
import mongoose, { Schema, Document } from 'mongoose';

// Interface for TypeScript
export interface IPool extends Document {
  name: string;
  description?: string;
  contributionAmount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  maxMembers: number;
  creatorId: mongoose.Types.ObjectId;
  members: {
    userId: mongoose.Types.ObjectId;
    position: number;
    status: 'active' | 'inactive';
    joinedAt: Date;
  }[];
  currentRound: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const PoolSchema = new Schema<IPool>(
  {
    name: {
      type: String,
      required: [true, 'Pool name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    contributionAmount: {
      type: Number,
      required: [true, 'Contribution amount is required'],
      min: [1, 'Amount must be at least $1']
    },
    frequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly'],
      default: 'monthly'
    },
    maxMembers: {
      type: Number,
      required: true,
      min: [2, 'Pool must have at least 2 members'],
      max: [20, 'Pool cannot exceed 20 members']
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      position: Number,
      status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
      },
      joinedAt: {
        type: Date,
        default: Date.now
      }
    }],
    currentRound: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'cancelled'],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for performance
PoolSchema.index({ creatorId: 1 });
PoolSchema.index({ 'members.userId': 1 });
PoolSchema.index({ status: 1 });

// Export with caching check
export default mongoose.models.Pool ||
  mongoose.model<IPool>('Pool', PoolSchema);
```

## Common Query Patterns

### Find with Population

```typescript
// Find pool with member details
const pool = await Pool.findById(poolId)
  .populate('creatorId', 'name email')
  .populate('members.userId', 'name email avatar');
```

### Find with Filters

```typescript
// Find active pools for a user
const pools = await Pool.find({
  'members.userId': userId,
  status: 'active'
}).sort({ createdAt: -1 });
```

### Aggregation Pipeline

```typescript
// Get pool statistics
const stats = await Pool.aggregate([
  { $match: { status: 'active' } },
  {
    $group: {
      _id: null,
      totalPools: { $sum: 1 },
      avgContribution: { $avg: '$contributionAmount' },
      totalMembers: { $sum: { $size: '$members' } }
    }
  }
]);
```

### Update Operations

```typescript
// Update single document
await Pool.findByIdAndUpdate(
  poolId,
  { $set: { status: 'active' } },
  { new: true } // Return updated document
);

// Update nested array element
await Pool.updateOne(
  { _id: poolId, 'members.userId': userId },
  { $set: { 'members.$.status': 'inactive' } }
);

// Push to array
await Pool.findByIdAndUpdate(poolId, {
  $push: {
    members: {
      userId: newMemberId,
      position: nextPosition,
      status: 'active'
    }
  }
});
```

### Delete Operations

```typescript
// Soft delete (recommended)
await Pool.findByIdAndUpdate(poolId, {
  status: 'cancelled',
  cancelledAt: new Date()
});

// Hard delete (use sparingly)
await Pool.findByIdAndDelete(poolId);
```

## Transaction Pattern

```typescript
import mongoose from 'mongoose';

async function transferFunds(fromUserId: string, toUserId: string, amount: number) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Debit from sender
    await Payment.create([{
      userId: fromUserId,
      amount: -amount,
      type: 'transfer_out'
    }], { session });

    // Credit to receiver
    await Payment.create([{
      userId: toUserId,
      amount: amount,
      type: 'transfer_in'
    }], { session });

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

## Virtual Fields

```typescript
// In schema definition
PoolSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

PoolSchema.virtual('isFull').get(function() {
  return this.members.length >= this.maxMembers;
});

// Enable virtuals in JSON output
PoolSchema.set('toJSON', { virtuals: true });
```

## Pre/Post Hooks

```typescript
// Pre-save hook
PoolSchema.pre('save', function(next) {
  if (this.isNew) {
    // Add creator as first member
    this.members.push({
      userId: this.creatorId,
      position: 1,
      status: 'active'
    });
  }
  next();
});

// Post-save hook
PoolSchema.post('save', async function(doc) {
  // Send notification, update analytics, etc.
  await AuditLog.create({
    action: 'POOL_UPDATED',
    resourceId: doc._id
  });
});
```

## Common Mistakes to Avoid

1. **Not awaiting connectDB()** - Always `await connectDB()` before queries
2. **Missing indexes** - Add indexes for frequently queried fields
3. **Over-populating** - Only populate fields you need
4. **Not using lean()** - Use `.lean()` for read-only queries for better performance
5. **Ignoring validation** - Let Mongoose validation catch errors early

```typescript
// Performance: use lean() for read-only operations
const pools = await Pool.find({ status: 'active' }).lean();
```
