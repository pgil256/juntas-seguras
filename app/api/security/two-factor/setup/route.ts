import { NextRequest, NextResponse } from 'next/server';
import qrcode from 'qrcode';
import speakeasy from 'speakeasy';
import { ActivityType } from '../../../../../types/security';
import connectToDatabase from '../../../../../lib/db/connect';
import { getUserModel } from '../../../../../lib/db/models/user';
import { getCurrentUser } from '../../../../../lib/auth';
import { logServerActivity } from '../../../../../lib/utils';
import { sendEmailVerificationCode } from '../../../../../lib/services/mfa';
import { generateBackupCodes } from '../../../../../lib/utils/verification';

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
    const { method } = await request.json();

    if (!method || !['app', 'email', 'totp'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid authentication method. Must be app or email' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const UserModel = getUserModel();
    const normalizedMethod = method === 'totp' ? 'app' : method;
    const backupCodes = generateBackupCodes();

    if (normalizedMethod === 'app') {
      const secret = speakeasy.generateSecret({
        name: `Juntas Seguras:${user.email}`,
      });

      if (!secret.base32 || !secret.otpauth_url) {
        return NextResponse.json(
          { error: 'Failed to generate authenticator secret' },
          { status: 500 }
        );
      }

      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

      await UserModel.findByIdAndUpdate(user._id, {
        $set: {
          'twoFactorAuth.enabled': true,
          'twoFactorAuth.method': 'app',
          'twoFactorAuth.totpSecret': secret.base32,
          'twoFactorAuth.backupCodes': backupCodes,
          'twoFactorAuth.verified': false,
          'twoFactorAuth.lastUpdated': new Date().toISOString(),
        },
      });

      logServerActivity(user._id.toString(), ActivityType.TWO_FACTOR_SETUP, { method: 'app' });

      return NextResponse.json({
        success: true,
        secret: secret.base32,
        backupCodes,
        qrCodeUrl,
      });
    }

    await UserModel.findByIdAndUpdate(user._id, {
      $set: {
        'twoFactorAuth.enabled': true,
        'twoFactorAuth.method': 'email',
        'twoFactorAuth.backupCodes': backupCodes,
        'twoFactorAuth.verified': false,
        'twoFactorAuth.lastUpdated': new Date().toISOString(),
      },
    });

    const sent = await sendEmailVerificationCode(user._id.toString());
    if (!sent) {
      return NextResponse.json(
        { error: 'Failed to send verification code' },
        { status: 500 }
      );
    }

    logServerActivity(user._id.toString(), ActivityType.TWO_FACTOR_SETUP, { method: 'email' });

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
      backupCodes,
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'Failed to set up two-factor authentication' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Two-factor authentication is required and cannot be disabled' },
    { status: 400 }
  );
}

export async function GET() {
  try {
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }

    const user = userResult.user;
    const twoFactorAuth = user.twoFactorAuth;

    if (!twoFactorAuth) {
      return NextResponse.json({
        enabled: false,
        method: null,
      });
    }

    return NextResponse.json({
      enabled: twoFactorAuth.enabled,
      method: twoFactorAuth.method === 'totp' ? 'app' : twoFactorAuth.method,
      verified: twoFactorAuth.verified,
      lastUpdated: twoFactorAuth.lastUpdated,
      email: twoFactorAuth.email || user.email,
      hasBackupCodes: !!twoFactorAuth.backupCodes?.length,
    });
  } catch (error) {
    console.error('2FA status error:', error);
    return NextResponse.json(
      { error: 'Failed to get two-factor authentication status' },
      { status: 500 }
    );
  }
}
