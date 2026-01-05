/**
 * Email service types and interfaces
 */

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  encoding?: 'base64' | 'utf8';
}

export interface SendEmailOptions {
  to: EmailAddress | EmailAddress[] | string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: EmailAddress | string;
  replyTo?: EmailAddress | string;
  cc?: EmailAddress | EmailAddress[] | string | string[];
  bcc?: EmailAddress | EmailAddress[] | string | string[];
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  tags?: string[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

export interface EmailProvider {
  name: string;
  send(options: SendEmailOptions): Promise<SendEmailResult>;
  isConfigured(): boolean;
}

export interface EmailServiceConfig {
  defaultFrom: EmailAddress | string;
  // SMTP config
  smtp: {
    host?: string;
    port?: number;
    secure?: boolean;
    auth: {
      user: string;
      pass: string;
    };
    service?: string; // e.g., 'gmail'
  };
}

// Template data types
export interface BaseTemplateData {
  recipientName?: string;
  previewText?: string;
}

export interface PaymentReminderData extends BaseTemplateData {
  poolName: string;
  amount: number;
  dueDate: string;
  round: number;
  totalRounds: number;
  adminPaymentMethods: {
    venmo?: string;
    cashapp?: string;
    paypal?: string;
    zelle?: string;
    preferred?: string | null;
  };
  paymentLink?: string;
  isOverdue?: boolean;
  daysOverdue?: number;
}

export interface AdminPayoutReminderData extends BaseTemplateData {
  poolName: string;
  recipientName: string;
  recipientEmail: string;
  payoutAmount: number;
  round: number;
  totalRounds: number;
  payoutMethod?: {
    type: string;
    handle: string;
    displayName?: string;
  };
  contributionsCollected: number;
  totalContributions: number;
  isReady: boolean;
}

export interface DiscussionNotificationData extends BaseTemplateData {
  poolName: string;
  authorName: string;
  messagePreview: string;
  messageCount?: number;
  poolLink: string;
}

export interface RoundUpdateData extends BaseTemplateData {
  poolName: string;
  round: number;
  totalRounds: number;
  recipientName: string;
  contributionAmount: number;
  payoutAmount: number;
  dueDate: string;
  status: 'started' | 'completed' | 'reminder';
  poolLink: string;
}

// Currency formatter helper
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

// Date formatter helper
export function formatDate(date: string | Date, format: 'short' | 'long' = 'long'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (format === 'short') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
