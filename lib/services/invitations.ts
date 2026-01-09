/**
 * Pool Invitation Service
 *
 * Handles creating and sending pool invitations directly,
 * avoiding internal HTTP calls for better performance and reliability.
 */

import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { InvitationStatus } from '../../types/pool';
import connectToDatabase from '../db/connect';
import { PoolInvitation } from '../db/models/poolInvitation';
import { getPoolModel } from '../db/models/pool';
import { User } from '../db/models/user';
import { createNotification, NotificationTemplates } from './notifications';

// Types
export interface CreateInvitationParams {
  poolId: string;
  email: string;
  name?: string;
  phone?: string;
  message?: string;
  invitedByUserId: string;
  invitedByName?: string;
  invitedByEmail?: string;
}

export interface InvitationResult {
  success: boolean;
  invitation?: {
    id: string;
    email: string;
    name?: string;
    status: string;
    sentDate: string;
    invitationCode?: string;
  };
  error?: string;
  message?: string;
}

// Create email transporter
const getEmailTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('[INVITATIONS SERVICE] Email credentials not configured');
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

/**
 * Create and send a pool invitation
 *
 * This function can be called directly from other server-side code,
 * avoiding internal HTTP calls.
 */
export async function createPoolInvitation(params: CreateInvitationParams): Promise<InvitationResult> {
  const {
    poolId,
    email,
    name,
    phone,
    message,
    invitedByUserId,
    invitedByName,
    invitedByEmail
  } = params;

  try {
    await connectToDatabase();
    const Pool = getPoolModel();

    // Find the pool
    const pool = await Pool.findOne({ id: poolId });
    if (!pool) {
      return { success: false, error: 'Pool not found' };
    }

    // Check if user is already a member
    const normalizedEmail = email.toLowerCase().trim();
    const existingMember = pool.members.find(
      (m: { email?: string }) => m.email?.toLowerCase() === normalizedEmail
    );

    if (existingMember) {
      return { success: false, error: 'This email is already a member of the pool' };
    }

    // Check for existing pending invitation
    const existingInvitation = await PoolInvitation.findOne({
      poolId,
      email: normalizedEmail,
      status: InvitationStatus.PENDING
    });

    if (existingInvitation) {
      // If invitation is expired, update it
      if (new Date() > existingInvitation.expiresAt) {
        existingInvitation.sentDate = new Date();
        existingInvitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        existingInvitation.invitationCode = crypto.randomBytes(16).toString('hex');
        await existingInvitation.save();

        // Send email
        await sendInvitationEmail(existingInvitation, pool, {
          name: invitedByName,
          email: invitedByEmail
        });

        return {
          success: true,
          invitation: {
            id: existingInvitation._id.toString(),
            email: existingInvitation.email,
            status: existingInvitation.status,
            sentDate: existingInvitation.sentDate.toISOString()
          },
          message: 'Invitation resent successfully'
        };
      }

      return { success: false, error: 'An active invitation already exists for this email' };
    }

    // Create new invitation
    const invitationCode = crypto.randomBytes(16).toString('hex');
    const newInvitation = await PoolInvitation.create({
      poolId,
      email: normalizedEmail,
      name,
      phone,
      invitedBy: invitedByUserId,
      invitationCode,
      status: InvitationStatus.PENDING,
      sentDate: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      message,
      emailSent: false
    });

    // Send invitation email
    await sendInvitationEmail(newInvitation, pool, {
      name: invitedByName,
      email: invitedByEmail
    });

    // Log activity (audit event)
    console.log('[INVITATIONS SERVICE] Pool invitation sent:', {
      userId: invitedByUserId,
      poolId,
      invitationId: newInvitation._id.toString(),
      email: normalizedEmail
    });

    // Send in-app notification to existing users
    try {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        await createNotification({
          userId: existingUser.email,
          message: NotificationTemplates.invitationReceived(
            pool.name,
            invitedByName || invitedByEmail || 'Someone'
          ),
          type: 'invite',
          isImportant: true,
        });
      }
    } catch (error) {
      console.error('[INVITATIONS SERVICE] Failed to send invitation notification:', error);
    }

    return {
      success: true,
      invitation: {
        id: newInvitation._id.toString(),
        email: newInvitation.email,
        name: newInvitation.name,
        status: newInvitation.status,
        sentDate: newInvitation.sentDate.toISOString(),
        invitationCode: newInvitation.invitationCode
      }
    };

  } catch (error) {
    console.error('[INVITATIONS SERVICE] Error creating invitation:', error);
    return { success: false, error: 'Failed to create invitation' };
  }
}

/**
 * Send multiple invitations for a pool (batch operation)
 */
export async function createBatchInvitations(
  poolId: string,
  emails: string[],
  invitedByUserId: string,
  invitedByName?: string,
  invitedByEmail?: string
): Promise<{
  successful: string[];
  failed: Array<{ email: string; error: string }>;
}> {
  const successful: string[] = [];
  const failed: Array<{ email: string; error: string }> = [];

  for (const email of emails) {
    const result = await createPoolInvitation({
      poolId,
      email: email.trim(),
      invitedByUserId,
      invitedByName,
      invitedByEmail
    });

    if (result.success) {
      successful.push(email);
    } else {
      failed.push({ email, error: result.error || 'Unknown error' });
    }
  }

  return { successful, failed };
}

// Helper function to send invitation email
async function sendInvitationEmail(
  invitation: {
    email: string;
    name?: string;
    invitationCode: string;
    message?: string;
    emailSent?: boolean;
    emailSentAt?: Date;
    save(): Promise<unknown>;
  },
  pool: {
    name: string;
    contributionAmount: number;
    frequency: string;
    members: unknown[];
  },
  inviter: {
    name?: string;
    email?: string;
  }
) {
  try {
    const transporter = getEmailTransporter();
    if (!transporter) {
      console.error('[INVITATIONS SERVICE] Cannot send email - transporter not configured');
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
          <p>${inviter.name || inviter.email || 'A friend'} has invited you to join the savings pool "${pool.name}".</p>

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

${inviter.name || inviter.email || 'A friend'} has invited you to join the savings pool "${pool.name}".

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

    console.log(`[INVITATIONS SERVICE] Sending invitation email to ${invitation.email}`);
    const result = await transporter.sendMail(mailOptions);

    invitation.emailSent = true;
    invitation.emailSentAt = new Date();
    await invitation.save();

    console.log(`[INVITATIONS SERVICE] Successfully sent invitation email to ${invitation.email}`, {
      messageId: result.messageId
    });
  } catch (error) {
    console.error(`[INVITATIONS SERVICE] Error sending invitation email to ${invitation.email}:`, error);
  }
}
