import { NextRequest, NextResponse } from 'next/server';
import { PoolMessage } from '@/types/pool';

// In a real application, this would be stored in a database
// For now, we'll use a simple in-memory store by pool ID + member ID pair
const directMessageStore = new Map<string, PoolMessage[]>();

// Helper to create a key for the message store
const getStoreKey = (poolId: string, fromUserId: string, toMemberId: string) => {
  // Sort the IDs to ensure the same conversation is accessed regardless of sender/receiver
  const userIds = [fromUserId, toMemberId].sort().join('-');
  return `${poolId}:${userIds}`;
};

// GET /api/pools/[id]/members/messages?memberId=123 - Get direct messages between users
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const poolId = params.id;
    const userId = request.headers.get('user-id');
    const url = new URL(request.url);
    const memberId = url.searchParams.get('memberId');
    
    if (!poolId || !memberId) {
      return NextResponse.json(
        { error: 'Pool ID and member ID are required' },
        { status: 400 }
      );
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required in headers' },
        { status: 400 }
      );
    }
    
    // In a real app, verify both users are members of this pool
    
    // Get the conversation key
    const storeKey = getStoreKey(poolId, userId, memberId);
    
    // Get messages for this conversation
    const messages = directMessageStore.get(storeKey) || [];
    
    return NextResponse.json({ messages });
    
  } catch (error) {
    console.error('Error fetching direct messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch direct messages' },
      { status: 500 }
    );
  }
}

// POST /api/pools/[id]/members/messages - Send a direct message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const poolId = params.id;
    const userId = request.headers.get('user-id');
    const body = await request.json();
    
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
    
    const { memberId, content } = body;
    
    if (!memberId) {
      return NextResponse.json(
        { error: 'Recipient member ID is required' },
        { status: 400 }
      );
    }
    
    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: 'Message content cannot be empty' },
        { status: 400 }
      );
    }
    
    // In a real app:
    // 1. Verify both users are members of this pool
    // 2. Get the user's name from the database
    // 3. Save the message to the database
    // 4. Potentially trigger notifications
    
    // For demo purposes, we'll use a mock username based on the user ID
    const authorName = userId === 'user123' ? 'You' : `User ${userId}`;
    
    // Create the new message
    const newMessage: PoolMessage = {
      id: Date.now(),  // Use timestamp as a simple ID
      author: authorName,
      content: content.trim(),
      date: new Date().toISOString()
    };
    
    // Get the conversation key
    const storeKey = getStoreKey(poolId, userId, memberId.toString());
    
    // Get existing messages or create a new array
    const existingMessages = directMessageStore.get(storeKey) || [];
    
    // Add the new message
    const updatedMessages = [...existingMessages, newMessage];
    directMessageStore.set(storeKey, updatedMessages);
    
    // Log activity
    await logActivity(userId, 'direct_message_sent', {
      poolId,
      messageId: newMessage.id,
      recipientId: memberId
    });
    
    return NextResponse.json({
      success: true,
      message: newMessage
    });
    
  } catch (error) {
    console.error('Error sending direct message:', error);
    return NextResponse.json(
      { error: 'Failed to send direct message' },
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