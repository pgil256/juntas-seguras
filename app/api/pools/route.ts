import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Pool, CreatePoolRequest, PoolStatus, PoolMemberRole, PoolMemberStatus } from '../../../types/pool';
import connectToDatabase from '../../../lib/db/connect';
import getPoolModel from '../../../lib/db/models/pool';
import { User } from '../../../lib/db/models/user';
import { handleApiRequest, ApiError, findUserById } from '../../../lib/api';
import { createDefaultReminderSchedules } from '../../../lib/reminders/scheduler';
import { CreatePoolSchema, validateRequestBody } from '../../../lib/validation/schemas';

// GET /api/pools - Get all pools for a user
export async function GET(request: NextRequest) {
  return handleApiRequest(request, async ({ userId }) => {
    await connectToDatabase();
    const PoolModel = getPoolModel();

    // Find the user using centralized lookup with email fallback
    const user = await findUserById(userId);

    if (!user) {
      console.error(`User not found in /api/pools for provided userId: ${userId}`);
      throw new ApiError('User not found or invalid session', 401);
    }
    
    // Handle the case where user has no pools yet or pools array doesn't exist
    if (!user.pools || !Array.isArray(user.pools) || user.pools.length === 0) {
      return { 
        success: true, 
        pools: []
      };
    }
    
    try {
      // Get all pools that this user is a member of
      const pools = await PoolModel.find({ id: { $in: user.pools } });
      
      // Ensure we always return an array even if find() returns null or undefined
      return { 
        success: true,
        pools: Array.isArray(pools) ? pools : [] 
      };
    } catch (error) {
      console.error('Error fetching pools:', error);
      throw new ApiError('Failed to fetch pools', 500);
    }
  }, {
    requireAuth: true,
    methods: ['GET']
  });
}

