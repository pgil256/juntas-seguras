import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/options';
import connectToDatabase from '../../../../../lib/db/connect';
import { PoolInvitation } from '../../../../../lib/db/models/poolInvitation';
import { getPoolModel } from '../../../../../lib/db/models/pool';
import { User } from '../../../../../lib/db/models/user';
import { PoolMemberRole, PoolMemberStatus } from '../../../../../types/pool';
import { getCurrentUser } from '../../../../../lib/auth';

const Pool = getPoolModel();

/**
 * POST /api/pools/invitations/accept - Accept a pool invitation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invitationCode } = body;

    if (!invitationCode) {
      return NextResponse.json(
        { error: 'Invitation code is required' },
        { status: 400 }
      );
    }

    // Get current user with proper validation
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: 'You must be logged in to accept an invitation' },
        { status: 401 }
      );
    }
    const user = userResult.user;

    await connectToDatabase();

    // Find valid invitation
    const invitation = await PoolInvitation.findValidByCode(invitationCode);

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation code' },
        { status: 404 }
      );
    }
    
    // Find the pool
    const pool = await Pool.findOne({ id: invitation.poolId });
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }
    
    // Check if user is already an active member (by userId or by email with userId set)
    const existingMember = pool.members.find(
      (m: any) => {
        const userIdMatch = m.userId?.toString() === user._id.toString();
        const emailMatchWithUserId = m.userId && m.email?.toLowerCase() === user.email.toLowerCase();
        return userIdMatch || emailMatchWithUserId;
      }
    );

    if (existingMember) {
      // If they're already a member, just redirect them to the pool instead of showing an error
      return NextResponse.json({
        success: true,
        message: 'You are already a member of this pool',
        alreadyMember: true,
        pool: {
          id: pool.id,
          name: pool.name,
          description: pool.description
        }
      });
    }

    // Check if there's a placeholder member with matching email (added by admin before user accepted)
    const placeholderMemberIndex = pool.members.findIndex(
      (m: any) => !m.userId && m.email?.toLowerCase() === user.email.toLowerCase()
    );

    // If placeholder exists, update it instead of creating new member
    if (placeholderMemberIndex !== -1) {
      const placeholderMember = pool.members[placeholderMemberIndex];
      placeholderMember.userId = user._id.toString();
      placeholderMember.name = user.name || placeholderMember.name || invitation.name || 'Unknown';
      placeholderMember.phone = user.phone || placeholderMember.phone || invitation.phone || '';
      placeholderMember.status = PoolMemberStatus.ACTIVE;
      placeholderMember.joinedDate = new Date();

      await pool.save();

      // Add pool to user's pools array
      if (!user.pools.includes(pool.id)) {
        user.pools.push(pool.id);
        await user.save();
      }

      // Accept the invitation (don't mark shareable links as accepted so they remain usable)
      const isShareableLink = invitation.email?.includes('@shareable.local');
      if (!isShareableLink) {
        await invitation.accept(user._id.toString());
      }

      // Log activity
      try {
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/security/activity-log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user._id.toString(),
            type: 'pool_invitation_accepted',
            metadata: {
              poolId: pool.id,
              poolName: pool.name,
              invitationId: invitation._id.toString(),
              invitedBy: invitation.invitedBy
            }
          })
        });

        if (!response.ok) {
          console.error('Failed to log activity');
        }
      } catch (error) {
        console.error('Error logging activity:', error);
      }

      // Send notification to pool admins
      try {
        const admins = pool.members.filter(
          (m: any) => m.role === PoolMemberRole.ADMIN || m.role === PoolMemberRole.CREATOR
        );

        for (const admin of admins) {
          if (admin.userId) {
            await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/notifications`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: admin.userId.toString(),
                type: 'member_joined',
                title: 'New Member Joined',
                message: `${user.name || user.email} has joined ${pool.name}`,
                metadata: {
                  poolId: pool.id,
                  memberId: user._id.toString(),
                  memberName: user.name || user.email
                }
              })
            });
          }
        }
      } catch (error) {
        console.error('Error sending notifications:', error);
      }

      return NextResponse.json({
        success: true,
        message: 'Successfully joined the pool',
        pool: {
          id: pool.id,
          name: pool.name,
          description: pool.description
        }
      });
    }

    // Add user to pool
    const newMember = {
      userId: user._id.toString(),
      name: user.name || invitation.name || 'Unknown',
      email: user.email,
      phone: user.phone || invitation.phone || '',
      role: PoolMemberRole.MEMBER,
      status: PoolMemberStatus.ACTIVE,
      joinedDate: new Date(),
      contributionAmount: pool.contributionAmount,
      position: pool.members.length + 1,
      hasReceivedPayout: false,
      missedPayments: 0,
      totalContributed: 0
    };
    
    pool.members.push(newMember);
    await pool.save();

    // Add pool to user's pools array
    if (!user.pools.includes(pool.id)) {
      user.pools.push(pool.id);
      await user.save();
    }

    // Accept the invitation (don't mark shareable links as accepted so they remain usable)
    const isShareableLinkMain = invitation.email?.includes('@shareable.local');
    if (!isShareableLinkMain) {
      await invitation.accept(user._id.toString());
    }

    // Log activity
    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/security/activity-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id.toString(),
          type: 'pool_invitation_accepted',
          metadata: {
            poolId: pool.id,
            poolName: pool.name,
            invitationId: invitation._id.toString(),
            invitedBy: invitation.invitedBy
          }
        })
      });

      if (!response.ok) {
        console.error('Failed to log activity');
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }

    // Send notification to pool admins
    try {
      const admins = pool.members.filter(
        (m: any) => m.role === PoolMemberRole.ADMIN || m.role === PoolMemberRole.CREATOR
      );

      for (const admin of admins) {
        if (admin.userId) {
          await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: admin.userId.toString(),
              type: 'member_joined',
              title: 'New Member Joined',
              message: `${user.name || user.email} has joined ${pool.name}`,
              metadata: {
                poolId: pool.id,
                memberId: user._id.toString(),
                memberName: user.name || user.email
              }
            })
          });
        }
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the pool',
      pool: {
        id: pool.id,
        name: pool.name,
        description: pool.description
      }
    });

  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}