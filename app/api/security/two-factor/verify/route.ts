import { NextRequest, NextResponse } from 'next/server';
import { ActivityType } from '../../../../../types/security';
import connectToDatabase from '../../../../../lib/db/connect';
import { getUserModel } from '../../../../../lib/db/models/user';
import { getCurrentUser } from '../../../../../lib/auth';
import { logServerActivity } from '../../../../../lib/utils';
import { verifyEmailCode, verifyTotpCode } from '../../../../../lib/services/mfa';

export async function POST(request: NextRequest) {
  try {
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }

    const user = userResult.user;
    const { code, recoveryCode } = await request.json();

    if (!code && !recoveryCode) {
      return NextResponse.json(
        { error: 'Authentication code or recovery code is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const UserModel = getUserModel();
    const userId = user._id.toString();
    let success = false;
    let usedRecoveryCode = false;

    if (recoveryCode) {
      const backupCodes = user.twoFactorAuth?.backupCodes || [];
      if (backupCodes.includes(recoveryCode)) {
        success = true;
        usedRecoveryCode = true;
        await UserModel.findByIdAndUpdate(user._id, {
          $pull: { 'twoFactorAuth.backupCodes': recoveryCode },
          $set: {
            'twoFactorAuth.verified': true,
            'twoFactorAuth.enabled': true,
            pendingMfaVerification: false,
            mfaSetupComplete: true,
          },
        });
      }
    } else if (code && typeof code === 'string') {
      const method = user.twoFactorAuth?.method === 'totp' ? 'app' : user.twoFactorAuth?.method;

      if (method === 'app') {
        success = await verifyTotpCode(userId, code);
      } else {
        success = await verifyEmailCode(userId, code);
      }

      if (success) {
        await UserModel.findByIdAndUpdate(user._id, {
          $set: {
            'twoFactorAuth.verified': true,
            'twoFactorAuth.enabled': true,
            pendingMfaVerification: false,
            mfaSetupComplete: true,
          },
        });
      }
    }

    if (!success) {
      logServerActivity(userId, ActivityType.SUSPICIOUS_ACTIVITY, {
        method: user.twoFactorAuth?.method || 'unknown',
        event: 'two_factor_failed',
      });

      return NextResponse.json(
        { error: 'Invalid authentication code' },
        { status: 401 }
      );
    }

    logServerActivity(userId, ActivityType.TWO_FACTOR_SETUP, {
      usedRecoveryCode,
      method: user.twoFactorAuth?.method || 'unknown',
      verified: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication verified successfully',
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify two-factor authentication' },
      { status: 500 }
    );
  }
}
