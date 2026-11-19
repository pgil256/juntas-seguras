import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import { confirmAuthenticatorEnrollment } from '../../../../lib/services/authenticator-enrollment';

export async function POST(request: NextRequest) {
  try {
    // Get current user with proper ObjectId validation
    const userResult = await getCurrentUser({ requireCompletedSignIn: true });
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const { code } = await request.json();
    if (typeof code !== 'string' || !await confirmAuthenticatorEnrollment(userResult.user, code)) {
      return NextResponse.json({ error: 'Invalid or superseded authenticator code' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'TOTP authentication successfully set up'
    });
  } catch (error) {
    console.error('Error verifying TOTP:', error);
    return NextResponse.json(
      { error: 'Failed to verify TOTP code' },
      { status: 500 }
    );
  }
}
