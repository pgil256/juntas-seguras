import { Twilio } from 'twilio';
import connectToDatabase from '../db/connect';
import getUserModel from '../db/models/user';
import { generateVerificationCode } from '@/lib/utils/verification';

// Initialize Twilio client with credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

if (!accountSid || !authToken || !verifyServiceSid) {
  throw new Error('Missing required Twilio environment variables');
}

// Development mode flag
const isDevelopment = process.env.NODE_ENV === 'development';

// Send MFA verification code
export async function sendMfaVerificationCode(userId: string): Promise<boolean> {
  try {
    await connectToDatabase();
    const UserModel = getUserModel();
    
    const user = await UserModel.findOne({ id: userId });
    if (!user || !user.phone) {
      throw new Error('User not found or phone number not set');
    }

    if (isDevelopment) {
      // In development, generate and store a code
      const verificationCode = generateVerificationCode();
      user.twoFactorAuth.temporaryCode = verificationCode;
      user.twoFactorAuth.codeGeneratedAt = new Date().toISOString();
      user.pendingMfaVerification = true;
      await user.save();
      
      console.log('Development mode: MFA code would be:', verificationCode);
      return true;
    }

    // Production: Use Twilio Verify
    const twilioClient = new Twilio(accountSid, authToken);
    const verification = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: user.phone, channel: 'sms' });

    if (verification.status === 'pending') {
      user.pendingMfaVerification = true;
      await user.save();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error sending MFA verification code:', error);
    return false;
  }
}

// Verify MFA code
export async function verifyMfaCode(userId: string, code: string): Promise<boolean> {
  try {
    await connectToDatabase();
    const UserModel = getUserModel();
    
    const user = await UserModel.findOne({ id: userId });
    if (!user || !user.phone) {
      return false;
    }

    if (isDevelopment) {
      // In development, verify against stored code
      if (user.twoFactorAuth.temporaryCode === code) {
        // Check if code is expired (10 minutes)
        const codeGeneratedAt = new Date(user.twoFactorAuth.codeGeneratedAt || 0);
        const now = new Date();
        const codeAgeInMinutes = (now.getTime() - codeGeneratedAt.getTime()) / (1000 * 60);

        if (codeAgeInMinutes > 10) {
          return false;
        }

        // Clear the temporary code
        user.twoFactorAuth.temporaryCode = null;
        user.twoFactorAuth.codeGeneratedAt = null;
        user.pendingMfaVerification = false;
        await user.save();
        return true;
      }
      return false;
    }

    // Production: Use Twilio Verify
    const twilioClient = new Twilio(accountSid, authToken);
    const verificationCheck = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: user.phone, code });

    if (verificationCheck.status === 'approved') {
      user.pendingMfaVerification = false;
      await user.save();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error verifying MFA code:', error);
    return false;
  }
} 