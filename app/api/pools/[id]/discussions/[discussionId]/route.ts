/**
 * Discussion Detail API Routes
 *
 * Handles individual discussion operations.
 *
 * Endpoints:
 * - GET    /api/pools/[id]/discussions/[discussionId] - Get discussion with replies
 * - PUT    /api/pools/[id]/discussions/[discussionId] - Update discussion
 * - DELETE /api/pools/[id]/discussions/[discussionId] - Delete discussion
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '../../../../../../lib/db/connect';
import { Discussion, DiscussionType } from '../../../../../../lib/db/models/discussion';
import { DiscussionReadReceipt } from '../../../../../../lib/db/models/discussionReadReceipt';
import { DiscussionMention } from '../../../../../../lib/db/models/discussionMention';
import { Pool } from '../../../../../../lib/db/models/pool';
import { getCurrentUser } from '../../../../../../lib/auth';
import { processMentions } from '../../../../../../lib/activity/mentions';

/**
 * GET /api/pools/[id]/discussions/[discussionId]
 *
 * Fetches a discussion with its replies.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; discussionId: string }> }
) {
  try {
    const { id: poolId, discussionId } = await params;

    if (!poolId || !discussionId) {
      return NextResponse.json(
        { error: 'Pool ID and Discussion ID are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(discussionId)) {
      return NextResponse.json(
        { error: 'Invalid discussion ID' },
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

    // Find the discussion
    const discussionObjectId = new mongoose.Types.ObjectId(discussionId);
    const discussion = await Discussion.findOne({
      _id: discussionObjectId,
      poolId: pool._id,
      deleted: false
    }).lean();

    if (!discussion) {
      return NextResponse.json(
        { error: 'Discussion not found' },
        { status: 404 }
      );
    }

    // Get replies
    const url = new URL(request.url);
    const replyLimit = Math.min(parseInt(url.searchParams.get('replyLimit') || '50'), 100);
    const replySkip = parseInt(url.searchParams.get('replySkip') || '0');

    const replies = await Discussion.find({
      parentId: discussionObjectId,
      deleted: false
    })
      .sort({ createdAt: 1 })
      .skip(replySkip)
      .limit(replyLimit)
      .lean();

    // Mark discussion as read
    await DiscussionReadReceipt.markAsRead(user._id, pool._id, discussionObjectId);

    // Format discussion
    const formattedDiscussion = {
      id: (discussion as any)._id.toString(),
      type: (discussion as any).type,
      activityType: (discussion as any).activityType,
      title: (discussion as any).title,
      content: (discussion as any).content,
      authorId: (discussion as any).authorId.toString(),
      authorName: (discussion as any).authorName,
      authorAvatar: (discussion as any).authorAvatar,
      isPinned: (discussion as any).isPinned,
      isEdited: (discussion as any).isEdited,
      editedAt: (discussion as any).editedAt?.toISOString(),
      replyCount: (discussion as any).replyCount,
      mentions: (discussion as any).mentions?.map((m: any) => m.toString()) || [],
      activityMetadata: (discussion as any).activityMetadata,
      createdAt: (discussion as any).createdAt.toISOString(),
      isOwnPost: (discussion as any).authorId.toString() === user._id.toString()
    };

    // Format replies
    const formattedReplies = replies.map((r: any) => ({
      id: r._id.toString(),
      type: r.type,
      content: r.content,
      authorId: r.authorId.toString(),
      authorName: r.authorName,
      authorAvatar: r.authorAvatar,
      isEdited: r.isEdited,
      editedAt: r.editedAt?.toISOString(),
      mentions: r.mentions?.map((m: any) => m.toString()) || [],
      createdAt: r.createdAt.toISOString(),
      isOwnPost: r.authorId.toString() === user._id.toString()
    }));

    // Get total reply count for pagination
    const totalReplies = await Discussion.countDocuments({
      parentId: discussionObjectId,
      deleted: false
    });

    return NextResponse.json({
      discussion: formattedDiscussion,
      replies: formattedReplies,
      pagination: {
        totalReplies,
        replyLimit,
        replySkip,
        hasMoreReplies: replySkip + replies.length < totalReplies
      }
    });

  } catch (error) {
    console.error('Error fetching discussion:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discussion' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/pools/[id]/discussions/[discussionId]
 *
 * Updates a discussion.
 *
 * Request Body:
 * {
 *   content?: string
 *   title?: string (for announcements)
 *   isPinned?: boolean (admin only)
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; discussionId: string }> }
) {
  try {
    const { id: poolId, discussionId } = await params;

    if (!poolId || !discussionId) {
      return NextResponse.json(
        { error: 'Pool ID and Discussion ID are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(discussionId)) {
      return NextResponse.json(
        { error: 'Invalid discussion ID' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { content, title, isPinned } = body;

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

    // Find the discussion
    const discussionObjectId = new mongoose.Types.ObjectId(discussionId);
    const discussion = await Discussion.findOne({
      _id: discussionObjectId,
      poolId: pool._id,
      deleted: false
    });

    if (!discussion) {
      return NextResponse.json(
        { error: 'Discussion not found' },
        { status: 404 }
      );
    }

    // Check if user is the author or an admin
    const isAuthor = discussion.authorId.toString() === user._id.toString();
    const member = pool.members.find(
      (m: any) => m.userId?.toString() === user._id.toString()
    );
    const isAdmin = member?.role === 'admin' || member?.role === 'creator';

    // Only author can edit content
    if (content !== undefined && !isAuthor) {
      return NextResponse.json(
        { error: 'Only the author can edit content' },
        { status: 403 }
      );
    }

    // Only admin can pin/unpin
    if (isPinned !== undefined && !isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can pin discussions' },
        { status: 403 }
      );
    }

    // Cannot edit activity posts
    if (discussion.type === DiscussionType.ACTIVITY && content !== undefined) {
      return NextResponse.json(
        { error: 'Activity posts cannot be edited' },
        { status: 400 }
      );
    }

    // Build update object
    const update: any = {};

    if (content !== undefined) {
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        return NextResponse.json(
          { error: 'Content cannot be empty' },
          { status: 400 }
        );
      }
      if (trimmedContent.length > 10000) {
        return NextResponse.json(
          { error: 'Content cannot exceed 10000 characters' },
          { status: 400 }
        );
      }
      update.content = trimmedContent;
      update.isEdited = true;
      update.editedAt = new Date();

      // Re-process mentions
      const mentionedUserIds = await processMentions(
        discussion._id,
        pool._id,
        user._id,
        user.name || 'Unknown User',
        discussion.type,
        trimmedContent
      );
      update.mentions = mentionedUserIds;
    }

    if (title !== undefined && discussion.type === DiscussionType.ANNOUNCEMENT) {
      update.title = title.trim();
    }

    if (isPinned !== undefined) {
      update.isPinned = isPinned;
    }

    // Update the discussion
    const updatedDiscussion = await Discussion.findByIdAndUpdate(
      discussionObjectId,
      { $set: update },
      { new: true }
    ).lean();

    // Format response
    const formattedDiscussion = {
      id: (updatedDiscussion as any)._id.toString(),
      type: (updatedDiscussion as any).type,
      title: (updatedDiscussion as any).title,
      content: (updatedDiscussion as any).content,
      authorId: (updatedDiscussion as any).authorId.toString(),
      authorName: (updatedDiscussion as any).authorName,
      authorAvatar: (updatedDiscussion as any).authorAvatar,
      isPinned: (updatedDiscussion as any).isPinned,
      isEdited: (updatedDiscussion as any).isEdited,
      editedAt: (updatedDiscussion as any).editedAt?.toISOString(),
      replyCount: (updatedDiscussion as any).replyCount,
      mentions: (updatedDiscussion as any).mentions?.map((m: any) => m.toString()) || [],
      createdAt: (updatedDiscussion as any).createdAt.toISOString(),
      isOwnPost: true
    };

    return NextResponse.json({
      success: true,
      discussion: formattedDiscussion
    });

  } catch (error) {
    console.error('Error updating discussion:', error);
    return NextResponse.json(
      { error: 'Failed to update discussion' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pools/[id]/discussions/[discussionId]
 *
 * Soft deletes a discussion.
 * Only the author or admin can delete.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; discussionId: string }> }
) {
  try {
    const { id: poolId, discussionId } = await params;

    if (!poolId || !discussionId) {
      return NextResponse.json(
        { error: 'Pool ID and Discussion ID are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(discussionId)) {
      return NextResponse.json(
        { error: 'Invalid discussion ID' },
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

    // Find the discussion
    const discussionObjectId = new mongoose.Types.ObjectId(discussionId);
    const discussion = await Discussion.findOne({
      _id: discussionObjectId,
      poolId: pool._id,
      deleted: false
    });

    if (!discussion) {
      return NextResponse.json(
        { error: 'Discussion not found' },
        { status: 404 }
      );
    }

    // Check if user can delete
    const isAuthor = discussion.authorId.toString() === user._id.toString();
    const member = pool.members.find(
      (m: any) => m.userId?.toString() === user._id.toString()
    );
    const isAdmin = member?.role === 'admin' || member?.role === 'creator';

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only delete your own discussions' },
        { status: 403 }
      );
    }

    // Cannot delete activity posts (except by admin)
    if (discussion.type === DiscussionType.ACTIVITY && !isAdmin) {
      return NextResponse.json(
        { error: 'Activity posts cannot be deleted' },
        { status: 400 }
      );
    }

    // Soft delete the discussion
    await Discussion.updateOne(
      { _id: discussionObjectId },
      {
        $set: {
          deleted: true,
          deletedAt: new Date(),
          deletedBy: user._id
        }
      }
    );

    // Also soft delete all replies
    await Discussion.updateMany(
      { parentId: discussionObjectId },
      {
        $set: {
          deleted: true,
          deletedAt: new Date(),
          deletedBy: user._id
        }
      }
    );

    // Clean up mention records
    await DiscussionMention.deleteMany({
      discussionId: discussionObjectId
    });

    // Update parent's reply count if this was a reply
    if (discussion.parentId) {
      await Discussion.updateOne(
        { _id: discussion.parentId },
        { $inc: { replyCount: -1 } }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting discussion:', error);
    return NextResponse.json(
      { error: 'Failed to delete discussion' },
      { status: 500 }
    );
  }
}
