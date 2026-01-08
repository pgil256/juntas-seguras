import { NextRequest, NextResponse } from 'next/server';
import { sendEmailVerificationCode } from '../../../../lib/services/mfa';
import { getCurrentUser } from '../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get current user with proper ObjectId validation
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;
    const userId = user._id.toString();

    // Send verification code
    console.log(`Sending verification code to user ${userId}`);
    const sent = await sendEmailVerificationCode(userId);

    if (!sent) {
      return NextResponse.json(
        { error: 'Failed to send verification code' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully'
    });
  } catch (error) {
    console.error('Error sending verification code:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}
