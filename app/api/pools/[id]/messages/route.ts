/**
 * Pool Messages API Routes
 *
 * Handles group chat messages for pools. Messages are visible to all pool members.
 * This replaces the previous in-memory storage with MongoDB persistence.
 *
 * Endpoints:
 * - GET  /api/pools/[id]/messages - Fetch messages for a pool (with pagination)
 * - POST /api/pools/[id]/messages - Create a new message
 * - DELETE /api/pools/[id]/messages?messageId=xxx - Soft delete a message
 *
 * Data Flow:
 * 1. Request comes in with pool ID from URL params
 * 2. Session is validated via NextAuth
 * 3. Database connection is established
 * 4. Operation is performed on Message collection
 * 5. Response is formatted for backwards compatibility with frontend
 *
 * Security Considerations:
 * - All endpoints require authentication via NextAuth session
 * - Users can only delete their own messages
 * - Pool membership should be verified before allowing message access
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../app/api/auth/[...nextauth]/options';
import connectToDatabase from '../../../../../lib/db/connect';
import { Message } from '../../../../../lib/db/models/message';
import { Pool } from '../../../../../lib/db/models/pool';
import { User } from '../../../../../lib/db/models/user';
import { getCurrentUser } from '../../../../../lib/auth';
import { isValidObjectId } from '../../../../../lib/utils/objectId';
import mongoose from 'mongoose';

/**
 * GET /api/pools/[id]/messages
 *
 * Fetches messages for a pool with optional pagination.
 * Returns messages in ascending order (oldest first) for display purposes.
 *
 * Query Parameters:
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

    // Parse pagination parameters from query string
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const before = url.searchParams.get('before');

    await connectToDatabase();

    // Find pool by string UUID id to get its MongoDB _id
    const pool = await Pool.findOne({ id: poolId });
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    // Build query - fetch non-deleted messages for this pool using pool's MongoDB _id
    const query: any = {
      poolId: pool._id,
      deleted: false
    };

    // Optional: filter messages before a certain timestamp for infinite scroll
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    // Fetch messages sorted by createdAt ascending (oldest first for chat display)
    // We query in descending order for pagination efficiency, then reverse
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })  // Newest first for pagination
      .skip(skip)
      .limit(limit)
      .lean();

    // Reverse to get oldest-first order for display, then format for frontend
    const formattedMessages = messages.reverse().map((msg: any) => ({
      id: msg._id.getTimestamp().getTime(),  // Use timestamp as numeric ID for backwards compatibility
      author: msg.senderName,
      content: msg.content,
      date: msg.createdAt.toISOString(),
      // Include MongoDB ID for potential future use
      _id: msg._id.toString(),
      senderId: msg.senderId.toString()
    }));

    return NextResponse.json({ messages: formattedMessages });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pools/[id]/messages
 *
 * Creates a new message in the pool's group chat.
 *
 * Request Body:
 * {
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

    // Parse and validate request body
    const body = await request.json();
    const content = body.content?.trim();

    if (!content) {
      return NextResponse.json(
        { error: 'Message content cannot be empty' },
        { status: 400 }
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'Message cannot exceed 5000 characters' },
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

    await connectToDatabase();

    // Find pool by string UUID id to get its MongoDB _id
    const pool = await Pool.findOne({ id: poolId });
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    // Get user info for sender name
    const senderName = user.name || 'Unknown User';

    // Create the message document using pool's MongoDB _id
    const newMessage = await Message.create({
      poolId: pool._id,
      senderId: user._id,
      senderName,
      content,
      readBy: [user._id],  // Sender has read their own message
      deleted: false
    });

    // Format response for backwards compatibility with frontend
    const formattedMessage = {
      id: newMessage._id.getTimestamp().getTime(),
      author: newMessage.senderName,
      content: newMessage.content,
      date: newMessage.createdAt.toISOString(),
      _id: newMessage._id.toString(),
      senderId: newMessage.senderId.toString()
    };

    // Log activity (fire and forget - don't block response)
    logActivity(user._id.toString(), 'message_sent', {
      poolId,
      messageId: newMessage._id.toString(),
    }).catch(err => console.error('Activity log failed:', err));

    return NextResponse.json({
      success: true,
      message: formattedMessage
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pools/[id]/messages?messageId=xxx
 *
 * Soft deletes a message. Only the message author can delete their own messages.
 *
 * Query Parameters:
 * - messageId: The message ID to delete (uses MongoDB _id)
 *
 * Note: For backwards compatibility, we accept the numeric timestamp ID
 * and find the message by matching the createdAt timestamp.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await params;
    const url = new URL(request.url);
    const messageId = url.searchParams.get('messageId');

    if (!poolId) {
      return NextResponse.json(
        { error: 'Pool ID is required' },
        { status: 400 }
      );
    }

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
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

    await connectToDatabase();

    // Find pool by string UUID id to get its MongoDB _id
    const pool = await Pool.findOne({ id: poolId });
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    const userId = user._id.toString();

    // Find the message - try MongoDB ObjectId first, then fall back to timestamp-based lookup
    let message;

    if (mongoose.Types.ObjectId.isValid(messageId)) {
      // If messageId is a valid ObjectId, find by _id
      message = await Message.findOne({
        _id: new mongoose.Types.ObjectId(messageId),
        poolId: pool._id,
        deleted: false
      });
    }

    // If not found by ObjectId, try to find by timestamp (backwards compatibility)
    if (!message) {
      const timestamp = parseInt(messageId);
      if (!isNaN(timestamp)) {
        // Find message where the timestamp matches the message creation time
        // This is approximate but should work for most cases
        const dateFromTimestamp = new Date(timestamp);
        message = await Message.findOne({
          poolId: pool._id,
          createdAt: {
            $gte: new Date(dateFromTimestamp.getTime() - 1000),  // 1 second tolerance
            $lte: new Date(dateFromTimestamp.getTime() + 1000)
          },
          deleted: false
        });
      }
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Verify the user is the message author
    if (message.senderId.toString() !== userId) {
      return NextResponse.json(
        { error: 'You can only delete your own messages' },
        { status: 403 }
      );
    }

    // Soft delete the message
    message.deleted = true;
    await message.save();

    // Log activity
    logActivity(userId, 'message_deleted', {
      poolId,
      messageId: message._id.toString(),
    }).catch(err => console.error('Activity log failed:', err));

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to log user activity
 * This is a fire-and-forget operation - errors are logged but don't affect the response
 */
async function logActivity(userId: string, type: string, metadata: any) {
  try {
    // Use absolute URL for server-side fetch
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
