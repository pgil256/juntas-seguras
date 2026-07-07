import { NextRequest, NextResponse } from 'next/server';
import { AddMemberRequest, RemoveMemberRequest, UpdateMemberRequest, UpdatePositionsRequest, PoolMember } from '../../../../../types/pool';
import { getCurrentUser } from '../../../../../lib/auth';
import { ApiError, errorResponse, ApiErrors } from '../../../../../lib/api';
import connectToDatabase from '../../../../../lib/db/connect';
import getPoolModel from '../../../../../lib/db/models/pool';
import { User, UserDocument } from '../../../../../lib/db/models/user';

// Type for pool member from DB
interface PoolMemberDB {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  position: number;
  status?: string;
  paymentsOnTime?: number;
  paymentsMissed?: number;
  totalContributed?: number;
  payoutReceived?: boolean;
  payoutDate?: string;
  joinDate?: string;
}

interface PoolMessageDB {
  id: number;
  author: string;
  content: string;
  date: string;
}

// GET /api/pools/[id]/members - Get all members for a pool
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return errorResponse(userResult.error.message, { status: userResult.error.status });
    }
    const user = userResult.user;

    const { id: poolId } = await params;

    if (!poolId) {
      return errorResponse('Pool ID is required', { status: 400 });
    }

    await connectToDatabase();
    const PoolModel = getPoolModel();

    // Get the pool from database
    const pool = await PoolModel.findOne({ id: poolId });

    if (!pool) {
      return errorResponse('Pool not found', { status: 404 });
    }

    // Check if the user is authorized to access this pool
    if (!user.pools.includes(poolId)) {
      return errorResponse('You are not a member of this pool', { status: 403 });
    }

    return NextResponse.json({
      success: true,
      members: pool.members || []
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error.message, { status: error.status });
    }
    console.error('API error:', error);
    return ApiErrors.internalError();
  }
}

// POST /api/pools/[id]/members - Add a new member to a pool
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return errorResponse(userResult.error.message, { status: userResult.error.status });
    }
    const user = userResult.user;

    const { id: poolId } = await params;
    const body = await request.json() as AddMemberRequest;

    if (!poolId) {
      return errorResponse('Pool ID is required', { status: 400 });
    }

    const { memberDetails } = body;

    if (!memberDetails || !memberDetails.name || !memberDetails.email) {
      return errorResponse('Member name and email are required', { status: 400 });
    }

    const PoolModel = getPoolModel();
    await connectToDatabase();

    // Get the pool from database
    const pool = await PoolModel.findOne({ id: poolId });

    if (!pool) {
      return errorResponse('Pool not found', { status: 404 });
    }

    // Check if the user is authorized to add members
    if (!user.pools.includes(poolId)) {
      return errorResponse('You are not a member of this pool', { status: 403 });
    }

    // Find the admin member in the pool
    const adminMember = pool.members.find((member: PoolMemberDB) => member.role === 'admin');
    if (!adminMember || adminMember.email !== user.email) {
      return errorResponse('Only pool administrators can add members', { status: 403 });
    }

    // Check if the member already exists in the pool
    const existingMember = pool.members.find((member: PoolMemberDB) => member.email === memberDetails.email);
    if (existingMember) {
      return errorResponse('A member with this email already exists in the pool', { status: 400 });
    }

    // Generate a unique member ID
    const memberId = Math.max(...pool.members.map((m: PoolMemberDB) => m.id), 0) + 1;

    // Determine the next available position
    const positions = pool.members.map((m: PoolMemberDB) => m.position);
    let nextPosition = 1;
    while (positions.includes(nextPosition)) {
      nextPosition++;
    }

    // Calculate payout date based on frequency and position
    const payoutDate = calculatePayoutDate(pool.frequency, nextPosition, pool.totalRounds);

    // Create the new member
    const newMember = {
      id: memberId,
      name: memberDetails.name,
      email: memberDetails.email,
      phone: memberDetails.phone || null,
      joinDate: new Date().toISOString(),
      role: memberDetails.role || 'member',
      position: memberDetails.position || nextPosition,
      status: 'upcoming',
      paymentsOnTime: 0,
      paymentsMissed: 0,
      totalContributed: 0,
      payoutReceived: false,
      payoutDate: payoutDate
    };

    // Add the member to the pool
    pool.members.push(newMember);
    pool.memberCount = pool.members.length;

    // Save the updated pool
    await PoolModel.updateOne({ id: poolId }, {
      $set: {
        members: pool.members,
        memberCount: pool.memberCount
      }
    });

    // Add a message to the pool
    const messageId = Math.max(...(pool.messages?.map((m: PoolMessageDB) => m.id) || [0]), 0) + 1;
    await PoolModel.updateOne({ id: poolId }, {
      $push: {
        messages: {
          id: messageId,
          author: 'System',
          content: `${user.name} added ${newMember.name} to the pool.`,
          date: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({
      success: true,
      member: newMember
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error.message, { status: error.status });
    }
    console.error('API error:', error);
    return ApiErrors.internalError();
  }
}

// PATCH /api/pools/[id]/members - Update members or positions
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return errorResponse(userResult.error.message, { status: userResult.error.status });
    }
    const user = userResult.user;

    const { id: poolId } = await params;

    if (!poolId) {
      return errorResponse('Pool ID is required', { status: 400 });
    }

    await connectToDatabase();

    // Check if this is a position update request
    const isPositionUpdate = request.url.includes('positions=true');

    if (isPositionUpdate) {
      // Handle position updates
      const body = await request.json() as UpdatePositionsRequest;
      return await handlePositionUpdates(poolId, user, body);
    } else {
      // Handle individual member update
      const body = await request.json() as UpdateMemberRequest;
      return await handleMemberUpdate(poolId, user, body);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error.message, { status: error.status });
    }
    console.error('API error:', error);
    return ApiErrors.internalError();
  }
}

