/**
 * Email Service
 * Centralized email sending with SMTP support and templating
 */

import { SMTPProvider } from './providers/smtp';
import type {
  SendEmailOptions,
  SendEmailResult,
  EmailServiceConfig,
  PaymentReminderData,
  AdminPayoutReminderData,
  DiscussionNotificationData,
  RoundUpdateData,
} from './types';
import {
  paymentReminderTemplate,
  paymentReminderPlainText,
  adminPayoutReminderTemplate,
  adminPayoutReminderPlainText,
  discussionNotificationTemplate,
  discussionNotificationPlainText,
  roundUpdateTemplate,
  roundUpdatePlainText,
} from './templates';

// Singleton email service instance
let emailService: EmailService | null = null;

export class EmailService {
  private provider: SMTPProvider;

  constructor(config: EmailServiceConfig) {
    this.provider = new SMTPProvider(config);
  }

  /**
   * Check if the email service is properly configured
   */
  isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  /**
   * Send a raw email with custom HTML
   */
  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    return this.provider.send(options);
  }

  /**
   * Send a payment reminder email to a pool member
   */
  async sendPaymentReminder(
    to: string,
    data: PaymentReminderData
  ): Promise<SendEmailResult> {
    const subject = data.isOverdue
      ? `Overdue Payment - ${data.poolName}`
      : `Payment Reminder - ${data.poolName}`;

    return this.send({
      to,
      subject,
      html: paymentReminderTemplate(data),
      text: paymentReminderPlainText(data),
    });
  }

  /**
   * Send a payout reminder email to a pool admin
   */
  async sendAdminPayoutReminder(
    to: string,
    data: AdminPayoutReminderData
  ): Promise<SendEmailResult> {
    const subject = data.isReady
      ? `Ready to Payout - ${data.poolName} Round ${data.round}`
      : `Payout Status - ${data.poolName} Round ${data.round}`;

    return this.send({
      to,
      subject,
      html: adminPayoutReminderTemplate(data),
      text: adminPayoutReminderPlainText(data),
    });
  }

  /**
   * Send a discussion notification email
   */
  async sendDiscussionNotification(
    to: string,
    data: DiscussionNotificationData
  ): Promise<SendEmailResult> {
    const subject = data.messageCount && data.messageCount > 1
      ? `${data.messageCount} new messages in ${data.poolName}`
      : `New message in ${data.poolName}`;

    return this.send({
      to,
      subject,
      html: discussionNotificationTemplate(data),
      text: discussionNotificationPlainText(data),
    });
  }

  /**
   * Send a round update email (started, completed, or reminder)
   */
  async sendRoundUpdate(
    to: string,
    data: RoundUpdateData
  ): Promise<SendEmailResult> {
    const subjects = {
      started: `Round ${data.round} Started - ${data.poolName}`,
      completed: `Round ${data.round} Complete - ${data.poolName}`,
      reminder: `Reminder: ${data.poolName} Round ${data.round}`,
    };

    return this.send({
      to,
      subject: subjects[data.status],
      html: roundUpdateTemplate(data),
      text: roundUpdatePlainText(data),
    });
  }

  /**
   * Send emails to multiple recipients
   */
  async sendBulk(
    recipients: string[],
    options: Omit<SendEmailOptions, 'to'>
  ): Promise<{ sent: number; failed: number; results: SendEmailResult[] }> {
    const results: SendEmailResult[] = [];
    let sent = 0;
    let failed = 0;

    for (const to of recipients) {
      const result = await this.send({ ...options, to });
      results.push(result);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    }

    return { sent, failed, results };
  }
}

/**
 * Get the default email service configuration from environment variables
 */
function getDefaultConfig(): EmailServiceConfig {
  return {
    defaultFrom: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@juntasseguras.com',
    smtp: {
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASSWORD || '',
      },
    },
  };
}

/**
 * Get the singleton email service instance
 */
export function getEmailService(config?: EmailServiceConfig): EmailService {
  if (!emailService) {
    emailService = new EmailService(config || getDefaultConfig());
  }
  return emailService;
}

/**
 * Create a new email service instance with custom config
 */
export function createEmailService(config: EmailServiceConfig): EmailService {
  return new EmailService(config);
}

// Re-export types and templates for convenience
export type {
  SendEmailOptions,
  SendEmailResult,
  EmailServiceConfig,
  PaymentReminderData,
  AdminPayoutReminderData,
  DiscussionNotificationData,
  RoundUpdateData,
} from './types';

export { formatCurrency, formatDate } from './types';

export {
  paymentReminderTemplate,
  adminPayoutReminderTemplate,
  discussionNotificationTemplate,
  roundUpdateTemplate,
  baseTemplate,
} from './templates';
