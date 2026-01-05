/**
 * SMTP Email Provider
 * Uses nodemailer for sending emails via SMTP
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { EmailProvider, SendEmailOptions, SendEmailResult, EmailServiceConfig, EmailAddress } from '../types';

export class SMTPProvider implements EmailProvider {
  name = 'smtp';
  private transporter: Transporter | null = null;
  private config: EmailServiceConfig['smtp'];
  private defaultFrom: EmailAddress | string;

  constructor(config: EmailServiceConfig) {
    this.config = config.smtp;
    this.defaultFrom = config.defaultFrom;
  }

  private getTransporter(): Transporter | null {
    if (this.transporter) {
      return this.transporter;
    }

    if (!this.isConfigured()) {
      console.warn('[SMTP] Email provider not configured');
      return null;
    }

    // Create transporter based on config
    if (this.config?.service) {
      // Use predefined service (e.g., 'gmail')
      this.transporter = nodemailer.createTransport({
        service: this.config.service,
        auth: this.config.auth,
      });
    } else if (this.config?.host) {
      // Use custom SMTP host
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port || 587,
        secure: this.config.secure ?? false,
        auth: this.config.auth,
      });
    }

    return this.transporter;
  }

  isConfigured(): boolean {
    if (!this.config) return false;

    // Either service or host must be configured
    const hasConnection = !!(this.config.service || this.config.host);
    const hasAuth = !!(this.config.auth?.user && this.config.auth?.pass);

    return hasConnection && hasAuth;
  }

  private normalizeAddress(addr: EmailAddress | string): string {
    if (typeof addr === 'string') return addr;
    return addr.name ? `"${addr.name}" <${addr.email}>` : addr.email;
  }

  private normalizeAddresses(addrs: EmailAddress | EmailAddress[] | string | string[] | undefined): string | string[] | undefined {
    if (!addrs) return undefined;
    if (Array.isArray(addrs)) {
      return addrs.map(a => this.normalizeAddress(a));
    }
    return this.normalizeAddress(addrs);
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const transporter = this.getTransporter();

    if (!transporter) {
      return {
        success: false,
        error: 'SMTP transporter not configured',
        provider: this.name,
      };
    }

    try {
      const mailOptions = {
        from: options.from ? this.normalizeAddress(options.from) : this.normalizeAddress(this.defaultFrom),
        to: this.normalizeAddresses(options.to),
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo ? this.normalizeAddress(options.replyTo) : undefined,
        cc: this.normalizeAddresses(options.cc),
        bcc: this.normalizeAddresses(options.bcc),
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
          encoding: att.encoding,
        })),
        headers: options.headers,
      };

      const result = await transporter.sendMail(mailOptions);

      console.log(`[SMTP] Email sent successfully`, {
        messageId: result.messageId,
        to: options.to,
      });

      return {
        success: true,
        messageId: result.messageId,
        provider: this.name,
      };
    } catch (error: any) {
      console.error('[SMTP] Failed to send email:', {
        error: error.message,
        code: error.code,
      });

      return {
        success: false,
        error: error.message,
        provider: this.name,
      };
    }
  }
}

export function createSMTPProvider(config: EmailServiceConfig): SMTPProvider {
  return new SMTPProvider(config);
}
