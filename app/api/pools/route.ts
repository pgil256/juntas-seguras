import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Pool, CreatePoolRequest } from '../../../types/pool';
import connectToDatabase from '../../../lib/db/connect';
import getPoolModel from '../../../lib/db/models/pool';
import getUserModel from '../../../lib/db/models/user';
import { handleApiRequest, ApiError } from '../../../lib/api';

// GET /api/pools - Get all pools for a user
export async function GET(request: NextRequest) {
  return handleApiRequest(request, async ({ userId }) => {
    const UserModel = getUserModel();
    const PoolModel = getPoolModel();
    
    // Find the user by MongoDB _id
    const user = await UserModel.findById(userId);
    
    if (!user) {
      console.error(`User not found in /api/pools for provided userId: ${userId}`);
      throw new ApiError('User not found', 404);
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
    const body = await request.json() as CreatePoolRequest;
    
    // Validate required fields
    if (!body.name) {
      throw new ApiError('Pool name is required', 400);
    }
    
    if (!body.contributionAmount || isNaN(Number(body.contributionAmount)) || Number(body.contributionAmount) <= 0) {
      throw new ApiError('Valid contribution amount is required', 400);
    }

    if (!body.totalRounds || isNaN(Number(body.totalRounds)) || Number(body.totalRounds) <= 0) {
      throw new ApiError('Valid number of rounds is required', 400);
    }
    
    const UserModel = getUserModel();
    const PoolModel = getPoolModel();
    
    // Find the user by MongoDB _id
    const user = await UserModel.findById(userId);
    
    if (!user) {
      console.error(`User not found in POST /api/pools for provided userId: ${userId}`);
      throw new ApiError('User not found', 404);
    }
    
    // Generate a unique ID
    const poolId = uuidv4();
    
    // Calculate member count based on total rounds
    // In this app, total rounds equals number of members
    const memberCount = body.totalRounds; 
    
    // Calculate payment schedule based on frequency and start date
    const startDate = body.startDate ? new Date(body.startDate) : new Date();
    const nextPayoutDate = calculateNextPayoutDate(startDate, body.frequency);
    
    // Create a new pool with the creator as the admin
    const newPool: Pool = {
      id: poolId,
      name: body.name,
      description: body.description || '',
      createdAt: new Date().toISOString(),
      status: 'active',
      totalAmount: 0, // Initial amount is 0
      contributionAmount: body.contributionAmount,
      frequency: body.frequency || 'weekly',
      currentRound: 0,
      totalRounds: body.totalRounds,
      nextPayoutDate: nextPayoutDate.toISOString(),
      memberCount,
      members: [
        {
          id: 1,
          name: user.name, // Use the actual user's name
          email: user.email, // Use the actual user's email
          joinDate: new Date().toISOString(),
          role: 'admin',
          position: 1, // Admin gets position 1 by default
          status: 'upcoming',
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
    
    // Process invitations if provided
    if (body.invitations && body.invitations.length > 0) {
      // In a real app, this would send email invitations
      // For now, just log the invitation requests
      console.log(`Sending ${body.invitations.length} invitations for pool ${poolId}`);
      
      // Generate welcome message
      newPool.messages.push({
        id: 2,
        author: user.name,
        content: `I've sent invitations to ${body.invitations.length} members to join our pool.`,
        date: new Date().toISOString()
      });
    }
    
    // Save the new pool to the database
    const poolDoc = await PoolModel.create(newPool);
    
    // Add this pool to the user's pools
    user.pools.push(poolId);
    await user.save();
    
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