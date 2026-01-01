import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import { getUserModel } from '@/lib/db/models/user';
import { getCurrentUser } from '@/lib/auth';

/**
 * API route to clear MFA flags in the session
 * This is used after successful MFA verification to update the session
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
    const user = userResult.user;

    await connectToDatabase();
    const UserModel = getUserModel();

    // Update user to clear MFA flags
    await UserModel.findByIdAndUpdate(
      user._id,
      { $set: { pendingMfaVerification: false } }
    );

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
