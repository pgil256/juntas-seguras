import { NextRequest, NextResponse } from 'next/server';
import { AddMemberRequest, RemoveMemberRequest, UpdateMemberRequest, UpdatePositionsRequest } from '../../../../../types/pool';
import { handleApiRequest, ApiError } from '../../../../../lib/api';
import getPoolModel from '../../../../../lib/db/models/pool';
import getUserModel from '../../../../../lib/db/models/user';

// GET /api/pools/[id]/members - Get all members for a pool
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleApiRequest(request, async ({ userId }) => {
    const poolId = params.id;
    
    if (!poolId) {
      throw new ApiError('Pool ID is required', 400);
    }
    
    const PoolModel = getPoolModel();
    const UserModel = getUserModel();
    
    // Get the pool from database
    const pool = await PoolModel.findOne({ id: poolId });
    
    if (!pool) {
      throw new ApiError('Pool not found', 404);
    }
    
    // Check if the user is authorized to access this pool
    const user = await UserModel.findOne({ id: userId });
    if (!user || !user.pools.includes(poolId)) {
      throw new ApiError('You are not a member of this pool', 403);
    }
    
    return {
      members: pool.members || []
    };
  }, {
    requireAuth: true,
    methods: ['GET']
  });
}

// POST /api/pools/[id]/members - Add a new member to a pool
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleApiRequest(request, async ({ userId }) => {
    const poolId = params.id;
    const body = await request.json() as AddMemberRequest;
    
    if (!poolId) {
      throw new ApiError('Pool ID is required', 400);
    }
    
    const { memberDetails } = body;
    
    if (!memberDetails || !memberDetails.name || !memberDetails.email) {
      throw new ApiError('Member name and email are required', 400);
    }
    
    const PoolModel = getPoolModel();
    const UserModel = getUserModel();
    
    // Get the pool from database
    const pool = await PoolModel.findOne({ id: poolId });
    
    if (!pool) {
      throw new ApiError('Pool not found', 404);
    }
    
    // Get user information
    const user = await UserModel.findOne({ id: userId });
    if (!user) {
      throw new ApiError('User not found', 404);
    }
    
    // Check if the user is authorized to add members
    if (!user.pools.includes(poolId)) {
      throw new ApiError('You are not a member of this pool', 403);
    }
    
    // Find the admin member in the pool
    const adminMember = pool.members.find(member => member.role === 'admin');
    if (!adminMember || adminMember.email !== user.email) {
      throw new ApiError('Only pool administrators can add members', 403);
    }
    
    // Check if the member already exists in the pool
    const existingMember = pool.members.find(member => member.email === memberDetails.email);
    if (existingMember) {
      throw new ApiError('A member with this email already exists in the pool', 400);
    }
    
    // Generate a unique member ID
    const memberId = Math.max(...pool.members.map(m => m.id), 0) + 1;
    
    // Determine the next available position
    const positions = pool.members.map(m => m.position);
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
    const messageId = Math.max(...(pool.messages?.map(m => m.id) || [0]), 0) + 1;
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
    
    return {
      success: true,
      member: newMember
    };
  }, {
    requireAuth: true,
    methods: ['POST']
  });
}

// PATCH /api/pools/[id]/members - Update members or positions
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleApiRequest(request, async ({ userId }) => {
    const poolId = params.id;
    
    if (!poolId) {
      throw new ApiError('Pool ID is required', 400);
    }
    
    // Check if this is a position update request
    const isPositionUpdate = request.url.includes('positions=true');
    
    if (isPositionUpdate) {
      // Handle position updates
      const body = await request.json() as UpdatePositionsRequest;
      return await handlePositionUpdates(poolId, userId, body);
    } else {
      // Handle individual member update
      const body = await request.json() as UpdateMemberRequest;
      return await handleMemberUpdate(poolId, userId, body);
    }
  }, {
    requireAuth: true,
    methods: ['PATCH']
  });
}

