import { NextRequest, NextResponse } from 'next/server';
import { TwoFactorMethod, ActivityType } from '../../../../../types/security';
import connectToDatabase from '../../../../../lib/db/connect';
import { getUserModel } from '../../../../../lib/db/models/user';
import { logServerActivity } from '../../../../../lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, method } = body;

    if (!userId || !method) {
      return NextResponse.json(
        { error: 'User ID and authentication method are required' },
        { status: 400 }
      );
    }

    // Validate method type (email-only MFA - no SMS)
    if (!['app', 'email'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid authentication method. Must be app or email' },
        { status: 400 }
      );
    }

    // Connect to the database and get the user
    await connectToDatabase();
    const UserModel = getUserModel();
    const user = await UserModel.findOne({ id: userId });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate a proper secret (in a real app, this would use a library like speakeasy)
    const secret = generateTotpSecret();

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Update the user with 2FA settings (email-only MFA - no phone)
    user.twoFactorAuth = {
      enabled: true,
      method: method as TwoFactorMethod,
      secret,
      backupCodes,
      lastUpdated: new Date().toISOString(),
      email: body.email || user.email,
      verified: false // Will be set to true when first verified
    };

    await user.save();

    // Log the activity
    logServerActivity(userId, ActivityType.TWO_FACTOR_SETUP, { method });

    // For email method, a verification code would be sent
    // For app method, return the secret for QR code generation
    if (method === 'app') {
      return NextResponse.json({
        success: true,
        secret,
        backupCodes,
        qrCodeUrl: `otpauth://totp/JuntasApp:${user.email}?secret=${secret}&issuer=JuntasSeguras`,
      });
    } else {
      // Email verification - send verification code via email
      const tempCode = '123456'; // In production, generate a random code and store it

      return NextResponse.json({
        success: true,
        message: 'Verification code sent to your email',
        backupCodes,
        // Remove in production - just for testing purposes
        tempCode
      });
    }
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'Failed to set up two-factor authentication' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Connect to the database and get the user
    await connectToDatabase();
    const UserModel = getUserModel();
    const user = await UserModel.findOne({ id: userId });

    if (!user || !user.twoFactorAuth || !user.twoFactorAuth.enabled) {
      return NextResponse.json(
        { error: 'Two-factor authentication is not enabled for this user' },
        { status: 404 }
      );
    }

    // Disable 2FA but keep the settings
    user.twoFactorAuth.enabled = false;
    user.twoFactorAuth.lastUpdated = new Date().toISOString();
    await user.save();

    // Log the activity
    logServerActivity(userId, ActivityType.TWO_FACTOR_DISABLE, {});

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication has been disabled'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: 'Failed to disable two-factor authentication' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Connect to the database and get the user
    await connectToDatabase();
    const UserModel = getUserModel();
    const user = await UserModel.findOne({ id: userId });

    if (!user || !user.twoFactorAuth) {
      return NextResponse.json({
        enabled: false,
        method: null
      });
    }

    // Don't return the actual secret or backup codes for security
    type TwoFactorWithToObject = typeof user.twoFactorAuth & { toObject?: () => Record<string, unknown> };
    const twoFactorObj = (user.twoFactorAuth as TwoFactorWithToObject).toObject
      ? (user.twoFactorAuth as TwoFactorWithToObject).toObject!()
      : (user.twoFactorAuth as Record<string, unknown>);
    const { secret: _secret, backupCodes: _backupCodes, ...safeData } = twoFactorObj;

    return NextResponse.json(safeData);
  } catch (error) {
    console.error('2FA status error:', error);
    return NextResponse.json(
      { error: 'Failed to get two-factor authentication status' },
      { status: 500 }
    );
  }
}

// Helper functions
function generateTotpSecret() {
  // In a real app, this would generate a proper TOTP secret using a library like speakeasy
  // Example:
  // const speakeasy = require('speakeasy');
  // return speakeasy.generateSecret({ length: 20 }).base32;

  // For now, we generate a mock secret
  return Array.from({ length: 16 }, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]
  ).join('');
}

function generateBackupCodes() {
  // Generate 8 backup codes, each 8 digits long
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () =>
      '0123456789'[Math.floor(Math.random() * 10)]
    ).join('')
  );
}
