import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../auth/[...nextauth]/options';
import connectToDatabase from '../../../../../../../lib/db/connect';
import { getPoolModel } from '../../../../../../../lib/db/models/pool';
import nodemailer from 'nodemailer';

const Pool = getPoolModel();

// Create email transporter
const getEmailTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('[REMINDERS] Email credentials not configured');
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
 * POST /api/pools/[id]/members/[memberId]/reminder - Send payment reminder to a member
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: poolId, memberId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!poolId || !memberId) {
      return NextResponse.json(
        { error: 'Pool ID and Member ID are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Get pool details
    const pool = await Pool.findOne({ id: poolId });
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    // Check if sender is admin
    const isAdmin = pool.members.some(
      (m: any) => (
        (m.userId && m.userId.toString() === session.user.id) ||
        (session.user.email && m.email === session.user.email)
      ) && (m.role === 'admin' || m.role === 'creator')
    );

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to send reminders' },
        { status: 403 }
      );
    }

    // Find the target member
    const targetMember = pool.members.find(
      (m: any) => m._id?.toString() === memberId || m.id?.toString() === memberId
    );

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    if (!targetMember.email) {
      return NextResponse.json(
        { error: 'Member does not have an email address' },
        { status: 400 }
      );
    }

    // Get optional custom message from request body
    let customMessage = '';
    try {
      const body = await request.json();
      customMessage = body.message || '';
    } catch {
      // No body or invalid JSON - that's fine
    }

    // Send reminder email
    const transporter = getEmailTransporter();
    if (!transporter) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const senderName = session.user.name || session.user.email || 'Pool Admin';
    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const poolUrl = `${appUrl}/pools/${poolId}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: targetMember.email,
      subject: `Payment Reminder - ${pool.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment Reminder</h2>
          <p>Hello${targetMember.name ? ' ' + targetMember.name : ''},</p>
          <p>${senderName} is reminding you about your upcoming payment for the savings pool "${pool.name}".</p>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Pool Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Pool Name:</strong> ${pool.name}</li>
              <li><strong>Contribution Amount:</strong> $${pool.contributionAmount}</li>
              <li><strong>Frequency:</strong> ${pool.frequency}</li>
            </ul>
            ${customMessage ? `<p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;"><strong>Message from admin:</strong> ${customMessage}</p>` : ''}
          </div>

          <p>Please make sure to submit your payment on time to maintain your good standing in the pool.</p>

          <p style="text-align: center; margin: 30px 0;">
            <a href="${poolUrl}" style="background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">View Pool</a>
          </p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">This is an automated reminder from Juntas Seguras.</p>
        </div>
      `,
      text: `
Payment Reminder

Hello${targetMember.name ? ' ' + targetMember.name : ''},

${senderName} is reminding you about your upcoming payment for the savings pool "${pool.name}".

Pool Details:
- Pool Name: ${pool.name}
- Contribution Amount: $${pool.contributionAmount}
- Frequency: ${pool.frequency}
${customMessage ? '\nMessage from admin: ' + customMessage : ''}

Please make sure to submit your payment on time to maintain your good standing in the pool.

View your pool at: ${poolUrl}

This is an automated reminder from Juntas Seguras.
      `
    };

    console.log(`[REMINDERS] Sending payment reminder to ${targetMember.email} for pool ${pool.name}`);
    const result = await transporter.sendMail(mailOptions);

    console.log(`[REMINDERS] Successfully sent reminder to ${targetMember.email}`, {
      messageId: result.messageId,
      response: result.response
    });

    return NextResponse.json({
      success: true,
      message: 'Reminder sent successfully',
      messageId: result.messageId
    });

  } catch (error: any) {
    console.error('[REMINDERS] Error sending reminder:', {
      message: error.message,
      code: error.code
    });
    return NextResponse.json(
      { error: 'Failed to send reminder', details: error.message },
      { status: 500 }
    );
  }
}
