import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import nodemailer from 'nodemailer';
import connectToDatabase from '../db/connect';
import { getUserModel, User } from '../db/models/user';
import { generateVerificationCode } from '../utils/verification';
import { isValidObjectId } from '../utils/objectId';

// Email configuration
const createTransporter = () => {
  console.log('[MFA] Creating email transporter with:', {
    user: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 5)}...` : 'NOT SET',
    passwordSet: !!process.env.EMAIL_PASSWORD
  });

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('[MFA] Email credentials not configured - emails will not be sent');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Create a global transporter (lazy initialization to ensure env vars are loaded)
let transporter: nodemailer.Transporter | null = null;
const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

// Generate a random 6-digit code for verification
function generateEmailCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send verification code via email (Modified for dummy code)
export async function sendEmailVerificationCode(userId: string): Promise<boolean> {
  try {
    // Validate ObjectId format before querying
    if (!isValidObjectId(userId)) {
      console.error('[MFA] Invalid user ID format:', userId);
      return false;
    }

    await connectToDatabase();
    const UserModel = getUserModel();

    // Always use MongoDB _id for consistency
    const user = await UserModel.findById(userId);

    if (!user || !user.email) {
      console.error('User not found or email not set for user:', userId);
      return false;
    }

    // Check if there's already a valid code (generated within the last 2 minutes)
    if (user.twoFactorAuth?.temporaryCode && user.twoFactorAuth?.codeGeneratedAt) {
      const codeGeneratedAt = new Date(user.twoFactorAuth.codeGeneratedAt);
      const now = new Date();
      const codeAgeInMinutes = (now.getTime() - codeGeneratedAt.getTime()) / (1000 * 60);
      
      if (codeAgeInMinutes < 2) {
        // Recent code exists, not generating new one
        return true; // Don't send a new code, use the existing one
      }
    }

    // Generate a real verification code
    const verificationCode = generateEmailCode();
    
    // Setting MFA code for user

    // Update user with verification code using MongoDB _id
    const updateResult = await UserModel.findByIdAndUpdate(
      user._id,
      {
        $set: {
          'twoFactorAuth.temporaryCode': verificationCode,
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

    // Attempt to send email
    try {
      const emailTransporter = getTransporter();
      if (!emailTransporter) {
        console.warn('[MFA] Email transporter not configured. Skipping email send.');
      } else {
        const mailOptions = {
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: user.email,
          subject: 'Your Verification Code',
          text: `Your verification code for Juntas Seguras is: ${verificationCode}\n\nThis code will expire in 10 minutes.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Juntas Seguras Verification</h2>
              <p>Your verification code is:</p>
              <div style="background-color: #f4f4f4; padding: 12px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 4px;">
                ${verificationCode}
              </div>
              <p>This code will expire in 10 minutes.</p>
            </div>
          `
        };

        console.log(`[MFA] Sending verification email to ${user.email}`);
        const result = await emailTransporter.sendMail(mailOptions);
        console.log(`[MFA] Email sent successfully to ${user.email}`, {
          messageId: result.messageId,
          response: result.response
        });
      }
    } catch (emailError: any) {
      console.error('[MFA] Failed to send email:', {
        message: emailError.message,
        code: emailError.code,
        command: emailError.command
      });
      // Continue even if email fails - at least we've set the code in the database
    }

    // Successfully set verification code
    return true;
  } catch (error) {
    console.error('Error setting email verification code:', error);
    return false;
  }
}

// Verify email code
export async function verifyEmailCode(userId: string, code: string): Promise<boolean> {
  try {
    // Validate ObjectId format before querying
    if (!isValidObjectId(userId)) {
      console.error('[MFA] Invalid user ID format for verifyEmailCode:', userId);
      return false;
    }

    await connectToDatabase();
    const UserModel = getUserModel();

    // Always use MongoDB _id for consistency
    const user = await UserModel.findById(userId);

    if (!user || !user.twoFactorAuth?.enabled) {
      console.error('User not found or MFA not enabled for user:', userId);
      return false;
    }

    // Check if the code matches
    if (user.twoFactorAuth.temporaryCode !== code) {
      // Email MFA code mismatch
      return false;
    }

    // Check if the code is expired (10 minutes)
    const codeGeneratedAt = new Date(user.twoFactorAuth.codeGeneratedAt || 0);
    const now = new Date();
    const codeAgeInMinutes = (now.getTime() - codeGeneratedAt.getTime()) / (1000 * 60);

    if (codeAgeInMinutes > 10) {
      return false;
    }

    // Clear the temporary code using MongoDB _id
    const updateResult = await UserModel.findByIdAndUpdate(
      user._id,
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
    // Validate ObjectId format before querying
    if (!isValidObjectId(userId)) {
      throw new Error('Invalid user ID format');
    }

    await connectToDatabase();
    const UserModel = getUserModel();

    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate a new TOTP secret
    const secret = speakeasy.generateSecret({
      name: `Juntas Seguras:${user.email}`
    });

    if (!secret.otpauth_url) {
      throw new Error('Failed to generate TOTP secret');
    }

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
    // Validate ObjectId format before querying
    if (!isValidObjectId(userObjectId)) {
      console.error('[MFA] Invalid user ID format for verifyTotpCode:', userObjectId);
      return false;
    }

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
    const emailTransporter = getTransporter();
    if (!emailTransporter) {
      throw new Error('Email transporter not configured - check EMAIL_USER and EMAIL_PASSWORD env vars');
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Your Verification Code',
      text: `Your verification code is: ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verification Code</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f4f4f4; padding: 12px; font-size: 24px; font-weight: bold; text-align: center;">
            ${code}
          </div>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `
    };

    console.log(`[MFA] Sending verification email to ${email}`);
    const result = await emailTransporter.sendMail(mailOptions);
    console.log(`[MFA] Verification email sent to ${email}:`, {
      messageId: result.messageId,
      response: result.response
    });
    return true;
  } catch (error: any) {
    console.error('[MFA] Error sending verification email:', {
      message: error.message,
      code: error.code
    });
    throw error;
  }
}

export async function enableTOTP(userId: string, secret: string) {
  try {
    // Validate ObjectId format before querying
    if (!isValidObjectId(userId)) {
      throw new Error('Invalid user ID format');
    }

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
    // Validate ObjectId format before querying
    if (!isValidObjectId(userId)) {
      throw new Error('Invalid user ID format');
    }

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
    // Validate ObjectId format before querying
    if (!isValidObjectId(userId)) {
      throw new Error('Invalid user ID format');
    }

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

 