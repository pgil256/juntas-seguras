import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/options';
import connectToDatabase from '@/lib/db/connect';
import { getUserModel } from '@/lib/db/models/user';
import speakeasy from 'speakeasy';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const UserModel = getUserModel();
    
    // Find the user by ObjectId
    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has a pending TOTP secret
    if (!user.twoFactorAuth?.pendingTotpSecret) {
      return NextResponse.json(
        { error: 'No pending TOTP setup found' },
        { status: 400 }
      );
    }

    // Verify the TOTP code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorAuth.pendingTotpSecret,
      encoding: 'base32',
      token: code,
      window: 1 // Allow 1 step (30 seconds) before and after
    });

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Update the user with the verified TOTP secret
    await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          'twoFactorAuth.totpSecret': user.twoFactorAuth.pendingTotpSecret,
          'twoFactorAuth.verified': true,
          'twoFactorAuth.method': 'totp',
          'mfaSetupComplete': true
        },
        $unset: {
          'twoFactorAuth.pendingTotpSecret': ""
        }
      }
    );

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