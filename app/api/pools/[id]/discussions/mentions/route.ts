/**
 * Discussion Mentions API Routes
 *
 * Handles @mention-related operations.
 *
 * Endpoints:
 * - GET  /api/pools/[id]/discussions/mentions - Get mentions for current user
 * - POST /api/pools/[id]/discussions/mentions - Mark mentions as read
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '../../../../../../lib/db/connect';
import { DiscussionMention } from '../../../../../../lib/db/models/discussionMention';
import { Pool } from '../../../../../../lib/db/models/pool';
import { getCurrentUser } from '../../../../../../lib/auth';
import { getMentionableMembers } from '../../../../../../lib/activity/mentions';

/**
 * GET /api/pools/[id]/discussions/mentions
 *
 * Gets mentions for the current user in this pool.
 * Also returns a list of mentionable members for autocomplete.
 *
 * Query Parameters:
 * - limit: Number of mentions to return (default: 20, max: 50)
 * - skip: Number to skip for pagination
 * - unreadOnly: Only return unread mentions (default: false)
 * - membersOnly: Only return mentionable members list (default: false)
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
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const membersOnly = url.searchParams.get('membersOnly') === 'true';

    await connectToDatabase();

    // Find pool by string UUID id
    const pool = await Pool.findOne({ id: poolId });
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    // If only requesting mentionable members
    if (membersOnly) {
      const members = await getMentionableMembers(pool._id);
      return NextResponse.json({ members });
    }

    // Build query for mentions
    const query: any = {
      mentionedUserId: user._id,
      poolId: pool._id
    };

    if (unreadOnly) {
      query.isRead = false;
    }

    // Fetch mentions
    const mentions = await DiscussionMention.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await DiscussionMention.countDocuments(query);

    // Get unread count
    const unreadCount = await DiscussionMention.countDocuments({
      mentionedUserId: user._id,
      poolId: pool._id,
      isRead: false
    });

    // Format mentions
    const formattedMentions = mentions.map((m: any) => ({
      id: m._id.toString(),
      discussionId: m.discussionId.toString(),
      mentionedByName: m.mentionedByName,
      discussionType: m.discussionType,
      discussionPreview: m.discussionPreview,
      isRead: m.isRead,
      readAt: m.readAt?.toISOString(),
      createdAt: m.createdAt.toISOString()
    }));

    // Also get mentionable members for autocomplete
    const members = await getMentionableMembers(pool._id);

    return NextResponse.json({
      mentions: formattedMentions,
      members,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + mentions.length < total
      },
      unreadCount
    });

  } catch (error) {
    console.error('Error fetching mentions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mentions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pools/[id]/discussions/mentions
 *
 * Marks mentions as read.
 *
 * Request Body:
 * {
 *   mentionIds?: string[]  // Specific mentions to mark as read
 *   markAll?: boolean      // Mark all mentions as read
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
    const { mentionIds, markAll } = body;

    if (!markAll && (!mentionIds || !Array.isArray(mentionIds) || mentionIds.length === 0)) {
      return NextResponse.json(
        { error: 'Either mentionIds or markAll is required' },
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
      // Mark all mentions in this pool as read
      const result = await DiscussionMention.updateMany(
        {
          mentionedUserId: user._id,
          poolId: pool._id,
          isRead: false
        },
        {
          $set: {
            isRead: true,
            readAt: new Date()
          }
        }
      );

      return NextResponse.json({
        success: true,
        markedCount: result.modifiedCount
      });
    } else {
      // Validate mention IDs
      const validIds = mentionIds.filter((id: string) =>
        mongoose.Types.ObjectId.isValid(id)
      );

      if (validIds.length === 0) {
        return NextResponse.json(
          { error: 'No valid mention IDs provided' },
          { status: 400 }
        );
      }

      // Mark specific mentions as read
      const result = await DiscussionMention.updateMany(
        {
          _id: { $in: validIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
          mentionedUserId: user._id,
          isRead: false
        },
        {
          $set: {
            isRead: true,
            readAt: new Date()
          }
        }
      );

      return NextResponse.json({
        success: true,
        markedCount: result.modifiedCount
      });
    }

  } catch (error) {
    console.error('Error marking mentions as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark mentions as read' },
      { status: 500 }
    );
  }
}
