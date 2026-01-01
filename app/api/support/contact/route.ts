import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Email configuration from environment variables
const SUPPORT_EMAIL = process.env.EMAIL_USER || 'juntassegurasservice@gmail.com';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.EMAIL_USER || 'juntassegurasservice@gmail.com';
const SMTP_PASSWORD = process.env.EMAIL_PASSWORD || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message, category, priority, userId } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create a nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    });

    // Format the subject line
    const subjectLine = subject 
      ? `[${category || 'General'}] ${subject}` 
      : `[${category || 'General'}] Support Request`;

    // Prepare email content
    const mailOptions = {
      from: `"Juntas Seguras Support" <${SUPPORT_EMAIL}>`,
      to: SUPPORT_EMAIL,
      replyTo: email,
      subject: subjectLine,
      text: `
Name: ${name}
Email: ${email}
Category: ${category || 'General'}
Priority: ${priority || 'Normal'}
User ID: ${userId || 'Not provided'}

Message:
${message}
      `,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2563eb;">New Support Request</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Name:</strong></td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${name}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${email}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Category:</strong></td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${category || 'General'}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Priority:</strong></td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${priority || 'Normal'}</td>
    </tr>
    ${userId ? `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>User ID:</strong></td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${userId}</td>
    </tr>
    ` : ''}
  </table>
  
  <div style="background-color: #f9fafb; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
    <h3 style="margin-top: 0; color: #374151;">Message:</h3>
    <p style="white-space: pre-line;">${message.replace(/\n/g, '<br>')}</p>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">This message was sent from the Juntas Seguras support form.</p>
</div>
      `,
    };

    // For development testing, log the email content instead of sending
    if (process.env.NODE_ENV === 'development') {
      console.log('Email would be sent in production:');
      console.log(mailOptions);
      
      // Mock successful sending
      return NextResponse.json({ 
        success: true,
        message: 'Support request submitted successfully (development mode)',
        ticketId: `DEV-${Date.now().toString(36).toUpperCase()}`
      });
    }

    // Send the email (in production)
    await transporter.sendMail(mailOptions);

    // Create a ticket ID for reference (in a real app, this would come from a ticketing system)
    const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;

    // Return success response
    return NextResponse.json({ 
      success: true,
      message: 'Support request submitted successfully',
      ticketId
    });
  } catch (error) {
    console.error('Support email error:', error);
    
    return NextResponse.json(
      { error: 'Failed to send support request. Please try again later.' },
      { status: 500 }
    );
  }
}

// For testing the connection
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    // Create a nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    });

    // Verify the connection
    await transporter.verify();
    
    return NextResponse.json({
      success: true,
      message: 'SMTP connection verified successfully',
      config: {
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        user: SMTP_USER ? '********' : 'Not configured',
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'SMTP connection failed',
        details: error.message,
        config: {
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_PORT === 465,
          user: SMTP_USER ? '********' : 'Not configured',
        }
      },
      { status: 500 }
    );
  }
}