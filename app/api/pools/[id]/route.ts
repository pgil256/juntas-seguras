import { NextRequest, NextResponse } from 'next/server';
import { Pool, UpdatePoolRequest } from '../../../../types/pool';
import connectToDatabase from '../../../../lib/db/connect';
import getPoolModel from '../../../../lib/db/models/pool';
import getUserModel from '../../../../lib/db/models/user';
import { handleApiRequest, ApiError } from '../../../../lib/api';

// GET /api/pools/[id] - Get a specific pool by ID
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
    
    // Check if the user is a member of this pool
    const user = await UserModel.findOne({ id: userId });
    if (user && !user.pools.includes(poolId)) {
      throw new ApiError('You are not a member of this pool', 403);
    }
    
    return { pool };
  }, {
    requireAuth: true,
    methods: ['GET']
  });
}

// PATCH /api/pools/[id] - Update a pool
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleApiRequest(request, async ({ userId }) => {
    const poolId = params.id;
    const body = await request.json() as UpdatePoolRequest;
    
    if (!poolId) {
      throw new ApiError('Pool ID is required', 400);
    }
    
    const PoolModel = getPoolModel();
    
    // Get the pool from database
    const pool = await PoolModel.findOne({ id: poolId });
    
    if (!pool) {
      throw new ApiError('Pool not found', 404);
    }
    
    // Check if the user is an admin of this pool
    const userMember = pool.members.find(member => 
      // The user's email is stored in the member record
      member.email === (pool.members.find(m => m.id.toString() === '1')?.email)
    );
    
    if (!userMember || userMember.role !== 'admin') {
      throw new ApiError('Only pool administrators can update the pool', 403);
    }
    
    // Update pool properties
    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.description) updateData.description = body.description;
    if (body.status) updateData.status = body.status;
    
    // Update the pool
    await PoolModel.updateOne({ id: poolId }, { $set: updateData });
    
    // Get the updated pool
    const updatedPool = await PoolModel.findOne({ id: poolId });
    
    return {
      success: true,
      pool: {
        id: updatedPool.id,
        name: updatedPool.name,
        description: updatedPool.description,
        status: updatedPool.status
      }
    };
  }, {
    requireAuth: true,
    methods: ['PATCH']
  });
}

// DELETE /api/pools/[id] - Delete a pool
export async function DELETE(
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
    
    // Check if the user is an admin of this pool
    const adminMember = pool.members.find(member => member.role === 'admin');
    const user = await UserModel.findOne({ id: userId });
    
    if (!adminMember || user.email !== adminMember.email) {
      throw new ApiError('Only pool administrators can delete the pool', 403);
    }
    
    // Delete the pool
    await PoolModel.deleteOne({ id: poolId });
    
    // Remove this pool from the user's pools
    user.pools = user.pools.filter(id => id !== poolId);
    await user.save();
    
    return {
      success: true,
      message: 'Pool deleted successfully'
    };
  }, {
    requireAuth: true,
    methods: ['DELETE']
  });
}