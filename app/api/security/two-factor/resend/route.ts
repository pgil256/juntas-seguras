import { NextRequest, NextResponse } from 'next/server';
import { TwoFactorMethod, ActivityType } from '@/types/security';
import connectToDatabase from '@/lib/db/connect';
import getUserModel from '@/lib/db/models/user';
import { logServerActivity } from '@/lib/utils';

// Function to generate a 6-digit verification code
function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, method } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!method || !['app', 'sms', 'email'].includes(method)) {
      return NextResponse.json(
        { error: 'Valid authentication method is required' },
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
    
    // Initialize twoFactorAuth if it doesn't exist
    if (!user.twoFactorAuth) {
      user.twoFactorAuth = {
        enabled: true,
        method: method as TwoFactorMethod,
        verified: false,
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Generate a new verification code
    const verificationCode = generateVerificationCode();
    
    // In a real app, we would send the verification code via the appropriate channel
    // For email method, send an email
    // For SMS method, send a text message
    // For app method, no code needs to be sent
    
    // For development purposes, we'll store the code in user.twoFactorAuth.temporaryCode
    // In a real app, this would be encrypted and time-limited
    if (!user.twoFactorAuth) {
      user.twoFactorAuth = {};
    }
    
    user.twoFactorAuth.enabled = true;
    user.twoFactorAuth.method = method as TwoFactorMethod;
    user.twoFactorAuth.temporaryCode = verificationCode;
    user.twoFactorAuth.codeGeneratedAt = new Date().toISOString();
    await user.save();
    
    // Log the activity
    logServerActivity(userId, ActivityType.TWO_FACTOR_SETUP, { 
      method: method as TwoFactorMethod,
      action: 'code_resent'
    });

    // IMPORTANT SECURITY NOTE:
    // In a production environment, you would:
    // 1. Never return the actual verification code in the response
    // 2. Send the code via the selected method (email/SMS) using a service like SendGrid or Twilio
    // 3. Store a salted and hashed version of the code, not plaintext
    
    // For development only - return the code for testing (REMOVE IN PRODUCTION!)
    const developmentResponse = process.env.NODE_ENV === 'development' ? 
      { verificationCode } : {};

    return NextResponse.json({
      success: true,
      message: `Verification code sent via ${method}`,
      sentTo: method === 'email' ? user.email : (method === 'sms' ? user.phone : 'authenticator app'),
      ...developmentResponse
    });
    
  } catch (error) {
    console.error('Failed to resend 2FA code:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}

