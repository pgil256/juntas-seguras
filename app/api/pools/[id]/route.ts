import { NextRequest, NextResponse } from 'next/server';
import { Pool, UpdatePoolRequest } from '../../../../types/pool';
import connectToDatabase from '../../../../lib/db/connect';
import getPoolModel from '../../../../lib/db/models/pool';
import { User } from '../../../../lib/db/models/user';
import { getCurrentUser } from '../../../../lib/auth';
import { ApiError, errorResponse, ApiErrors } from '../../../../lib/api';

interface PoolMemberDB {
  id: number;
  email: string;
  role: string;
}

// GET /api/pools/[id] - Get a specific pool by ID
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

    // Check if the user is a member of this pool
    if (!user.pools.includes(poolId)) {
      return errorResponse('You are not a member of this pool', { status: 403 });
    }

    return NextResponse.json({ success: true, pool });
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error.message, { status: error.status });
    }
    console.error('API error:', error);
    return ApiErrors.internalError();
  }
}

// PATCH /api/pools/[id] - Update a pool
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
    const body = await request.json() as UpdatePoolRequest;

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

    const userEmailLower = user.email?.toLowerCase();
    const userMember = pool.members.find((member: PoolMemberDB & { userId?: unknown }) =>
      member.userId?.toString() === user._id.toString() ||
      member.email?.toLowerCase() === userEmailLower
    );

    if (!userMember || !['admin', 'creator'].includes(userMember.role)) {
      return errorResponse('Only pool administrators can update the pool', { status: 403 });
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

    return NextResponse.json({
      success: true,
      pool: {
        id: updatedPool.id,
        name: updatedPool.name,
        description: updatedPool.description,
        status: updatedPool.status
      }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error.message, { status: error.status });
    }
    console.error('API error:', error);
    return ApiErrors.internalError();
  }
}

// DELETE /api/pools/[id] - Delete a pool
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

    // Check if the user is an admin of this pool
    const adminMember = pool.members.find((member: PoolMemberDB) => member.role === 'admin');

    if (!adminMember || user.email !== adminMember.email) {
      return errorResponse('Only pool administrators can delete the pool', { status: 403 });
    }

    // Get all member user IDs before deleting the pool
    const memberUserIds = pool.members
      .filter((member: PoolMemberDB) => member.email)
      .map((member: PoolMemberDB) => member.email);

    // Delete the pool
    await PoolModel.deleteOne({ id: poolId });

    // Remove this pool from ALL members' pools arrays
    if (memberUserIds.length > 0) {
      await User.updateMany(
        { email: { $in: memberUserIds } },
        { $pull: { pools: poolId } }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pool deleted successfully'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error.message, { status: error.status });
    }
    console.error('API error:', error);
    return ApiErrors.internalError();
  }
}
