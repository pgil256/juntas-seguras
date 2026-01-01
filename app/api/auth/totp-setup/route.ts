import { NextRequest, NextResponse } from 'next/server';
import { getUserModel } from '../../../../lib/db/models/user';
import { getCurrentUser } from '../../../../lib/auth';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

// Generate TOTP secret and QR code on the server side
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
    const UserModel = getUserModel();

    // Generate a new TOTP secret
    const secret = speakeasy.generateSecret({
      name: `Juntas Seguras:${user.email}`
    });

    if (!secret.otpauth_url) {
      return NextResponse.json(
        { error: 'Failed to generate TOTP secret' },
        { status: 500 }
      );
    }

    // Generate QR code as data URL
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    // Store the secret temporarily in the user document
    // We'll confirm it once verified
    await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          'twoFactorAuth.pendingTotpSecret': secret.base32,
          'twoFactorAuth.method': 'totp',
        }
      }
    );

    // Return the secret and QR code to the client
    return NextResponse.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl
    });
  } catch (error) {
    console.error('Error setting up TOTP:', error);
    return NextResponse.json(
      { error: 'Failed to setup TOTP authentication' },
      { status: 500 }
    );
  }
}
