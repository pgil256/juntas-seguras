import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '../../../../../lib/db/connect';
import { PoolInvitation } from '../../../../../lib/db/models/poolInvitation';
import { getPoolModel } from '../../../../../lib/db/models/pool';
import { InvitationStatus } from '../../../../../types/pool';

export const dynamic = 'force-dynamic';

const Pool = getPoolModel();

/**
 * GET /api/pools/invitations/validate - Validate an invitation code
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    
    if (!code) {
      return NextResponse.json(
        { error: 'Invitation code is required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find invitation by code
    const invitation = await PoolInvitation.findOne({ 
      invitationCode: code 
    }).populate('invitedBy', 'name email');
    
    if (!invitation) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Invalid invitation code' 
        },
        { status: 404 }
      );
    }
    
    // Check if expired
    if (new Date() > invitation.expiresAt) {
      if (invitation.status === InvitationStatus.PENDING) {
        await invitation.expire();
      }
      return NextResponse.json({
        valid: false,
        error: 'This invitation has expired'
      });
    }
    
    // Check if already used
    if (invitation.status === InvitationStatus.ACCEPTED) {
      return NextResponse.json({
        valid: false,
        error: 'This invitation has already been accepted'
      });
    }
    
    if (invitation.status === InvitationStatus.REJECTED) {
      return NextResponse.json({
        valid: false,
        error: 'This invitation has been rejected'
      });
    }
    
    if (invitation.status === InvitationStatus.EXPIRED) {
      return NextResponse.json({
        valid: false,
        error: 'This invitation has expired'
      });
    }
    
    // Get pool details
    const pool = await Pool.findOne({ id: invitation.poolId })
      .select('name description contributionAmount frequency startDate members');
    
    if (!pool) {
      return NextResponse.json({
        valid: false,
        error: 'The associated pool no longer exists'
      });
    }
    
    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation._id.toString(),
        email: invitation.email,
        name: invitation.name,
        invitedBy: invitation.invitedBy,
        sentDate: invitation.sentDate.toISOString(),
        expiresAt: invitation.expiresAt.toISOString(),
        message: invitation.message
      },
      pool: {
        id: pool.id,
        name: pool.name,
        description: pool.description,
        contributionAmount: pool.contributionAmount,
        frequency: pool.frequency,
        startDate: pool.startDate,
        memberCount: pool.members.length
      }
    });
    
  } catch (error) {
    console.error('Error validating invitation:', error);
    return NextResponse.json(
      { 
        valid: false,
        error: 'Failed to validate invitation' 
      },
      { status: 500 }
    );
  }
}