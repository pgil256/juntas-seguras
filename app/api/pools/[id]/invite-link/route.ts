import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/options';
import { InvitationStatus } from '../../../../../types/pool';
import connectToDatabase from '../../../../../lib/db/connect';
import { PoolInvitation } from '../../../../../lib/db/models/poolInvitation';
import { getPoolModel } from '../../../../../lib/db/models/pool';
import crypto from 'crypto';

const Pool = getPoolModel();

/**
 * POST /api/pools/[id]/invite-link - Generate a shareable invitation link
 * This creates a general-purpose invitation that can be shared with anyone
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!poolId) {
      return NextResponse.json(
        { error: 'Pool ID is required' },
        { status: 400 }
      );
    }

    // Parse optional body parameters
    let expiryDays = 7;
    try {
      const body = await request.json();
      if (body.expiryDays && typeof body.expiryDays === 'number') {
        expiryDays = Math.min(Math.max(body.expiryDays, 1), 30); // Clamp between 1-30 days
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    await connectToDatabase();

    // Check if user has permission to create invite links
    const pool = await Pool.findOne({ id: poolId });
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    const isAdmin = pool.members.some(
      (m: any) => (
        (m.userId && m.userId.toString() === session.user.id) ||
        (session.user.email && m.email === session.user.email)
      ) && (m.role === 'admin' || m.role === 'creator')
    );

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to create invite links' },
        { status: 403 }
      );
    }

    // Check for existing shareable link (one without a specific email)
    let existingLink = await PoolInvitation.findOne({
      poolId,
      email: `invite-link-${poolId}@shareable.local`,
      status: InvitationStatus.PENDING
    });

    // If existing link is expired, update it; otherwise create new
    if (existingLink && new Date() < existingLink.expiresAt) {
      // Return existing valid link
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const inviteUrl = `${baseUrl}/join/${existingLink.invitationCode}`;

      return NextResponse.json({
        success: true,
        inviteLink: inviteUrl,
        invitationCode: existingLink.invitationCode,
        expiresAt: existingLink.expiresAt.toISOString()
      });
    }

    // Generate new invitation code
    const invitationCode = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    if (existingLink) {
      // Update expired link
      existingLink.invitationCode = invitationCode;
      existingLink.sentDate = new Date();
      existingLink.expiresAt = expiresAt;
      existingLink.status = InvitationStatus.PENDING;
      await existingLink.save();
    } else {
      // Create new shareable invitation
      existingLink = await PoolInvitation.create({
        poolId,
        email: `invite-link-${poolId}@shareable.local`, // Marker email for shareable links
        name: 'Shareable Invite Link',
        invitedBy: session.user.id,
        invitationCode,
        status: InvitationStatus.PENDING,
        sentDate: new Date(),
        expiresAt,
        message: 'This is a shareable invite link',
        emailSent: false,
        isShareableLink: true // Mark as shareable link
      });
    }

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/join/${invitationCode}`;

    return NextResponse.json({
      success: true,
      inviteLink: inviteUrl,
      invitationCode,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('Error generating invite link:', error);
    return NextResponse.json(
      { error: 'Failed to generate invite link' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pools/[id]/invite-link - Get current shareable invite link
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!poolId) {
      return NextResponse.json(
        { error: 'Pool ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user has permission
    const pool = await Pool.findOne({ id: poolId });
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    const isAdmin = pool.members.some(
      (m: any) => (
        (m.userId && m.userId.toString() === session.user.id) ||
        (session.user.email && m.email === session.user.email)
      ) && (m.role === 'admin' || m.role === 'creator')
    );

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to view invite links' },
        { status: 403 }
      );
    }

    // Find existing shareable link
    const existingLink = await PoolInvitation.findOne({
      poolId,
      email: `invite-link-${poolId}@shareable.local`,
      status: InvitationStatus.PENDING,
      expiresAt: { $gt: new Date() }
    });

    if (!existingLink) {
      return NextResponse.json({
        success: true,
        inviteLink: null,
        message: 'No active invite link found'
      });
    }

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/join/${existingLink.invitationCode}`;

    return NextResponse.json({
      success: true,
      inviteLink: inviteUrl,
      invitationCode: existingLink.invitationCode,
      expiresAt: existingLink.expiresAt.toISOString()
    });

  } catch (error) {
    console.error('Error fetching invite link:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invite link' },
      { status: 500 }
    );
  }
}
