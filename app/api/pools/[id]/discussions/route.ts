/**
 * Pool Discussions API Routes
 *
 * Handles the activity feed and discussions for pools.
 * Supports threaded discussions, @mentions, and auto-generated activity posts.
 *
 * Endpoints:
 * - GET  /api/pools/[id]/discussions - Fetch discussions with pagination
 * - POST /api/pools/[id]/discussions - Create a new discussion post
 *
 * Query Parameters (GET):
 * - limit: Number of discussions to return (default: 20, max: 50)
 * - skip: Number to skip for pagination
 * - before: ISO timestamp for cursor-based pagination
 * - type: Filter by discussion type (post, announcement, activity)
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '../../../../../lib/db/connect';
import { Discussion, DiscussionType } from '../../../../../lib/db/models/discussion';
import { DiscussionReadReceipt } from '../../../../../lib/db/models/discussionReadReceipt';
import { Pool } from '../../../../../lib/db/models/pool';
import { getCurrentUser } from '../../../../../lib/auth';
import { processMentions, parseMentions } from '../../../../../lib/activity/mentions';

/**
 * GET /api/pools/[id]/discussions
 *
 * Fetches discussions for a pool with pagination.
 * Returns discussions sorted by pinned status then creation time.
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

    // Parse query parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const before = url.searchParams.get('before');
    const typeFilter = url.searchParams.get('type') as DiscussionType | null;

    await connectToDatabase();

    // Find pool by string UUID id
    const pool = await Pool.findOne({ id: poolId });
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    // Build query
    const query: any = {
      poolId: pool._id,
      deleted: false,
      parentId: { $exists: false } // Only top-level discussions
    };

    if (typeFilter && Object.values(DiscussionType).includes(typeFilter)) {
      query.type = typeFilter;
    }

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    // Fetch discussions
    const discussions = await Discussion.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get read status for each discussion
    const discussionIds = discussions.map((d: any) => d._id);
    const readReceipts = await DiscussionReadReceipt.find({
      userId: user._id,
      discussionId: { $in: discussionIds }
    }).lean();

    const readDiscussionIds = new Set(
      readReceipts.map((r: any) => r.discussionId.toString())
    );

    // Get "mark all as read" timestamp
    const bulkReadRecord = await DiscussionReadReceipt.findOne({
      userId: user._id,
      poolId: pool._id,
      discussionId: { $exists: false }
    }).lean();

    const bulkReadAt = bulkReadRecord ? new Date((bulkReadRecord as any).readAt) : new Date(0);

    // Format discussions for response
    const formattedDiscussions = discussions.map((d: any) => {
      const createdAt = new Date(d.createdAt);
      const isRead = readDiscussionIds.has(d._id.toString()) ||
                     createdAt <= bulkReadAt;

      return {
        id: d._id.toString(),
        type: d.type,
        activityType: d.activityType,
        title: d.title,
        content: d.content,
        authorId: d.authorId.toString(),
        authorName: d.authorName,
        authorAvatar: d.authorAvatar,
        isPinned: d.isPinned,
        isEdited: d.isEdited,
        editedAt: d.editedAt?.toISOString(),
        replyCount: d.replyCount,
        mentions: d.mentions?.map((m: any) => m.toString()) || [],
        activityMetadata: d.activityMetadata,
        createdAt: d.createdAt.toISOString(),
        isRead,
        isOwnPost: d.authorId.toString() === user._id.toString()
      };
    });

    // Get total count for pagination
    const total = await Discussion.countDocuments({
      poolId: pool._id,
      deleted: false,
      parentId: { $exists: false }
    });

    // Get unread count
    const unreadCount = await getUnreadCount(user._id, pool._id, bulkReadAt);

    return NextResponse.json({
      discussions: formattedDiscussions,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + discussions.length < total
      },
      unreadCount
    });

  } catch (error) {
    console.error('Error fetching discussions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discussions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pools/[id]/discussions
 *
 * Creates a new discussion post.
 *
 * Request Body:
 * {
 *   content: string (required)
 *   title?: string (for announcements)
 *   type?: 'post' | 'announcement' (default: 'post')
 *   parentId?: string (for replies)
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
    const content = body.content?.trim();
    const title = body.title?.trim();
    const type = body.type || DiscussionType.POST;
    const parentId = body.parentId;

    // Validate content
    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (content.length > 10000) {
      return NextResponse.json(
        { error: 'Content cannot exceed 10000 characters' },
        { status: 400 }
      );
    }

    // Validate type
    if (type !== DiscussionType.POST && type !== DiscussionType.ANNOUNCEMENT) {
      return NextResponse.json(
        { error: 'Invalid discussion type' },
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

    // Verify user is a member of the pool
    const isMember = pool.members.some(
      (m: any) => m.userId?.toString() === user._id.toString()
    );

    if (!isMember) {
      return NextResponse.json(
        { error: 'You must be a pool member to post' },
        { status: 403 }
      );
    }

    // Check if announcements are admin-only
    if (type === DiscussionType.ANNOUNCEMENT) {
      const member = pool.members.find(
        (m: any) => m.userId?.toString() === user._id.toString()
      );
      if (member?.role !== 'admin' && member?.role !== 'creator') {
        return NextResponse.json(
          { error: 'Only admins can create announcements' },
          { status: 403 }
        );
      }
    }

    // Validate parent if this is a reply
    let parentDiscussion = null;
    if (parentId) {
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return NextResponse.json(
          { error: 'Invalid parent discussion ID' },
          { status: 400 }
        );
      }

      parentDiscussion = await Discussion.findOne({
        _id: new mongoose.Types.ObjectId(parentId),
        poolId: pool._id,
        deleted: false
      });

      if (!parentDiscussion) {
        return NextResponse.json(
          { error: 'Parent discussion not found' },
          { status: 404 }
        );
      }
    }

    // Create the discussion
    const discussion = await Discussion.create({
      poolId: pool._id,
      authorId: user._id,
      authorName: user.name || 'Unknown User',
      authorAvatar: user.avatar,
      type: parentId ? DiscussionType.REPLY : type,
      title: type === DiscussionType.ANNOUNCEMENT ? title : undefined,
      content,
      parentId: parentId ? new mongoose.Types.ObjectId(parentId) : undefined,
      mentions: [],
      isPinned: false,
      isEdited: false,
      deleted: false,
      replyCount: 0
    });

    // Process @mentions
    const mentionedUserIds = await processMentions(
      discussion._id,
      pool._id,
      user._id,
      user.name || 'Unknown User',
      discussion.type,
      content
    );

    // Update discussion with mentions
    if (mentionedUserIds.length > 0) {
      await Discussion.updateOne(
        { _id: discussion._id },
        { $set: { mentions: mentionedUserIds } }
      );
    }

    // Update parent's reply count if this is a reply
    if (parentDiscussion) {
      await Discussion.updateOne(
        { _id: parentDiscussion._id },
        { $inc: { replyCount: 1 } }
      );
    }

    // Mark as read by author
    await DiscussionReadReceipt.markAsRead(user._id, pool._id, discussion._id);

    // Format response
    const formattedDiscussion = {
      id: discussion._id.toString(),
      type: discussion.type,
      title: discussion.title,
      content: discussion.content,
      authorId: discussion.authorId.toString(),
      authorName: discussion.authorName,
      authorAvatar: discussion.authorAvatar,
      isPinned: discussion.isPinned,
      isEdited: discussion.isEdited,
      replyCount: discussion.replyCount,
      mentions: mentionedUserIds.map(id => id.toString()),
      parentId: parentId,
      createdAt: discussion.createdAt.toISOString(),
      isRead: true,
      isOwnPost: true
    };

    return NextResponse.json({
      success: true,
      discussion: formattedDiscussion
    });

  } catch (error) {
    console.error('Error creating discussion:', error);
    return NextResponse.json(
      { error: 'Failed to create discussion' },
      { status: 500 }
    );
  }
}

/**
 * Helper to get unread count
 */
async function getUnreadCount(
  userId: mongoose.Types.ObjectId,
  poolId: mongoose.Types.ObjectId,
  bulkReadAt: Date
): Promise<number> {
  // Get IDs of specifically read discussions
  const readReceipts = await DiscussionReadReceipt.find({
    userId,
    poolId,
    discussionId: { $exists: true }
  }).distinct('discussionId');

  return Discussion.countDocuments({
    poolId,
    deleted: false,
    parentId: { $exists: false },
    createdAt: { $gt: bulkReadAt },
    _id: { $nin: readReceipts }
  });
}