// DELETE /api/pools/[id]/members - Remove a member from a pool
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return errorResponse(userResult.error.message, { status: userResult.error.status });
    }
    const user = userResult.user;

    const { id: poolId } = await params;
    const memberId = parseInt(request.nextUrl.searchParams.get('memberId') || '0');

    if (!poolId) {
      return errorResponse('Pool ID is required', { status: 400 });
    }

    if (!memberId) {
      return errorResponse('Member ID is required', { status: 400 });
    }

    const PoolModel = getPoolModel();
    await connectToDatabase();

    // Get the pool from database
    const pool = await PoolModel.findOne({ id: poolId });

    if (!pool) {
      return errorResponse('Pool not found', { status: 404 });
    }

    // Find the admin member in the pool
    const adminMember = pool.members.find((member: PoolMemberDB) => member.role === 'admin');
    if (!adminMember || adminMember.email !== user.email) {
      return errorResponse('Only pool administrators can remove members', { status: 403 });
    }

    // Find the member to remove
    const memberToRemove = pool.members.find((member: PoolMemberDB) => member.id === memberId);
    if (!memberToRemove) {
      return errorResponse('Member not found in this pool', { status: 404 });
    }

    // Check if the user is trying to remove the admin
    if (memberToRemove.role === 'admin') {
      return errorResponse('You cannot remove the pool administrator', { status: 400 });
    }

    // Remove the member from the pool
    const updatedMembers = pool.members.filter((member: PoolMemberDB) => member.id !== memberId);

    // Update the pool
    await PoolModel.updateOne({ id: poolId }, {
      $set: {
        members: updatedMembers,
        memberCount: updatedMembers.length
      }
    });

    // Remove this pool from the removed member's pools array
    if (memberToRemove.email) {
      await User.updateOne(
        { email: memberToRemove.email.toLowerCase() },
        { $pull: { pools: poolId } }
      );
    }

    // Add a message to the pool
    const messageId = Math.max(...(pool.messages?.map((m: PoolMessageDB) => m.id) || [0]), 0) + 1;
    await PoolModel.updateOne({ id: poolId }, {
      $push: {
        messages: {
          id: messageId,
          author: 'System',
          content: `${user.name} removed ${memberToRemove.name} from the pool.`,
          date: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error.message, { status: error.status });
    }
    console.error('API error:', error);
    return ApiErrors.internalError();
  }
}

