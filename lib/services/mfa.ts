import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import nodemailer from 'nodemailer';
import connectToDatabase from '../db/connect';
import getUserModel from '../db/models/user';

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'juntassegurasservice@gmail.com',
    pass: 'mpdo mzvb dotr pqna'
  }
});

// Generate a random 6-digit code for email verification
function generateEmailCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send verification code via email
export async function sendEmailVerificationCode(userObjectId: string): Promise<boolean> {
  try {
    await connectToDatabase();
    const UserModel = getUserModel();
    
    // Find user by MongoDB _id
    const user = await UserModel.findById(userObjectId);
    if (!user || !user.email) {
      console.error('User not found or email not set for _id:', userObjectId);
      return false; // Return false instead of throwing
    }

    const verificationCode = generateEmailCode();
    
    // Initialize twoFactorAuth if it doesn't exist
    if (!user.twoFactorAuth) {
      user.twoFactorAuth = {}; // Initialize if null/undefined
    }

    // Update user with the new code
    user.twoFactorAuth.temporaryCode = verificationCode;
    user.twoFactorAuth.codeGeneratedAt = new Date().toISOString();
    user.pendingMfaVerification = true;
    await user.save();

    // Send email
    await transporter.sendMail({
      from: 'juntassegurasservice@gmail.com',
      to: user.email,
      subject: 'Your Juntas Seguras Verification Code',
      text: `Your verification code is: ${verificationCode}. This code will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Juntas Seguras Verification Code</h2>
          <p>Your verification code is: <strong>${verificationCode}</strong></p>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `
    });

    return true;
  } catch (error) {
    console.error('Error sending email verification code:', error);
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

    // Clear the temporary code
    user.twoFactorAuth.temporaryCode = null;
    user.twoFactorAuth.codeGeneratedAt = null;
    user.pendingMfaVerification = false;
    await user.save();

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