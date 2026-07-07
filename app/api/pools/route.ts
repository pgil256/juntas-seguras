import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Pool, CreatePoolRequest, PoolStatus, PoolMemberRole, PoolMemberStatus } from '../../../types/pool';
import connectToDatabase from '../../../lib/db/connect';
import getPoolModel from '../../../lib/db/models/pool';
import { User } from '../../../lib/db/models/user';
import { getCurrentUser, getSession } from '../../../lib/auth';
import { ApiError, errorResponse, ApiErrors } from '../../../lib/api';
import { createDefaultReminderSchedules } from '../../../lib/reminders/scheduler';
import { CreatePoolSchema, validateRequestBody } from '../../../lib/validation/schemas';
import { createBatchInvitations } from '../../../lib/services/invitations';

// GET /api/pools - Get all pools for a user
export async function GET(request: NextRequest) {
  try {
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return errorResponse(userResult.error.message, { status: userResult.error.status });
    }
    const user = userResult.user;

    await connectToDatabase();
    const PoolModel = getPoolModel();

    // Handle the case where user has no pools yet or pools array doesn't exist
    if (!user.pools || !Array.isArray(user.pools) || user.pools.length === 0) {
      return NextResponse.json({ success: true, pools: [] });
    }

    // Get all pools that this user is a member of
    const pools = await PoolModel.find({ id: { $in: user.pools } });

    // Ensure we always return an array even if find() returns null or undefined
    return NextResponse.json({
      success: true,
      pools: Array.isArray(pools) ? pools : [],
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error.message, { status: error.status });
    }
    console.error('Error fetching pools:', error);
    return errorResponse('Failed to fetch pools', { status: 500 });
  }
}

// POST /api/pools - Create a new pool
export async function POST(request: NextRequest) {
  try {
    // Resolve the current user. getCurrentUser returns an error when either there
    // is no session or the session user isn't in the DB. To preserve first-login
    // onboarding, distinguish the two: no session -> 401; session but no user ->
    // create the user from the OAuth session (after validating the request body).
    const { user: resolvedUser, error: authError } = await getCurrentUser();
    let user = resolvedUser;
    let onboardingSession: Awaited<ReturnType<typeof getSession>> = null;

    if (!user) {
      onboardingSession = await getSession();
      if (!onboardingSession?.user?.email) {
        return errorResponse(authError!.message, { status: authError!.status });
      }
    }

    // Validate request body using Zod schema
    const validationResult = await validateRequestBody(request, CreatePoolSchema);
    if (!validationResult.success) {
      return errorResponse(validationResult.error, { status: 400 });
    }
    const body = validationResult.data;

    await connectToDatabase();
    const PoolModel = getPoolModel();

    // Create the user from the OAuth session if they weren't in the DB yet.
    if (!user) {
      console.log('Creating new user from OAuth session...');
      user = await User.create({
        email: onboardingSession!.user!.email,
        name: onboardingSession!.user!.name || 'Unknown',
        emailVerified: true,
        provider: 'azure-ad', // Default, will be corrected on next login
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        verificationMethod: 'email',
        pools: [],
        twoFactorAuth: {
          enabled: true,
          method: 'email',
          verified: false,
          lastUpdated: new Date().toISOString(),
        },
      });
      console.log(`Created new user: ${user!.email}, _id: ${user!._id}`);
    }

    if (!user) {
      // Unreachable in practice: user was either resolved by getCurrentUser or
      // created above. Kept as a defensive guard (and to narrow the type).
      return errorResponse('User not found or invalid session', { status: 401 });
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

      // Send invitations using the invitation service (direct call, no HTTP)
      const invitationResults = await createBatchInvitations(
        poolId,
        body.invitations,
        user._id.toString(),
        user.name,
        user.email
      );

      const successCount = invitationResults.successful.length;
      const failCount = invitationResults.failed.length;

      if (failCount > 0) {
        console.warn(`Some invitations failed:`, invitationResults.failed);
      }
      console.log(`Successfully sent ${successCount} invitations for pool ${poolId}`);

      // Generate welcome message
      newPool.messages.push({
        id: 2,
        author: user.name,
        content: `I've sent invitations to ${successCount} members to join our pool.`,
        date: new Date().toISOString()
      });

      // Update the pool with the new message
      await PoolModel.updateOne({ id: poolId }, { $set: { messages: newPool.messages } });
    }

    return NextResponse.json({
      success: true,
      pool: newPool
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error.message, { status: error.status });
    }
    console.error('API error:', error);
    return ApiErrors.internalError();
  }
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
