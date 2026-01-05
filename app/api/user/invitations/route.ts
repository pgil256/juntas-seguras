import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/options';
import connectToDatabase from '../../../../lib/db/connect';
import { PoolInvitation } from '../../../../lib/db/models/poolInvitation';
import { getPoolModel } from '../../../../lib/db/models/pool';
import { InvitationStatus } from '../../../../types/pool';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const Pool = getPoolModel();

/**
 * GET /api/user/invitations - Get pending invitations for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Clean up expired invitations first
    await PoolInvitation.cleanupExpired();

    // Find all pending invitations for the user's email
    const invitations = await PoolInvitation.find({
      email: session.user.email.toLowerCase(),
      status: InvitationStatus.PENDING,
      expiresAt: { $gt: new Date() }
    })
      .populate('invitedBy', 'name email')
      .sort({ sentDate: -1 });

    // Get pool details for each invitation
    const invitationsWithPoolDetails = await Promise.all(
      invitations.map(async (inv) => {
        const pool = await Pool.findOne({ id: inv.poolId });

        if (!pool) {
          return null;
        }

        return {
          id: inv._id.toString(),
          invitationCode: inv.invitationCode,
          poolId: inv.poolId,
          poolName: pool.name,
          poolDescription: pool.description,
          contributionAmount: pool.contributionAmount,
          frequency: pool.frequency,
          memberCount: pool.members.length,
          invitedBy: inv.invitedBy,
          inviterName: (inv.invitedBy as any)?.name || (inv.invitedBy as any)?.email || 'Someone',
          message: inv.message,
          sentDate: inv.sentDate.toISOString(),
          expiresAt: inv.expiresAt.toISOString(),
        };
      })
    );

    // Filter out null entries (pools that no longer exist)
    const validInvitations = invitationsWithPoolDetails.filter(inv => inv !== null);

    return NextResponse.json({
      invitations: validInvitations,
      count: validInvitations.length
    });

  } catch (error) {
    console.error('Error fetching user invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}
