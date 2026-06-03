import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import connectToDatabase from '../../../../lib/db/connect';
import { getUserModel } from '../../../../lib/db/models/user';
import { getClientIp, RateLimiters } from '../../../../lib/utils/rate-limiter';

const PASSWORD_RESET_SUCCESS = 'If an account exists with this email, you will receive password reset instructions.';

function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const rateLimitResult = RateLimiters.passwordReset(`${getClientIp(request)}:${trimmedEmail}`);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many password reset requests. Please try again later.',
          retryAfter: Math.ceil(rateLimitResult.retryAfterMs / 1000),
        },
        { status: 429 }
      );
    }

    await connectToDatabase();
    const UserModel = getUserModel();
    const user = await UserModel.findOne({ email: trimmedEmail });

    if (!user) {
      return NextResponse.json({ success: true, message: PASSWORD_RESET_SUCCESS });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await UserModel.findByIdAndUpdate(user._id, {
      $set: {
        resetToken: hashResetToken(resetToken),
        resetTokenExpiry,
      },
    });

    const transporter = createTransporter();
    if (!transporter) {
      console.warn('Password reset requested, but email credentials are not configured.');
      return NextResponse.json({ success: true, message: PASSWORD_RESET_SUCCESS });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: user.email,
      subject: 'Reset Your Juntas Seguras Password',
      text: `Use this link to reset your password: ${resetUrl}\n\nThis link will expire in 1 hour.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>Use the button below to reset your password. This link will expire in 1 hour.</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${resetUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a>
          </p>
          <p>If you did not request a password reset, you can ignore this email.</p>
          <p style="word-break: break-all; color: #4b5563;">${resetUrl}</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: PASSWORD_RESET_SUCCESS });
  } catch (error) {
    console.error('Error in forgot password:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
} 