// DELETE /api/pools/[id]/members - Remove a member from a pool
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleApiRequest(request, async ({ userId }) => {
    const poolId = params.id;
    const memberId = parseInt(request.nextUrl.searchParams.get('memberId') || '0');
    
    if (!poolId) {
      throw new ApiError('Pool ID is required', 400);
    }
    
    if (!memberId) {
      throw new ApiError('Member ID is required', 400);
    }
    
    const PoolModel = getPoolModel();
    const UserModel = getUserModel();
    
    // Get the pool from database
    const pool = await PoolModel.findOne({ id: poolId });
    
    if (!pool) {
      throw new ApiError('Pool not found', 404);
    }
    
    // Get user information
    const user = await UserModel.findOne({ id: userId });
    if (!user) {
      throw new ApiError('User not found', 404);
    }
    
    // Find the admin member in the pool
    const adminMember = pool.members.find(member => member.role === 'admin');
    if (!adminMember || adminMember.email !== user.email) {
      throw new ApiError('Only pool administrators can remove members', 403);
    }
    
    // Find the member to remove
    const memberToRemove = pool.members.find(member => member.id === memberId);
    if (!memberToRemove) {
      throw new ApiError('Member not found in this pool', 404);
    }
    
    // Check if the user is trying to remove the admin
    if (memberToRemove.role === 'admin') {
      throw new ApiError('You cannot remove the pool administrator', 400);
    }
    
    // Remove the member from the pool
    const updatedMembers = pool.members.filter(member => member.id !== memberId);
    
    // Update the pool
    await PoolModel.updateOne({ id: poolId }, { 
      $set: { 
        members: updatedMembers,
        memberCount: updatedMembers.length
      } 
    });
    
    // Add a message to the pool
    const messageId = Math.max(...(pool.messages?.map(m => m.id) || [0]), 0) + 1;
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
    
    return {
      success: true,
      message: 'Member removed successfully'
    };
  }, {
    requireAuth: true,
    methods: ['DELETE']
  });
}

// Helper function to handle individual member updates
async function handleMemberUpdate(poolId: string, userId: string, body: UpdateMemberRequest) {
  const { memberId, updates } = body;
  
  if (!memberId || !updates) {
    throw new ApiError('Member ID and updates are required', 400);
  }
  
  const PoolModel = getPoolModel();
  const UserModel = getUserModel();
  
  // Get the pool from database
  const pool = await PoolModel.findOne({ id: poolId });
  
  if (!pool) {
    throw new ApiError('Pool not found', 404);
  }
  
  // Get user information
  const user = await UserModel.findOne({ id: userId });
  if (!user) {
    throw new ApiError('User not found', 404);
  }
  
  // Find the admin member in the pool
  const adminMember = pool.members.find(member => member.role === 'admin');
  if (!adminMember || adminMember.email !== user.email) {
    throw new ApiError('Only pool administrators can update members', 403);
  }
  
  // Find the member to update
  const memberIndex = pool.members.findIndex(member => member.id === memberId);
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
    const positionExists = pool.members.some(m => m.id !== memberId && m.position === updates.position);
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
    const messageId = Math.max(...(pool.messages?.map(m => m.id) || [0]), 0) + 1;
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
  
  return {
    success: true,
    member: updatedMember
  };
}

// Helper function to handle position updates for multiple members
async function handlePositionUpdates(poolId: string, userId: string, body: UpdatePositionsRequest) {
  const { positions } = body;
  
  if (!positions || !Array.isArray(positions) || positions.length === 0) {
    throw new ApiError('Position updates are required', 400);
  }
  
  const PoolModel = getPoolModel();
  const UserModel = getUserModel();
  
  // Get the pool from database
  const pool = await PoolModel.findOne({ id: poolId });
  
  if (!pool) {
    throw new ApiError('Pool not found', 404);
  }
  
  // Get user information
  const user = await UserModel.findOne({ id: userId });
  if (!user) {
    throw new ApiError('User not found', 404);
  }
  
  // Find the admin member in the pool
  const adminMember = pool.members.find(member => member.role === 'admin');
  if (!adminMember || adminMember.email !== user.email) {
    throw new ApiError('Only pool administrators can update member positions', 403);
  }
  
  // Verify all member IDs exist
  const memberIds = positions.map(p => p.memberId);
  const existingMembers = pool.members.filter(m => memberIds.includes(m.id));
  
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
    const member = pool.members.find(m => m.id === posUpdate.memberId);
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
  const messageId = Math.max(...(pool.messages?.map(m => m.id) || [0]), 0) + 1;
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
  
  return {
    success: true,
    message: 'Member positions updated successfully'
  };
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