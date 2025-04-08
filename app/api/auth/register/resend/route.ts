import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { User } from '@/lib/db/models/user';
import { generateVerificationCode } from '@/lib/utils/verification';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const { userId, email, verificationMethod } = await req.json();

    if (!userId || !email || !verificationMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find the user
    const user = await User.findOne({ _id: userId, email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with new verification code
    user.verificationCode = verificationCode;
    user.verificationCodeExpiresAt = expiresAt;
    await user.save();

    // Send verification email
    if (verificationMethod === 'email') {
      await sendVerificationEmail(email, verificationCode);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Failed to resend verification code' },
      { status: 500 }
    );
  }
} 