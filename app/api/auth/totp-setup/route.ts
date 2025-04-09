import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/options';
import connectToDatabase from '@/lib/db/connect';
import { getUserModel } from '@/lib/db/models/user';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

// Generate TOTP secret and QR code on the server side
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

    // Generate a new TOTP secret
    const secret = speakeasy.generateSecret({
      name: `Juntas Seguras:${user.email}`
    });

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