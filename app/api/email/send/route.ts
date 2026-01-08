import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Create reusable transporter with Gmail
const createTransporter = () => {
  console.log('[EMAIL API] Creating transporter with:', {
    user: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 5)}...` : 'NOT SET',
    passwordSet: !!process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER
  });

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

export async function POST(request: Request) {
  console.log('[EMAIL API] Received POST request');

  try {
    const body = await request.json();
    const { to, subject, text, html } = body;

    console.log('[EMAIL API] Request body:', {
      to,
      subject,
      hasText: !!text,
      hasHtml: !!html,
      textLength: text?.length || 0,
      htmlLength: html?.length || 0
    });

    if (!to || !subject) {
      console.error('[EMAIL API] Missing required fields:', { to: !!to, subject: !!subject });
      return NextResponse.json(
        { error: 'Missing required fields: to, subject' },
        { status: 400 }
      );
    }

    // Ensure at least text or html content is provided
    if (!text && !html) {
      console.error('[EMAIL API] Missing content: neither text nor html provided');
      return NextResponse.json(
        { error: 'Either text or html content is required' },
        { status: 400 }
      );
    }

    // Validate email user is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('[EMAIL API] Email credentials not configured:', {
        EMAIL_USER: !!process.env.EMAIL_USER,
        EMAIL_PASSWORD: !!process.env.EMAIL_PASSWORD
      });
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const transporter = createTransporter();

    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text: text || undefined,
      html: html || undefined,
    };

    console.log(`[EMAIL API] Sending email to ${to} with subject: ${subject}`);

    const result = await transporter.sendMail(mailOptions);

    console.log(`[EMAIL API] Email sent successfully to ${to}`, {
      messageId: result.messageId,
      response: result.response
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId
    });
  } catch (error: any) {
    console.error('[EMAIL API] Error sending email:', {
      message: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      stack: error.stack
    });
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
} 