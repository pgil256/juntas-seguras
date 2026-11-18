import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';

/**
 * Clients may refresh their session after the verification service records success.
 */
export async function POST(req: NextRequest) {
  try {
    // Get current user with proper validation
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    if (userResult.user.pendingMfaVerification) {
      return NextResponse.json(
        { error: 'Verification is still pending' },
        { status: 403 }
      );
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Session updated successfully'
    });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}
