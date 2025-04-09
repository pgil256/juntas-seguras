import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import nodemailer from 'nodemailer';
import connectToDatabase from '../db/connect';
import { getUserModel } from '../db/models/user';
import { generateVerificationCode } from '@/lib/utils/verification';
import QRCode from 'qrcode';

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'juntassegurasservice@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'mpdo mzvb dotr pqna'
  }
});

// Log email configuration for debugging
console.log('Email configuration:', {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASSWORD ? '[REDACTED]' : undefined,
  from: process.env.EMAIL_FROM
});

// Generate a random 6-digit code for email verification
function generateEmailCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send verification code via email (Modified for dummy code)
export async function sendEmailVerificationCode(userObjectId: string): Promise<boolean> {
  try {
    await connectToDatabase();
    const UserModel = getUserModel();
    
    // Find user by MongoDB _id
    const user = await UserModel.findById(userObjectId);
    if (!user || !user.email) {
      console.error('User not found or email not set for _id:', userObjectId);
      return false;
    }

    const dummyVerificationCode = "123456";
    console.log(`*** DEV MODE: Setting dummy MFA code ${dummyVerificationCode} for user ${user.email} ***`);

    // Use findByIdAndUpdate to set the dummy code and timestamp
    const updateResult = await UserModel.findByIdAndUpdate(
      userObjectId,
      {
        $set: {
          'twoFactorAuth.temporaryCode': dummyVerificationCode,
          'twoFactorAuth.codeGeneratedAt': new Date().toISOString(),
          'pendingMfaVerification': true
        }
      },
      { new: true }
    );

    if (!updateResult) {
      console.error('Failed to update user with dummy verification code');
      return false;
    }

    // Skip sending actual email
    console.log(`*** DEV MODE: Skipped sending actual email to ${user.email} ***`);

    return true;
  } catch (error) {
    console.error('Error setting dummy email verification code:', error);
    return false;
  }
}

// Verify email code
export async function verifyEmailCode(userObjectId: string, code: string): Promise<boolean> {
  try {
    await connectToDatabase();
    const UserModel = getUserModel();
    
    // Find user by MongoDB _id
    const user = await UserModel.findById(userObjectId);
    if (!user || !user.twoFactorAuth?.enabled) {
      console.error('User not found or MFA not enabled for _id:', userObjectId);
      return false;
    }

    // Check if the code matches
    console.log(`Verifying MFA for _id: ${userObjectId}. Comparing stored code: '${user.twoFactorAuth.temporaryCode}' with submitted code: '${code}'`);
    if (user.twoFactorAuth.temporaryCode !== code) {
      console.log('Email MFA code mismatch for _id:', userObjectId);
      return false;
    }

    // Check if the code is expired (10 minutes)
    const codeGeneratedAt = new Date(user.twoFactorAuth.codeGeneratedAt || 0);
    const now = new Date();
    const codeAgeInMinutes = (now.getTime() - codeGeneratedAt.getTime()) / (1000 * 60);

    if (codeAgeInMinutes > 10) {
      return false;
    }

    // Clear the temporary code using findByIdAndUpdate
    const updateResult = await UserModel.findByIdAndUpdate(
      userObjectId,
      {
        $set: {
          'pendingMfaVerification': false
        },
        $unset: {
          'twoFactorAuth.temporaryCode': "",
          'twoFactorAuth.codeGeneratedAt': ""
        }
      },
      { new: true }
    );

    if (!updateResult) {
      console.error('Failed to update user after code verification');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error verifying email code:', error);
    return false;
  }
}

// Generate TOTP secret and QR code
export async function generateTotpSecret(userId: string): Promise<{ secret: string; qrCode: string }> {
  try {
    await connectToDatabase();
    const UserModel = getUserModel();
    
    const user = await UserModel.findOne({ id: userId });
    if (!user) {
      throw new Error('User not found');
    }

    // Generate a new TOTP secret
    const secret = speakeasy.generateSecret({
      name: `Juntas Seguras:${user.email}`
    });

    // Generate QR code
    const qrCode = await qrcode.toDataURL(secret.otpauth_url);

    // Store the secret
    user.twoFactorAuth.totpSecret = secret.base32;
    await user.save();

    return {
      secret: secret.base32,
      qrCode
    };
  } catch (error) {
    console.error('Error generating TOTP secret:', error);
    throw error;
  }
}

// Verify TOTP code
export async function verifyTotpCode(userObjectId: string, code: string): Promise<boolean> {
  try {
    await connectToDatabase();
    const UserModel = getUserModel();
    
    // Find user by MongoDB _id
    const user = await UserModel.findById(userObjectId);
    if (!user || !user.twoFactorAuth?.enabled || !user.twoFactorAuth.totpSecret) {
      console.error('User not found, MFA not enabled, or TOTP secret missing for _id:', userObjectId);
      return false;
    }

    // Verify the TOTP code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorAuth.totpSecret,
      encoding: 'base32',
      token: code,
      window: 1 // Allow 1 step (30 seconds) before and after
    });

    if (verified) {
      user.pendingMfaVerification = false;
      await user.save();
    }

    return verified;
  } catch (error) {
    console.error('Error verifying TOTP code:', error);
    return false;
  }
}

export async function sendVerificationEmail(email: string, code: string) {
  try {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: 'Your Verification Code',
        text: `Your verification code is: ${code}`,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send verification email');
    }

    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
}

export async function enableTOTP(userId: string, secret: string) {
  try {
    await connectToDatabase();
    const UserModel = getUserModel();
    
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update the user with TOTP settings
    await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          'twoFactorAuth.totpSecret': secret,
          'twoFactorAuth.method': 'totp',
          'twoFactorAuth.enabled': true
        }
      }
    );

    return true;
  } catch (error) {
    console.error('Error enabling TOTP:', error);
    throw error;
  }
}

export async function disableTOTP(userId: string) {
  try {
    await connectToDatabase();
    const UserModel = getUserModel();
    
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update the user to disable TOTP
    await UserModel.findByIdAndUpdate(
      userId,
      {
        $unset: {
          'twoFactorAuth.totpSecret': ""
        },
        $set: {
          'twoFactorAuth.method': 'email',
          'twoFactorAuth.enabled': true // keep MFA enabled, just switch to email
        }
      }
    );

    return true;
  } catch (error) {
    console.error('Error disabling TOTP:', error);
    throw error;
  }
}

export async function verifyTOTP(userId: string, token: string) {
  try {
    await connectToDatabase();
    const UserModel = getUserModel();
    
    const user = await UserModel.findById(userId);
    if (!user || !user.twoFactorAuth?.totpSecret) {
      throw new Error('TOTP not enabled for user');
    }

    // Use speakeasy to verify the TOTP token
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorAuth.totpSecret,
      encoding: 'base32',
      token: token,
      window: 1 // Allow 1 step before/after
    });

    return isValid;
  } catch (error) {
    console.error('Error verifying TOTP:', error);
    throw error;
  }
} 