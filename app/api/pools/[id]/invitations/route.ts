import { NextRequest, NextResponse } from 'next/server';
import { 
  CreateInvitationRequest, 
  ResendInvitationRequest, 
  CancelInvitationRequest, 
  InvitationStatus,
  PoolInvitation
} from '@/types/pool';

// In-memory store for invitations
// In a real app, this would be in a database
const invitationsStore = new Map<string, PoolInvitation[]>();

/**
 * GET /api/pools/[id]/invitations - Get all invitations for a pool
 */
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
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required in headers' },
        { status: 400 }
      );
    }
    
    // Get invitations from the store or return mock data
    let poolInvitations = invitationsStore.get(poolId) || [];
    
    // If no invitations found, return an empty array (or mock data for development)
    if (poolInvitations.length === 0) {
      poolInvitations = getMockInvitations(poolId);
      invitationsStore.set(poolId, poolInvitations);
    }
    
    return NextResponse.json({
      invitations: poolInvitations
    });
    
  } catch (error) {
    console.error('Error fetching pool invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pool invitations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pools/[id]/invitations - Create a new invitation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const poolId = params.id;
    const userId = request.headers.get('user-id');
    const body = await request.json() as CreateInvitationRequest;
    
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
    
    const { email, name, phone } = body;
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Get existing invitations for this pool
    let poolInvitations = invitationsStore.get(poolId) || [];
    
    // Check if an invitation for this email already exists
    const existingInvitation = poolInvitations.find(
      inv => inv.email.toLowerCase() === email.toLowerCase()
    );
    
    if (existingInvitation) {
      // If the invitation exists but is expired, update it
      if (existingInvitation.status === InvitationStatus.EXPIRED) {
        existingInvitation.sentDate = new Date().toISOString();
        existingInvitation.status = InvitationStatus.PENDING;
        
        // Save updated invitations
        invitationsStore.set(poolId, poolInvitations);
        
        return NextResponse.json({
          success: true,
          invitation: existingInvitation,
          message: 'Invitation resent successfully'
        });
      }
      
      // Otherwise return an error
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 400 }
      );
    }
    
    // Create a new invitation
    const newInvitation: PoolInvitation = {
      id: poolInvitations.length > 0
        ? Math.max(...poolInvitations.map(inv => inv.id)) + 1
        : 1,
      email,
      sentDate: new Date().toISOString(),
      status: InvitationStatus.PENDING,
    };
    
    // Add the invitation
    poolInvitations.push(newInvitation);
    invitationsStore.set(poolId, poolInvitations);
    
    // In a real app, send an email to the invitee here
    console.log(`Sending invitation email to ${email} for pool ${poolId}`);
    
    // Log activity
    await logActivity(userId, 'pool_invitation_sent', {
      poolId,
      invitationId: newInvitation.id,
      email
    });
    
    return NextResponse.json({
      success: true,
      invitation: newInvitation
    });
    
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pools/[id]/invitations/[invitationId]/resend - Resend an invitation
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const poolId = params.id;
    const userId = request.headers.get('user-id');
    const body = await request.json() as ResendInvitationRequest;
    const { invitationId } = body;
    
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
    
    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      );
    }
    
    // Get invitations for this pool
    let poolInvitations = invitationsStore.get(poolId) || [];
    
    // Find the invitation
    const invitationIndex = poolInvitations.findIndex(inv => inv.id === invitationId);
    
    if (invitationIndex === -1) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }
    
    // Update the invitation
    poolInvitations[invitationIndex].sentDate = new Date().toISOString();
    poolInvitations[invitationIndex].status = InvitationStatus.PENDING;
    
    // Save updated invitations
    invitationsStore.set(poolId, poolInvitations);
    
    // In a real app, resend the email here
    console.log(`Resending invitation email to ${poolInvitations[invitationIndex].email} for pool ${poolId}`);
    
    // Log activity
    await logActivity(userId, 'pool_invitation_resent', {
      poolId,
      invitationId,
      email: poolInvitations[invitationIndex].email
    });
    
    return NextResponse.json({
      success: true,
      invitation: poolInvitations[invitationIndex]
    });
    
  } catch (error) {
    console.error('Error resending invitation:', error);
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pools/[id]/invitations - Cancel an invitation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const poolId = params.id;
    const userId = request.headers.get('user-id');
    const invitationId = parseInt(request.nextUrl.searchParams.get('invitationId') || '0');
    
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
    
    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      );
    }
    
    // Get invitations for this pool
    let poolInvitations = invitationsStore.get(poolId) || [];
    
    // Find the invitation
    const invitation = poolInvitations.find(inv => inv.id === invitationId);
    
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }
    
    // Remove the invitation
    poolInvitations = poolInvitations.filter(inv => inv.id !== invitationId);
    invitationsStore.set(poolId, poolInvitations);
    
    // Log activity
    await logActivity(userId, 'pool_invitation_cancelled', {
      poolId,
      invitationId,
      email: invitation.email
    });
    
    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully'
    });
    
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    return NextResponse.json(
      { error: 'Failed to cancel invitation' },
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

// Helper function to get mock invitations data for development
function getMockInvitations(poolId: string): PoolInvitation[] {
  return [
    {
      id: 1,
      email: "luis@example.com",
      sentDate: "2025-02-28T00:00:00Z",
      status: InvitationStatus.PENDING,
    },
    {
      id: 2,
      email: "carmen@example.com",
      sentDate: "2025-03-01T00:00:00Z",
      status: InvitationStatus.EXPIRED,
    },
  ];
}