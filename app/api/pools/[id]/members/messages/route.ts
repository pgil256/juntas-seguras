/**
 * Direct Messages API Routes
 *
 * Handles one-on-one messages between pool members. These messages are private
 * and only visible to the two participants within the context of a specific pool.
 * This replaces the previous in-memory storage with MongoDB persistence.
 *
 * Endpoints:
 * - GET  /api/pools/[id]/members/messages?memberId=xxx - Fetch conversation between two users
 * - POST /api/pools/[id]/members/messages - Send a direct message
 *
 * Data Flow:
 * 1. Request comes in with pool ID from URL params and member ID from query/body
 * 2. Session is validated via NextAuth
 * 3. Participants array is sorted for consistent storage/retrieval
 * 4. Operation is performed on DirectMessage collection
 * 5. Response is formatted for backwards compatibility with frontend
 *
 * Key Design Decision:
 * - Messages are stored with a sorted participants array to ensure that
 *   conversations between User A and User B are always stored the same way,
 *   regardless of who initiates the conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../app/api/auth/[...nextauth]/options';
import connectToDatabase from '../../../../../../lib/db/connect';
import { DirectMessage, getSortedParticipants } from '../../../../../../lib/db/models/directMessage';
import { Pool } from '../../../../../../lib/db/models/pool';
import { User } from '../../../../../../lib/db/models/user';
import { getCurrentUser } from '../../../../../../lib/auth';
import { isValidObjectId } from '../../../../../../lib/utils/objectId';
import mongoose from 'mongoose';

/**
 * GET /api/pools/[id]/members/messages?memberId=xxx
 *
 * Fetches the conversation history between the current user and another pool member.
 * Returns messages in ascending order (oldest first) for display purposes.
 *
 * Query Parameters:
 * - memberId: The other participant's user ID (required)
 * - limit: Number of messages to return (default: 100)
 * - skip: Number of messages to skip for pagination
 * - before: ISO timestamp to fetch messages before (for infinite scroll)
 *
 * Response Format (backwards compatible):
 * {
 *   messages: [{ id, author, content, date }, ...]
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await params;
    const url = new URL(request.url);
    const memberId = url.searchParams.get('memberId');

    if (!poolId || !memberId) {
      return NextResponse.json(
        { error: 'Pool ID and member ID are required' },
        { status: 400 }
      );
    }

    // Get current user with proper ObjectId validation
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;
    const userId = user._id.toString();

    await connectToDatabase();

    // Find pool by string UUID id
    const pool = await Pool.findOne({ id: poolId });
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    // The memberId might be a number (legacy) or a string ObjectId
    // For new users, it should be a valid ObjectId
    let otherUserId: string;
    if (mongoose.Types.ObjectId.isValid(memberId)) {
      otherUserId = memberId;
    } else {
      // Legacy support: if memberId is a number, try to find the user
      // by their position in the pool's members array
      const numericId = parseInt(memberId);
      const member = (pool as any).members?.find((m: any) => m.id === numericId);
      if (member?.userId) {
        otherUserId = member.userId.toString();
      } else {
        return NextResponse.json(
          { error: 'Member not found in pool' },
          { status: 404 }
        );
      }
    }

    // Parse pagination parameters
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const before = url.searchParams.get('before');

    // Get sorted participants array for consistent querying
    const sortedParticipants = getSortedParticipants(userId, otherUserId);

    // Build query
    const query: any = {
      poolId: new mongoose.Types.ObjectId(poolId),
      participants: { $all: sortedParticipants },
      deleted: false
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    // Fetch messages sorted by createdAt descending, then reverse for display
    const messages = await DirectMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Reverse to get oldest-first order for display
    const formattedMessages = messages.reverse().map((msg: any) => ({
      id: msg._id.getTimestamp().getTime(),
      author: msg.senderName,
      content: msg.content,
      date: msg.createdAt.toISOString(),
      _id: msg._id.toString(),
      senderId: msg.senderId.toString(),
      readAt: msg.readAt?.toISOString() || null
    }));

    // Mark messages as read (fire and forget)
    DirectMessage.updateMany(
      {
        poolId: new mongoose.Types.ObjectId(poolId),
        participants: { $all: sortedParticipants },
        senderId: new mongoose.Types.ObjectId(otherUserId),  // Only messages from the other user
        readAt: null,
        deleted: false
      },
      { $set: { readAt: new Date() } }
    ).catch(err => console.error('Failed to mark messages as read:', err));

    return NextResponse.json({ messages: formattedMessages });

  } catch (error) {
    console.error('Error fetching direct messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch direct messages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pools/[id]/members/messages
 *
 * Sends a direct message to another pool member.
 *
 * Request Body:
 * {
 *   memberId: string | number (required) - The recipient's user ID or legacy member ID
 *   content: string (required) - The message text
 * }
 *
 * Response Format (backwards compatible):
 * {
 *   success: true,
 *   message: { id, author, content, date }
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

    // Get current user with proper ObjectId validation
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;
    const userId = user._id.toString();

    // Parse and validate request body
    const body = await request.json();
    const { memberId, content } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: 'Recipient member ID is required' },
        { status: 400 }
      );
    }

    const trimmedContent = content?.trim();
    if (!trimmedContent) {
      return NextResponse.json(
        { error: 'Message content cannot be empty' },
        { status: 400 }
      );
    }

    if (trimmedContent.length > 5000) {
      return NextResponse.json(
        { error: 'Message cannot exceed 5000 characters' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Find pool by string UUID id
    const pool = await Pool.findOne({ id: poolId });
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    // Resolve the recipient user ID (handle legacy numeric IDs)
    let recipientUserId: string;
    if (mongoose.Types.ObjectId.isValid(memberId.toString())) {
      recipientUserId = memberId.toString();
    } else {
      // Legacy support: find user by position in pool members
      const numericId = parseInt(memberId.toString());
      const member = (pool as any).members?.find((m: any) => m.id === numericId);
      if (member?.userId) {
        recipientUserId = member.userId.toString();
      } else {
        return NextResponse.json(
          { error: 'Recipient not found in pool' },
          { status: 404 }
        );
      }
    }

    // Prevent sending messages to yourself
    if (recipientUserId === userId) {
      return NextResponse.json(
        { error: 'Cannot send messages to yourself' },
        { status: 400 }
      );
    }

    // Get sender's name (we already have the user object)
    const senderName = user.name || 'Unknown User';

    // Get sorted participants for consistent storage
    const sortedParticipants = getSortedParticipants(userId, recipientUserId);

    // Create the direct message
    const newMessage = await DirectMessage.create({
      poolId: new mongoose.Types.ObjectId(poolId),
      participants: sortedParticipants,
      senderId: new mongoose.Types.ObjectId(userId),
      senderName,
      content: trimmedContent,
      readAt: null,
      deleted: false
    });

    // Format response for backwards compatibility
    const formattedMessage = {
      id: newMessage._id.getTimestamp().getTime(),
      author: newMessage.senderName,
      content: newMessage.content,
      date: newMessage.createdAt.toISOString(),
      _id: newMessage._id.toString(),
      senderId: newMessage.senderId.toString()
    };

    // Log activity (fire and forget)
    logActivity(userId, 'direct_message_sent', {
      poolId,
      messageId: newMessage._id.toString(),
      recipientId: recipientUserId
    }).catch(err => console.error('Activity log failed:', err));

    return NextResponse.json({
      success: true,
      message: formattedMessage
    });

  } catch (error) {
    console.error('Error sending direct message:', error);
    return NextResponse.json(
      { error: 'Failed to send direct message' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to log user activity
 */
async function logActivity(userId: string, type: string, metadata: any) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/security/activity-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        type,
        metadata
      })
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