// Helper function to handle individual member updates
async function handleMemberUpdate(poolId: string, user: UserDocument, body: UpdateMemberRequest) {
  const { memberId, updates } = body;

  if (!memberId || !updates) {
    throw new ApiError('Member ID and updates are required', 400);
  }

  const PoolModel = getPoolModel();

  // Get the pool from database
  const pool = await PoolModel.findOne({ id: poolId });

  if (!pool) {
    throw new ApiError('Pool not found', 404);
  }

  // Find the admin member in the pool
  const adminMember = pool.members.find((member: PoolMemberDB) => member.role === 'admin');
  if (!adminMember || adminMember.email !== user.email) {
    throw new ApiError('Only pool administrators can update members', 403);
  }

  // Find the member to update
  const memberIndex = pool.members.findIndex((member: PoolMemberDB) => member.id === memberId);
  if (memberIndex === -1) {
    throw new ApiError('Member not found in this pool', 404);
  }

  // Update the member
  const member = pool.members[memberIndex];
  const updatedMember = { ...member };

  if (updates.name) updatedMember.name = updates.name;
  if (updates.email) updatedMember.email = updates.email;
  if (updates.phone) updatedMember.phone = updates.phone;
  if (updates.role) updatedMember.role = updates.role;
  if (updates.paymentsOnTime !== undefined) updatedMember.paymentsOnTime = updates.paymentsOnTime;
  if (updates.paymentsMissed !== undefined) updatedMember.paymentsMissed = updates.paymentsMissed;
  if (updates.payoutReceived !== undefined) updatedMember.payoutReceived = updates.payoutReceived;
  if (updates.payoutDate) updatedMember.payoutDate = updates.payoutDate;

  // Handle position update separately if needed
  if (updates.position && updates.position !== member.position) {
    const positionExists = pool.members.some((m: PoolMemberDB) => m.id !== memberId && m.position === updates.position);
    if (positionExists) {
      throw new ApiError('Position already assigned to another member', 400);
    }
    updatedMember.position = updates.position;
  }

  // Update the member in the pool
  pool.members[memberIndex] = updatedMember;

  // Save the updated pool
  await PoolModel.updateOne({ id: poolId }, {
    $set: {
      members: pool.members
    }
  });

  // Add a message to the pool if significant change
  if (updates.role || updates.position || updates.payoutReceived) {
    const messageId = Math.max(...(pool.messages?.map((m: PoolMessageDB) => m.id) || [0]), 0) + 1;
    let messageContent = `${user.name} updated ${updatedMember.name}'s information.`;

    if (updates.role) {
      messageContent = `${user.name} changed ${updatedMember.name}'s role to ${updates.role}.`;
    } else if (updates.position) {
      messageContent = `${user.name} changed ${updatedMember.name}'s position to ${updates.position}.`;
    } else if (updates.payoutReceived) {
      messageContent = `${updatedMember.name}'s payout has been marked as received.`;
    }

    await PoolModel.updateOne({ id: poolId }, {
      $push: {
        messages: {
          id: messageId,
          author: 'System',
          content: messageContent,
          date: new Date().toISOString()
        }
      }
    });
  }

  return NextResponse.json({
    success: true,
    member: updatedMember
  });
}

// Helper function to handle position updates for multiple members
async function handlePositionUpdates(poolId: string, user: UserDocument, body: UpdatePositionsRequest) {
  const { positions } = body;

  if (!positions || !Array.isArray(positions) || positions.length === 0) {
    throw new ApiError('Position updates are required', 400);
  }

  const PoolModel = getPoolModel();

  // Get the pool from database
  const pool = await PoolModel.findOne({ id: poolId });

  if (!pool) {
    throw new ApiError('Pool not found', 404);
  }

  // Find the admin member in the pool
  const adminMember = pool.members.find((member: PoolMemberDB) => member.role === 'admin');
  if (!adminMember || adminMember.email !== user.email) {
    throw new ApiError('Only pool administrators can update member positions', 403);
  }

  // Verify all member IDs exist
  const memberIds = positions.map(p => p.memberId);
  const existingMembers = pool.members.filter((m: PoolMemberDB) => memberIds.includes(m.id));

  if (existingMembers.length !== memberIds.length) {
    throw new ApiError('One or more members not found in this pool', 400);
  }

  // Verify no duplicate positions
  const positionValues = positions.map(p => p.position);
  const uniquePositions = new Set(positionValues);

  if (uniquePositions.size !== positionValues.length) {
    throw new ApiError('Duplicate positions are not allowed', 400);
  }

  // Update positions
  for (const posUpdate of positions) {
    const member = pool.members.find((m: PoolMemberDB) => m.id === posUpdate.memberId);
    if (member) {
      member.position = posUpdate.position;
    }
  }

  // Save the updated pool
  await PoolModel.updateOne({ id: poolId }, {
    $set: {
      members: pool.members
    }
  });

  // Add a message to the pool
  const messageId = Math.max(...(pool.messages?.map((m: PoolMessageDB) => m.id) || [0]), 0) + 1;
  await PoolModel.updateOne({ id: poolId }, {
    $push: {
      messages: {
        id: messageId,
        author: 'System',
        content: `${user.name} updated the member positions in the pool.`,
        date: new Date().toISOString()
      }
    }
  });

  return NextResponse.json({
    success: true,
    message: 'Member positions updated successfully'
  });
}

// Helper function to calculate a payout date based on position
function calculatePayoutDate(frequency: string, position: number, totalRounds: number): string {
  const today = new Date();
  let payoutDate: Date;

  // Calculate interval in days based on frequency
  let intervalDays: number;
  switch (frequency.toLowerCase()) {
    case 'daily':
      intervalDays = 1;
      break;
    case 'weekly':
      intervalDays = 7;
      break;
    case 'biweekly':
      intervalDays = 14;
      break;
    case 'monthly':
      intervalDays = 30;
      break;
    default:
      intervalDays = 30;
  }

  // Calculate days until payout
  const daysUntilPayout = intervalDays * position;

  // Calculate payout date
  payoutDate = new Date(today.setDate(today.getDate() + daysUntilPayout));

  return payoutDate.toISOString();
}