// POST /api/pools - Create a new pool
export async function POST(request: NextRequest) {
  return handleApiRequest(request, async ({ userId }) => {
    // Validate request body using Zod schema
    const validationResult = await validateRequestBody(request, CreatePoolSchema);
    if (!validationResult.success) {
      throw new ApiError(validationResult.error, 400);
    }
    const body = validationResult.data;

    await connectToDatabase();
    const PoolModel = getPoolModel();

    // Find the user using centralized lookup with email fallback
    let user = await findUserById(userId);

    // If user not found, try to create from OAuth session
    if (!user) {
      const { getServerSession } = await import('next-auth/next');
      const { authOptions } = await import('../auth/[...nextauth]/options');
      const session = await getServerSession(authOptions);

      if (session?.user?.email) {
        console.log('Creating new user from OAuth session...');
        user = await User.create({
          email: session.user.email,
          name: session.user.name || 'Unknown',
          emailVerified: true,
          provider: 'azure-ad', // Default, will be corrected on next login
          lastLogin: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          verificationMethod: 'email',
          pools: [],
          twoFactorAuth: {
            enabled: false,
            method: 'email',
            verified: false,
            lastUpdated: new Date().toISOString(),
          },
        });
        console.log(`Created new user: ${user!.email}, _id: ${user!._id}`);
      }
    }

    if (!user) {
      console.error(`User not found in POST /api/pools for provided userId: ${userId}`);
      throw new ApiError('User not found or invalid session', 401);
    }
    
    // Generate a unique ID
    const poolId = uuidv4();
    
    // Calculate member count based on total rounds
    // In this app, total rounds equals number of members
    const memberCount = body.totalRounds; 
    
    // Calculate payment schedule based on frequency and start date
    const startDate = body.startDate ? new Date(body.startDate) : new Date();
    const nextPayoutDate = calculateNextPayoutDate(startDate, body.frequency);
    
    // Validate and set allowed payment methods (default to all if not provided)
    const validPaymentMethods: ('venmo' | 'cashapp' | 'paypal' | 'zelle')[] = ['venmo', 'cashapp', 'paypal', 'zelle'];
    let allowedPaymentMethods: ('venmo' | 'cashapp' | 'paypal' | 'zelle')[] = [...validPaymentMethods];

    if (body.allowedPaymentMethods && Array.isArray(body.allowedPaymentMethods)) {
      // Filter to only valid payment methods
      const filteredMethods = body.allowedPaymentMethods.filter(
        (method): method is 'venmo' | 'cashapp' | 'paypal' | 'zelle' =>
          validPaymentMethods.includes(method as any)
      );
      // If no valid methods provided, default to all
      if (filteredMethods.length > 0) {
        allowedPaymentMethods = filteredMethods;
      }
    }

    // Create a new pool with the creator as the admin
    const newPool: Pool = {
      id: poolId,
      name: body.name,
      description: body.description || '',
      createdAt: new Date().toISOString(),
      status: PoolStatus.ACTIVE,
      totalAmount: 0, // Initial amount is 0
      contributionAmount: body.contributionAmount,
      frequency: body.frequency || 'weekly',
      currentRound: 1, // Start at round 1
      totalRounds: body.totalRounds,
      nextPayoutDate: nextPayoutDate.toISOString(),
      memberCount,
      allowedPaymentMethods,
      members: [
        {
          id: 1,
          userId: user._id, // Add the user's MongoDB ID
          name: user.name, // Use the actual user's name
          email: user.email, // Use the actual user's email
          joinDate: new Date().toISOString(),
          role: PoolMemberRole.ADMIN,
          position: 1, // Admin gets position 1 by default
          status: PoolMemberStatus.CURRENT, // First member is current (will receive first payout)
          paymentsOnTime: 0,
          paymentsMissed: 0,
          totalContributed: 0,
          payoutReceived: false,
          payoutDate: nextPayoutDate.toISOString(),
          avatar: user.avatar || '',
        }
      ],
      transactions: [],
      messages: [
        {
          id: 1,
          author: 'System',
          content: `Pool "${body.name}" has been created. You are the administrator.`,
          date: new Date().toISOString()
        }
      ]
    };
    
    // Save the new pool to the database first
    const poolDoc = await PoolModel.create(newPool);

    // Create default reminder schedules for the new pool
    try {
      await createDefaultReminderSchedules(poolId, user._id);
      console.log(`Created default reminder schedules for pool ${poolId}`);
    } catch (reminderError) {
      // Log but don't fail pool creation if reminder setup fails
      console.error('Failed to create reminder schedules:', reminderError);
    }

    // Add this pool to the user's pools (ensure pools array exists)
    if (!user.pools) {
      user.pools = [];
    }
    user.pools.push(poolId);
    await user.save();
    
    // Process invitations if provided (after pool is created)
    if (body.invitations && body.invitations.length > 0) {
      console.log(`Sending ${body.invitations.length} invitations for pool ${poolId}`);
      
      // Send invitations using the invitations API
      for (const email of body.invitations) {
        try {
          const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/pools/${poolId}/invitations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'user-id': userId
            },
            body: JSON.stringify({
              email: email.trim(),
              poolId
            })
          });
          
          if (!response.ok) {
            console.error(`Failed to send invitation to ${email}`);
          } else {
            console.log(`Successfully sent invitation to ${email}`);
          }
        } catch (error) {
          console.error(`Error sending invitation to ${email}:`, error);
        }
      }
      
      // Generate welcome message
      newPool.messages.push({
        id: 2,
        author: user.name,
        content: `I've sent invitations to ${body.invitations.length} members to join our pool.`,
        date: new Date().toISOString()
      });
      
      // Update the pool with the new message
      await PoolModel.updateOne({ id: poolId }, { $set: { messages: newPool.messages } });
    }
    
    // Log activity (in a real app)
    // await logActivity(userId, 'pool_create', {
    //   poolId,
    //   poolName: newPool.name,
    //   memberCount: newPool.memberCount,
    //   contributionAmount: newPool.contributionAmount,
    //   frequency: newPool.frequency
    // });
    
    return {
      success: true,
      pool: newPool
    };
  }, {
    requireAuth: true,
    methods: ['POST']
  });
}

// Helper function to calculate next payout date based on frequency
function calculateNextPayoutDate(startDate: Date, frequency: string): Date {
  const nextDate = new Date(startDate);
  
  switch (frequency.toLowerCase()) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    default:
      // Default to weekly
      nextDate.setDate(nextDate.getDate() + 7);
  }
  
  return nextDate;
}