import crypto from 'crypto';
import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/db/connect';
import { getUserModel } from '../../../../lib/db/models/user';
import * as bcrypt from 'bcryptjs';

function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();
    
    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    if (typeof token !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Token and password must be valid strings' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const UserModel = getUserModel();

    const user = await UserModel.findOne({
      resetToken: hashResetToken(token),
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const updateResult = await UserModel.findByIdAndUpdate(
        user._id,
        {
          $set: { hashedPassword },
          $unset: { resetToken: "", resetTokenExpiry: "" }
        },
        { new: true }
      );

      if (!updateResult) {
        console.error('Failed to update user password');
        return NextResponse.json(
          { error: 'Failed to reset password' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });

    } catch (updateError) {
      console.error('Error updating user after password reset:', updateError);
      return NextResponse.json(
        { error: 'Failed to save password reset' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in reset password:', error);
    return NextResponse.json(
      { error: 'An error occurred while resetting your password' },
      { status: 500 }
    );
  }
} 
