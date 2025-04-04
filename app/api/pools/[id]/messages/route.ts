import { NextRequest, NextResponse } from 'next/server';
import { PoolMessage, SendMessageRequest } from '@/types/pool';

// In a real application, this would be stored in a database
// For now, we'll use a simple in-memory store
const messagesByPool = new Map<string, PoolMessage[]>();

// GET /api/pools/[id]/messages - Get messages for a pool
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const poolId = params.id;
    const userId = request.headers.get('user-id');
    
    if (!poolId) {
      return NextResponse.json(
        { error: 'Pool ID is required' },
        { status: 400 }
      );
    }
    
    // In a real app, verify the user is a member of this pool
    // For demo purposes, we'll skip that check
    
    // Get messages for this pool, or return an empty array if none exist
    const messages = messagesByPool.get(poolId) || [];
    
    return NextResponse.json({ messages });
    
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/pools/[id]/messages - Send a new message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const poolId = params.id;
    const userId = request.headers.get('user-id');
    const body = await request.json() as SendMessageRequest;
    
    if (!poolId) {
      return NextResponse.json(
        { error: 'Pool ID is required' },
        { status: 400 }
      );
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required in headers' },
        { status: 400 }
      );
    }
    
    if (!body.content || body.content.trim() === '') {
      return NextResponse.json(
        { error: 'Message content cannot be empty' },
        { status: 400 }
      );
    }
    
    // In a real app:
    // 1. Verify the user is a member of this pool
    // 2. Get the user's name from the database
    // 3. Save the message to the database
    // 4. Potentially trigger notifications
    
    // For demo purposes, we'll use a mock username based on the user ID
    const authorName = userId === 'user123' ? 'You' : `User ${userId}`;
    
    // Create the new message
    const newMessage: PoolMessage = {
      id: Date.now(),  // Use timestamp as a simple ID
      author: authorName,
      content: body.content.trim(),
      date: new Date().toISOString()
    };
    
    // Get existing messages or create a new array
    const existingMessages = messagesByPool.get(poolId) || [];
    
    // Add the new message
    const updatedMessages = [...existingMessages, newMessage];
    messagesByPool.set(poolId, updatedMessages);
    
    // Log activity
    await logActivity(userId, 'message_sent', {
      poolId,
      messageId: newMessage.id,
    });
    
    return NextResponse.json({
      success: true,
      message: newMessage
    });
    
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

// DELETE /api/pools/[id]/messages?messageId=123 - Delete a message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const poolId = params.id;
    const userId = request.headers.get('user-id');
    const url = new URL(request.url);
    const messageId = url.searchParams.get('messageId');
    
    if (!poolId) {
      return NextResponse.json(
        { error: 'Pool ID is required' },
        { status: 400 }
      );
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required in headers' },
        { status: 400 }
      );
    }
    
    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }
    
    // Get existing messages
    const existingMessages = messagesByPool.get(poolId) || [];
    
    // Find the message
    const messageToDelete = existingMessages.find(m => m.id.toString() === messageId);
    
    if (!messageToDelete) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }
    
    // In a real app, verify that the user is either:
    // 1. The author of the message, or
    // 2. An admin of the pool
    
    // Filter out the message to delete
    const updatedMessages = existingMessages.filter(m => m.id.toString() !== messageId);
    messagesByPool.set(poolId, updatedMessages);
    
    // Log activity
    await logActivity(userId, 'message_deleted', {
      poolId,
      messageId,
    });
    
    return NextResponse.json({
      success: true
    });
    
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}

// Helper function to log activity
async function logActivity(userId: string, type: string, metadata: any) {
  try {
    await fetch('/api/security/activity-log', {
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