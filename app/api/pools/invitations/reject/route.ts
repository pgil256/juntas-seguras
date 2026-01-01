import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/options';
import connectToDatabase from '../../../../../lib/db/connect';
import { PoolInvitation } from '../../../../../lib/db/models/poolInvitation';

/**
 * POST /api/pools/invitations/reject - Reject a pool invitation
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { invitationCode, reason } = body;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'You must be logged in to reject an invitation' },
        { status: 401 }
      );
    }
    
    if (!invitationCode) {
      return NextResponse.json(
        { error: 'Invitation code is required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find valid invitation
    const invitation = await PoolInvitation.findValidByCode(invitationCode);
    
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation code' },
        { status: 404 }
      );
    }
    
    // Reject the invitation
    await invitation.reject(reason);
    
    // Log activity
    try {
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/security/activity-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          type: 'pool_invitation_rejected',
          metadata: {
            poolId: invitation.poolId,
            invitationId: invitation._id.toString(),
            reason
          }
        })
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Invitation rejected successfully'
    });
    
  } catch (error) {
    console.error('Error rejecting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to reject invitation' },
      { status: 500 }
    );
  }
}