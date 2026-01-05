import nodemailer from 'nodemailer';
import connectToDatabase from '../db/connect';
import {
  getSentReminderModel,
  ReminderType,
  ReminderChannel,
  SentReminderDocument,
} from '../db/models/reminder';
import { PendingReminder } from './scheduler';

/**
 * ReminderSender - Sends reminders through various channels
 *
 * This module is responsible for:
 * 1. Taking pending reminders from the scheduler
 * 2. Generating appropriate messages for each reminder type
 * 3. Sending reminders through the appropriate channel (email, SMS, push, in-app)
 * 4. Recording sent reminders for tracking and deduplication
 */

// Email transporter (lazy initialization)
let emailTransporter: nodemailer.Transporter | null = null;

function getEmailTransporter(): nodemailer.Transporter | null {
  if (!emailTransporter) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('[Sender] Email credentials not configured');
      return null;
    }

    emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
  return emailTransporter;
}

// Message templates for each reminder type
interface ReminderTemplate {
  subject: string;
  textBody: string;
  htmlBody: string;
}

function getPaymentDueTemplate(reminder: PendingReminder): ReminderTemplate {
  const daysUntil = Math.ceil(
    (reminder.eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const dueDate = reminder.eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const urgencyText = daysUntil <= 0
    ? 'TODAY'
    : daysUntil === 1
      ? 'tomorrow'
      : `in ${daysUntil} days`;

  const subject = reminder.customSubject ||
    `Payment Reminder: $${reminder.contributionAmount} due ${urgencyText} for ${reminder.poolName}`;

  const textBody = reminder.customMessage || `
Hi ${reminder.memberName},

This is a friendly reminder that your contribution of $${reminder.contributionAmount} for the "${reminder.poolName}" pool is due ${urgencyText} (${dueDate}).

Round ${reminder.round || 'current'} is in progress, and we need everyone's contribution to complete the payout.

Please make your payment as soon as possible to avoid any delays.

Thank you for being part of this pool!

Best regards,
Juntas Seguras
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Payment Reminder</h1>
  </div>

  <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px;">
    <p>Hi <strong>${reminder.memberName}</strong>,</p>

    <p>This is a friendly reminder that your contribution is due <strong style="color: ${daysUntil <= 1 ? '#e53e3e' : '#667eea'};">${urgencyText}</strong>.</p>

    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #718096;">Pool:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${reminder.poolName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Amount Due:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #667eea;">$${reminder.contributionAmount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Due Date:</td>
          <td style="padding: 8px 0; text-align: right;">${dueDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Round:</td>
          <td style="padding: 8px 0; text-align: right;">${reminder.round || 'Current'}</td>
        </tr>
      </table>
    </div>

    <p>Please make your payment as soon as possible to avoid any delays in the payout.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pools/${reminder.poolId}"
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
        Make Payment
      </a>
    </div>

    <p style="color: #718096; font-size: 14px;">Thank you for being part of this pool!</p>
  </div>

  <div style="text-align: center; padding: 20px; color: #a0aec0; font-size: 12px;">
    <p>This is an automated message from Juntas Seguras.</p>
    <p>If you no longer wish to receive these reminders, you can update your notification preferences in your account settings.</p>
  </div>
</body>
</html>
`.trim();

  return { subject, textBody, htmlBody };
}

function getPaymentOverdueTemplate(reminder: PendingReminder): ReminderTemplate {
  const daysSince = Math.ceil(
    (Date.now() - reminder.eventDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const dueDate = reminder.eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subject = reminder.customSubject ||
    `⚠️ Overdue Payment: $${reminder.contributionAmount} was due ${daysSince} day${daysSince !== 1 ? 's' : ''} ago`;

  const textBody = reminder.customMessage || `
Hi ${reminder.memberName},

Your contribution of $${reminder.contributionAmount} for the "${reminder.poolName}" pool was due on ${dueDate} - that's ${daysSince} day${daysSince !== 1 ? 's' : ''} ago.

Late payments affect the entire pool and can delay payouts for other members. Please make your payment as soon as possible.

If you're experiencing difficulties, please reach out to your pool administrator.

Thank you,
Juntas Seguras
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%); padding: 20px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">⚠️ Payment Overdue</h1>
  </div>

  <div style="background: #fff5f5; padding: 20px; border-radius: 0 0 10px 10px;">
    <p>Hi <strong>${reminder.memberName}</strong>,</p>

    <p>Your contribution was due on <strong>${dueDate}</strong> - that's <strong style="color: #e53e3e;">${daysSince} day${daysSince !== 1 ? 's' : ''} ago</strong>.</p>

    <div style="background: white; border: 2px solid #e53e3e; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #718096;">Pool:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${reminder.poolName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Amount Due:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #e53e3e;">$${reminder.contributionAmount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Due Date:</td>
          <td style="padding: 8px 0; text-align: right; color: #e53e3e;">${dueDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Days Overdue:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #e53e3e;">${daysSince}</td>
        </tr>
      </table>
    </div>

    <p><strong>Late payments affect the entire pool</strong> and can delay payouts for other members who are counting on receiving their funds.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pools/${reminder.poolId}"
         style="background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
        Pay Now
      </a>
    </div>

    <p style="color: #718096; font-size: 14px;">If you're experiencing difficulties, please reach out to your pool administrator.</p>
  </div>

  <div style="text-align: center; padding: 20px; color: #a0aec0; font-size: 12px;">
    <p>This is an automated message from Juntas Seguras.</p>
  </div>
</body>
</html>
`.trim();

  return { subject, textBody, htmlBody };
}

function getPayoutComingTemplate(reminder: PendingReminder): ReminderTemplate {
  const payoutDate = reminder.eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const totalPayout = reminder.contributionAmount * (reminder.recipientPosition ? reminder.recipientPosition : 1);

  const subject = reminder.customSubject ||
    `🎉 Your payout is coming! ${reminder.poolName}`;

  const textBody = reminder.customMessage || `
Hi ${reminder.memberName},

Great news! You're scheduled to receive your payout from the "${reminder.poolName}" pool on ${payoutDate}.

Make sure your payout method is up to date in your profile so you can receive your funds quickly.

Thank you for being part of this pool!

Best regards,
Juntas Seguras
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 20px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">🎉 Your Payout is Coming!</h1>
  </div>

  <div style="background: #f0fff4; padding: 20px; border-radius: 0 0 10px 10px;">
    <p>Hi <strong>${reminder.memberName}</strong>,</p>

    <p>Great news! You're scheduled to receive your payout soon.</p>

    <div style="background: white; border: 2px solid #48bb78; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #718096;">Pool:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${reminder.poolName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Payout Date:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #48bb78;">${payoutDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Round:</td>
          <td style="padding: 8px 0; text-align: right;">${reminder.round || 'Current'}</td>
        </tr>
      </table>
    </div>

    <div style="background: #c6f6d5; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; color: #276749;">Make sure your payout method is up to date!</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings"
         style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
        Update Payout Method
      </a>
    </div>

    <p style="color: #718096; font-size: 14px;">Thank you for being part of this pool!</p>
  </div>

  <div style="text-align: center; padding: 20px; color: #a0aec0; font-size: 12px;">
    <p>This is an automated message from Juntas Seguras.</p>
  </div>
</body>
</html>
`.trim();

  return { subject, textBody, htmlBody };
}

function getReminderTemplate(reminder: PendingReminder): ReminderTemplate {
  switch (reminder.type) {
    case ReminderType.PAYMENT_DUE:
      return getPaymentDueTemplate(reminder);
    case ReminderType.PAYMENT_OVERDUE:
      return getPaymentOverdueTemplate(reminder);
    case ReminderType.PAYOUT_COMING:
      return getPayoutComingTemplate(reminder);
    default:
      // Generic template for other types
      return {
        subject: `Notification from ${reminder.poolName}`,
        textBody: reminder.customMessage || 'You have a notification from your pool.',
        htmlBody: `<p>${reminder.customMessage || 'You have a notification from your pool.'}</p>`,
      };
  }
}

/**
 * Send a single reminder via email
 */
async function sendEmailReminder(reminder: PendingReminder): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const transporter = getEmailTransporter();
  if (!transporter) {
    return { success: false, error: 'Email transporter not configured' };
  }

  const template = getReminderTemplate(reminder);

  try {
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: reminder.memberEmail,
      subject: template.subject,
      text: template.textBody,
      html: template.htmlBody,
    });

    console.log(`[Sender] Email sent to ${reminder.memberEmail}: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Sender] Failed to send email to ${reminder.memberEmail}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send a single reminder via SMS (placeholder - requires Twilio integration)
 */
async function sendSmsReminder(reminder: PendingReminder): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  // TODO: Implement Twilio SMS integration
  console.log(`[Sender] SMS not implemented yet. Would send to ${reminder.memberName}`);
  return { success: false, error: 'SMS not implemented' };
}

/**
 * Send a single reminder via push notification (placeholder)
 */
async function sendPushReminder(reminder: PendingReminder): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  // TODO: Implement web push notifications
  console.log(`[Sender] Push notifications not implemented yet. Would send to ${reminder.memberName}`);
  return { success: false, error: 'Push notifications not implemented' };
}

/**
 * Create in-app notification (placeholder)
 */
async function createInAppNotification(reminder: PendingReminder): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  // TODO: Implement in-app notifications (store in database for frontend to fetch)
  console.log(`[Sender] In-app notifications not fully implemented. Would create for ${reminder.memberName}`);
  return { success: true, messageId: `inapp_${Date.now()}` };
}

/**
 * Send a single reminder through the appropriate channel
 */
async function sendReminder(reminder: PendingReminder): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  switch (reminder.channel) {
    case ReminderChannel.EMAIL:
      return sendEmailReminder(reminder);
    case ReminderChannel.SMS:
      return sendSmsReminder(reminder);
    case ReminderChannel.PUSH:
      return sendPushReminder(reminder);
    case ReminderChannel.IN_APP:
      return createInAppNotification(reminder);
    default:
      return { success: false, error: `Unknown channel: ${reminder.channel}` };
  }
}

/**
 * Record a sent reminder in the database
 */
async function recordSentReminder(
  reminder: PendingReminder,
  result: { success: boolean; messageId?: string; error?: string }
): Promise<SentReminderDocument> {
  const SentReminder = getSentReminderModel();
  const template = getReminderTemplate(reminder);

  const sentReminder = new SentReminder({
    scheduleId: reminder.scheduleId,
    poolId: reminder.poolId,
    userId: reminder.userId,
    memberName: reminder.memberName,
    memberEmail: reminder.memberEmail,
    type: reminder.type,
    round: reminder.round,
    channel: reminder.channel,
    eventDate: reminder.eventDate,
    sentAt: new Date(),
    status: result.success ? 'sent' : 'failed',
    subject: template.subject,
    message: template.textBody,
    externalMessageId: result.messageId,
    failureReason: result.error,
  });

  await sentReminder.save();
  return sentReminder;
}

/**
 * Process and send all pending reminders
 * This is the main entry point for the sender
 */
export async function processReminders(reminders: PendingReminder[]): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  await connectToDatabase();

  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const reminder of reminders) {
    try {
      const result = await sendReminder(reminder);
      await recordSentReminder(reminder, result);

      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        if (result.error) {
          results.errors.push(`${reminder.memberEmail}: ${result.error}`);
        }
      }
    } catch (error: unknown) {
      results.failed++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.errors.push(`${reminder.memberEmail}: ${errorMessage}`);
    }
  }

  console.log(`[Sender] Processed ${reminders.length} reminders: ${results.sent} sent, ${results.failed} failed`);
  return results;
}

/**
 * Retry failed reminders
 */
export async function retryFailedReminders(maxRetries: number = 3): Promise<{
  retried: number;
  succeeded: number;
  failed: number;
}> {
  await connectToDatabase();
  const SentReminder = getSentReminderModel();

  // Find failed reminders that haven't exceeded max retries
  const failedReminders = await SentReminder.find({
    status: 'failed',
    retryCount: { $lt: maxRetries },
    sentAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Only retry within 24 hours
  });

  const results = {
    retried: failedReminders.length,
    succeeded: 0,
    failed: 0,
  };

  for (const failedReminder of failedReminders) {
    // Reconstruct pending reminder from sent reminder
    const pendingReminder: PendingReminder = {
      scheduleId: failedReminder.scheduleId,
      poolId: failedReminder.poolId,
      poolName: '', // Will use default
      userId: failedReminder.userId,
      memberName: failedReminder.memberName,
      memberEmail: failedReminder.memberEmail,
      type: failedReminder.type,
      round: failedReminder.round,
      channel: failedReminder.channel,
      eventDate: failedReminder.eventDate,
      contributionAmount: 0, // Will use template defaults
      frequency: '',
    };

    const result = await sendReminder(pendingReminder);

    // Update the existing record
    failedReminder.retryCount += 1;
    failedReminder.status = result.success ? 'sent' : 'failed';
    if (result.success) {
      failedReminder.externalMessageId = result.messageId;
      failedReminder.failureReason = undefined;
      results.succeeded++;
    } else {
      failedReminder.failureReason = result.error;
      results.failed++;
    }
    await failedReminder.save();
  }

  console.log(`[Sender] Retried ${results.retried} reminders: ${results.succeeded} succeeded, ${results.failed} failed`);
  return results;
}

export default {
  processReminders,
  retryFailedReminders,
};
