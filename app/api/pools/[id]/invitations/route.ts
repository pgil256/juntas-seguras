import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/options';
import type { CreateInvitationRequest, ResendInvitationRequest, CancelInvitationRequest } from '../../../../../types/pool';
import { InvitationStatus } from '../../../../../types/pool';
import connectToDatabase from '../../../../../lib/db/connect';
import { PoolInvitation } from '../../../../../lib/db/models/poolInvitation';
import { getPoolModel } from '../../../../../lib/db/models/pool';
import { User } from '../../../../../lib/db/models/user';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { createNotification, NotificationTemplates } from '../../../../../lib/services/notifications';

// Create email transporter
const getEmailTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('[INVITATIONS] Email credentials not configured');
    return null;
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

const Pool = getPoolModel();

/**
 * GET /api/pools/[id]/invitations - Get all invitations for a pool
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
    
    // Check if user has access to this pool
    const pool = await Pool.findOne({ id: poolId });
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }
    
    // Only pool admins and creators can view invitations
    const isAdmin = pool.members.some(
      (m: any) => (
        (m.userId && m.userId.toString() === session.user.id) || 
        (session.user.email && m.email === session.user.email)
      ) && (m.role === 'admin' || m.role === 'creator')
    );
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to view invitations' },
        { status: 403 }
      );
    }
    
    // Get invitations from database
    const invitations = await PoolInvitation.find({ poolId })
      .populate('invitedBy', 'name email')
      .populate('acceptedBy', 'name email')
      .sort({ createdAt: -1 });
    
    // Clean up expired invitations
    await PoolInvitation.cleanupExpired();
    
    return NextResponse.json({
      invitations: invitations.map(inv => ({
        id: inv._id.toString(),
        email: inv.email,
        name: inv.name,
        phone: inv.phone,
        sentDate: inv.sentDate.toISOString(),
        status: inv.status,
        invitedBy: inv.invitedBy,
        acceptedBy: inv.acceptedBy,
        acceptedDate: inv.acceptedDate,
        expiresAt: inv.expiresAt.toISOString()
      }))
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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await context.params;
    const session = await getServerSession(authOptions);
    const body = await request.json() as CreateInvitationRequest;
    
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
    
    const { email, name, phone, message } = body;
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Check if user has permission to invite
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
        { error: 'You do not have permission to send invitations' },
        { status: 403 }
      );
    }
    
    // Check if user is already a member
    const existingMember = pool.members.find(
      (m: any) => m.email === email.toLowerCase()
    );
    
    if (existingMember) {
      return NextResponse.json(
        { error: 'This email is already a member of the pool' },
        { status: 400 }
      );
    }
    
    // Check for existing pending invitation
    const existingInvitation = await PoolInvitation.findOne({
      poolId,
      email: email.toLowerCase(),
      status: InvitationStatus.PENDING
    });
    
    if (existingInvitation) {
      // If invitation is expired, update it
      if (new Date() > existingInvitation.expiresAt) {
        existingInvitation.sentDate = new Date();
        existingInvitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        existingInvitation.invitationCode = crypto.randomBytes(16).toString('hex');
        await existingInvitation.save();
        
        // Send email
        await sendInvitationEmail(existingInvitation, pool, session.user);
        
        return NextResponse.json({
          success: true,
          invitation: {
            id: existingInvitation._id.toString(),
            email: existingInvitation.email,
            status: existingInvitation.status,
            sentDate: existingInvitation.sentDate.toISOString()
          },
          message: 'Invitation resent successfully'
        });
      }
      
      return NextResponse.json(
        { error: 'An active invitation already exists for this email' },
        { status: 400 }
      );
    }
    
    // Create new invitation
    const invitationCode = crypto.randomBytes(16).toString('hex');
    const newInvitation = await PoolInvitation.create({
      poolId,
      email: email.toLowerCase(),
      name,
      phone,
      invitedBy: session.user.id,
      invitationCode,
      status: InvitationStatus.PENDING,
      sentDate: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      message,
      emailSent: false
    });
    
    // Send invitation email
    await sendInvitationEmail(newInvitation, pool, session.user);

    // Log activity
    try {
      await logActivity(session.user.id, 'pool_invitation_sent', {
        poolId,
        invitationId: newInvitation._id.toString(),
        email
      });
    } catch (error) {
      console.error('Failed to log invitation activity:', error);
    }

    // If the invited email belongs to an existing user, send them an in-app notification
    try {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        await createNotification({
          userId: existingUser.email,
          message: NotificationTemplates.invitationReceived(pool.name, session.user.name || session.user.email || 'Someone'),
          type: 'invite',
          isImportant: true,
        });
      }
    } catch (error) {
      console.error('Failed to send invitation notification:', error);
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: newInvitation._id.toString(),
        email: newInvitation.email,
        name: newInvitation.name,
        status: newInvitation.status,
        sentDate: newInvitation.sentDate.toISOString(),
        invitationCode: newInvitation.invitationCode
      }
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
 * PATCH /api/pools/[id]/invitations - Resend an invitation
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await context.params;
    const session = await getServerSession(authOptions);
    const body = await request.json() as ResendInvitationRequest;
    const { invitationId } = body;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (!poolId || !invitationId) {
      return NextResponse.json(
        { error: 'Pool ID and Invitation ID are required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Check permissions
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
        { error: 'You do not have permission to resend invitations' },
        { status: 403 }
      );
    }
    
    // Find and update invitation
    const invitation = await PoolInvitation.findById(invitationId);
    
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }
    
    // Generate new code and reset dates
    invitation.invitationCode = crypto.randomBytes(16).toString('hex');
    invitation.sentDate = new Date();
    invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    invitation.status = InvitationStatus.PENDING;
    await invitation.save();
    
    // Resend email
    await sendInvitationEmail(invitation, pool, session.user);
    
    // Log activity
    try {
      await logActivity(session.user.id, 'pool_invitation_resent', {
        poolId,
        invitationId,
        email: invitation.email
      });
    } catch (error) {
      console.error('Failed to log resend activity:', error);
    }
    
    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation._id.toString(),
        email: invitation.email,
        status: invitation.status,
        sentDate: invitation.sentDate.toISOString()
      }
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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await context.params;
    const session = await getServerSession(authOptions);
    const invitationId = request.nextUrl.searchParams.get('invitationId');
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (!poolId || !invitationId) {
      return NextResponse.json(
        { error: 'Pool ID and Invitation ID are required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Check permissions
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
        { error: 'You do not have permission to cancel invitations' },
        { status: 403 }
      );
    }
    
    // Find and delete invitation
    const invitation = await PoolInvitation.findByIdAndDelete(invitationId);
    
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }
    
    // Log activity
    try {
      await logActivity(session.user.id, 'pool_invitation_cancelled', {
        poolId,
        invitationId,
        email: invitation.email
      });
    } catch (error) {
      console.error('Failed to log cancellation activity:', error);
    }
    
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

// Helper function to send invitation email
async function sendInvitationEmail(invitation: any, pool: any, inviter: any) {
  try {
    const transporter = getEmailTransporter();
    if (!transporter) {
      console.error('[INVITATIONS] Cannot send email - transporter not configured');
      return;
    }

    const invitationUrl = `${process.env.NEXTAUTH_URL}/pools/join?code=${invitation.invitationCode}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: invitation.email,
      subject: `You're invited to join ${pool.name}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You've been invited to join a savings pool!</h2>
          <p>Hello${invitation.name ? ' ' + invitation.name : ''},</p>
          <p>${inviter.name || inviter.email} has invited you to join the savings pool "${pool.name}".</p>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Pool Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Pool Name:</strong> ${pool.name}</li>
              <li><strong>Contribution Amount:</strong> $${pool.contributionAmount}</li>
              <li><strong>Frequency:</strong> ${pool.frequency}</li>
              <li><strong>Current Members:</strong> ${pool.members.length}</li>
            </ul>
            ${invitation.message ? `<p><strong>Personal Message:</strong> ${invitation.message}</p>` : ''}
          </div>

          <p>To accept this invitation, click the link below:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" style="background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Join Pool</a>
          </p>

          <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="color: #666; font-size: 14px; word-break: break-all;">${invitationUrl}</p>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">This invitation will expire in 7 days.</p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      `,
      text: `
You've been invited to join a savings pool!

Hello${invitation.name ? ' ' + invitation.name : ''},

${inviter.name || inviter.email} has invited you to join the savings pool "${pool.name}".

Pool Details:
- Pool Name: ${pool.name}
- Contribution Amount: $${pool.contributionAmount}
- Frequency: ${pool.frequency}
- Current Members: ${pool.members.length}
${invitation.message ? '\nPersonal Message: ' + invitation.message : ''}

To accept this invitation, visit:
${invitationUrl}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
      `
    };

    console.log(`[INVITATIONS] Sending invitation email to ${invitation.email}`);
    const result = await transporter.sendMail(mailOptions);

    invitation.emailSent = true;
    invitation.emailSentAt = new Date();
    await invitation.save();

    console.log(`[INVITATIONS] Successfully sent invitation email to ${invitation.email}`, {
      messageId: result.messageId,
      response: result.response
    });
  } catch (error: any) {
    console.error(`[INVITATIONS] Error sending invitation email to ${invitation.email}:`, {
      message: error.message,
      code: error.code
    });
  }
}

// Helper function to log activity
async function logActivity(userId: string, type: string, metadata: any) {
  try {
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/security/activity-log`, {
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