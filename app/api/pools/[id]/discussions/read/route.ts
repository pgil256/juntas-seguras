/**
 * Discussion Read Tracking API Routes
 *
 * Handles marking discussions as read and getting unread counts.
 *
 * Endpoints:
 * - GET  /api/pools/[id]/discussions/read - Get unread count
 * - POST /api/pools/[id]/discussions/read - Mark discussions as read
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '../../../../../../lib/db/connect';
import { Discussion } from '../../../../../../lib/db/models/discussion';
import { DiscussionReadReceipt } from '../../../../../../lib/db/models/discussionReadReceipt';
import { Pool } from '../../../../../../lib/db/models/pool';
import { getCurrentUser } from '../../../../../../lib/auth';

/**
 * GET /api/pools/[id]/discussions/read
 *
 * Gets unread discussion count for the current user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await params;

    if (!poolId) {
      return NextResponse.json(
        { error: 'Pool ID is required' },
        { status: 400 }
      );
    }

    // Get current user
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    await connectToDatabase();

    // Find pool by string UUID id
    const pool = await Pool.findOne({ id: poolId });
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    // Get "mark all as read" timestamp
    const bulkReadRecord = await DiscussionReadReceipt.findOne({
      userId: user._id,
      poolId: pool._id,
      discussionId: { $exists: false }
    }).lean();

    const bulkReadAt = bulkReadRecord ? new Date((bulkReadRecord as any).readAt) : new Date(0);

    // Get IDs of specifically read discussions
    const readReceipts = await DiscussionReadReceipt.find({
      userId: user._id,
      poolId: pool._id,
      discussionId: { $exists: true }
    }).distinct('discussionId');

    // Count unread discussions
    const unreadCount = await Discussion.countDocuments({
      poolId: pool._id,
      deleted: false,
      parentId: { $exists: false },
      createdAt: { $gt: bulkReadAt },
      _id: { $nin: readReceipts }
    });

    // Get total discussion count
    const totalCount = await Discussion.countDocuments({
      poolId: pool._id,
      deleted: false,
      parentId: { $exists: false }
    });

    return NextResponse.json({
      unreadCount,
      totalCount,
      lastReadAt: bulkReadRecord ? (bulkReadRecord as any).readAt.toISOString() : null
    });

  } catch (error) {
    console.error('Error getting unread count:', error);
    return NextResponse.json(
      { error: 'Failed to get unread count' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pools/[id]/discussions/read
 *
 * Marks discussions as read.
 *
 * Request Body:
 * {
 *   discussionIds?: string[]  // Specific discussions to mark as read
 *   markAll?: boolean         // Mark all discussions as read
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await params;

    if (!poolId) {
      return NextResponse.json(
        { error: 'Pool ID is required' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { discussionIds, markAll } = body;

    if (!markAll && (!discussionIds || !Array.isArray(discussionIds) || discussionIds.length === 0)) {
      return NextResponse.json(
        { error: 'Either discussionIds or markAll is required' },
        { status: 400 }
      );
    }

    // Get current user
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    await connectToDatabase();

    // Find pool by string UUID id
    const pool = await Pool.findOne({ id: poolId });
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    if (markAll) {
      // Mark all discussions as read
      await DiscussionReadReceipt.markAllAsRead(user._id, pool._id);

      return NextResponse.json({
        success: true,
        markedAll: true
      });
    } else {
      // Validate discussion IDs
      const validIds = discussionIds.filter((id: string) =>
        mongoose.Types.ObjectId.isValid(id)
      );

      if (validIds.length === 0) {
        return NextResponse.json(
          { error: 'No valid discussion IDs provided' },
          { status: 400 }
        );
      }

      // Mark specific discussions as read
      const operations = validIds.map((id: string) =>
        DiscussionReadReceipt.markAsRead(
          user._id,
          pool._id,
          new mongoose.Types.ObjectId(id)
        )
      );

      await Promise.all(operations);

      return NextResponse.json({
        success: true,
        markedCount: validIds.length
      });
    }

  } catch (error) {
    console.error('Error marking discussions as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark as read' },
      { status: 500 }
    );
  }
}
