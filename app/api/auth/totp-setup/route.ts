import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import { startAuthenticatorEnrollment } from '../../../../lib/services/authenticator-enrollment';

// Generate TOTP secret and QR code on the server side
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
    const setup = await startAuthenticatorEnrollment(userResult.user);
    return NextResponse.json({ success: true, ...setup }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error setting up TOTP:', error);
    return NextResponse.json(
      { error: 'Failed to setup TOTP authentication' },
      { status: 500 }
    );
  }
}
