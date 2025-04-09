import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectToDatabase from '../../../../lib/db/connect';
import { getUserModel } from '../../../../lib/db/models/user';
import { authOptions } from '../[...nextauth]/options';
import { verifyEmailCode, verifyTotpCode } from '../../../../lib/services/mfa';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    // Verify MFA code based on session method
    let mfaValid = false;
    if (session.mfaMethod === 'email') {
      mfaValid = await verifyEmailCode(session.user.id, code);
    } else if (session.mfaMethod === 'totp' || session.mfaMethod === 'app') {
      mfaValid = await verifyTotpCode(session.user.id, code);
    }

    if (!mfaValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // MFA verification successful
    return NextResponse.json({
      success: true,
      message: 'MFA verification successful' 
    });
  } catch (error) {
    console.error('Error in MFA verification:', error);
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    );
  }
} 