# Service Layer Patterns

## Overview

The service layer (`lib/services/`) contains business logic that can be reused across multiple API routes.

## Service Structure

```
lib/services/
├── mfa.ts              # MFA code generation/verification
├── notifications.ts    # Notification handling
├── email.ts            # Email sending
└── pool.ts             # Pool business logic
```

## Service Pattern Template

```typescript
// lib/services/pool.ts
import Pool, { IPool } from '@/lib/db/models/Pool';
import User from '@/lib/db/models/User';
import connectDB from '@/lib/db/connect';

export class PoolService {
  /**
   * Create a new pool with the creator as the first member
   */
  static async createPool(
    creatorId: string,
    data: {
      name: string;
      contributionAmount: number;
      frequency: string;
      maxMembers: number;
      description?: string;
    }
  ): Promise<IPool> {
    await connectDB();

    const pool = await Pool.create({
      ...data,
      creatorId,
      members: [{
        userId: creatorId,
        position: 1,
        status: 'active',
        joinedAt: new Date()
      }],
      currentRound: 0,
      status: 'pending'
    });

    return pool;
  }

  /**
   * Add a member to a pool
   */
  static async addMember(
    poolId: string,
    userId: string
  ): Promise<IPool | null> {
    await connectDB();

    const pool = await Pool.findById(poolId);
    if (!pool) return null;

    // Check if pool is full
    if (pool.members.length >= pool.maxMembers) {
      throw new Error('Pool is full');
    }

    // Check if user is already a member
    const isMember = pool.members.some(
      m => m.userId.toString() === userId
    );
    if (isMember) {
      throw new Error('User is already a member');
    }

    // Add member
    const nextPosition = pool.members.length + 1;
    pool.members.push({
      userId,
      position: nextPosition,
      status: 'active',
      joinedAt: new Date()
    });

    await pool.save();
    return pool;
  }

  /**
   * Get pools for a user
   */
  static async getUserPools(userId: string): Promise<IPool[]> {
    await connectDB();

    return Pool.find({
      'members.userId': userId,
      status: { $in: ['pending', 'active'] }
    })
      .populate('creatorId', 'name email')
      .sort({ createdAt: -1 });
  }

  /**
   * Calculate next payout recipient
   */
  static async getNextPayoutRecipient(
    poolId: string
  ): Promise<string | null> {
    await connectDB();

    const pool = await Pool.findById(poolId);
    if (!pool || pool.status !== 'active') return null;

    const nextRound = pool.currentRound + 1;
    const recipient = pool.members.find(
      m => m.position === nextRound && m.status === 'active'
    );

    return recipient?.userId.toString() || null;
  }
}
```

## Using Services in API Routes

```typescript
// app/api/pools/route.ts
import { PoolService } from '@/lib/services/pool';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const pool = await PoolService.createPool(
      session.user.id,
      body
    );

    return NextResponse.json(
      { pool, message: 'Pool created successfully' },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Create pool error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create pool' },
      { status: 400 }
    );
  }
}
```

## Email Service Pattern

```typescript
// lib/services/email.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

export class EmailService {
  static async sendMFACode(
    email: string,
    code: string
  ): Promise<void> {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your verification code',
      html: `
        <h1>Verification Code</h1>
        <p>Your code is: <strong>${code}</strong></p>
        <p>This code expires in 10 minutes.</p>
      `
    });
  }

  static async sendPoolInvitation(
    email: string,
    poolName: string,
    inviterName: string,
    inviteLink: string
  ): Promise<void> {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `You're invited to join ${poolName}`,
      html: `
        <h1>Pool Invitation</h1>
        <p>${inviterName} has invited you to join "${poolName}".</p>
        <a href="${inviteLink}">Accept Invitation</a>
      `
    });
  }

  static async sendPaymentReminder(
    email: string,
    poolName: string,
    amount: number,
    dueDate: Date
  ): Promise<void> {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Payment reminder for ${poolName}`,
      html: `
        <h1>Payment Reminder</h1>
        <p>Your contribution of $${amount} for "${poolName}" is due on ${dueDate.toLocaleDateString()}.</p>
      `
    });
  }
}
```

## Notification Service Pattern

```typescript
// lib/services/notifications.ts
import Notification from '@/lib/db/models/Notification';
import NotificationPreference from '@/lib/db/models/NotificationPreference';
import { EmailService } from './email';

export class NotificationService {
  static async create(
    userId: string,
    type: string,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    // Create in-app notification
    await Notification.create({
      userId,
      type,
      title,
      message,
      data,
      read: false
    });

    // Check user preferences for email
    const prefs = await NotificationPreference.findOne({ userId });
    if (prefs?.emailEnabled && prefs.types?.[type]?.email) {
      const user = await User.findById(userId);
      if (user?.email) {
        await EmailService.sendNotification(
          user.email,
          title,
          message
        );
      }
    }
  }

  static async markAsRead(
    userId: string,
    notificationId: string
  ): Promise<void> {
    await Notification.updateOne(
      { _id: notificationId, userId },
      { read: true, readAt: new Date() }
    );
  }

  static async getUnread(userId: string): Promise<any[]> {
    return Notification.find({ userId, read: false })
      .sort({ createdAt: -1 })
      .limit(50);
  }
}
```

## Service Best Practices

1. **Single responsibility** - Each service handles one domain
2. **Stateless** - Services should not maintain state between calls
3. **Error handling** - Throw meaningful errors, catch in routes
4. **Database connection** - Always call `connectDB()` at start
5. **Type safety** - Use TypeScript interfaces for parameters and returns
6. **Logging** - Log important operations for debugging
7. **Transactions** - Use MongoDB transactions for multi-document operations
