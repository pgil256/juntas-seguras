import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import connectToDatabase from '../../../../lib/db/connect';
import getUserModel from '../../../../lib/db/models/user';
import { TwoFactorMethod } from '../../../../types/security';

// Generate TOTP secret (in a real app, use a proper library like speakeasy)
function generateTotpSecret() {
  return Array.from({ length: 16 }, () => 
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]
  ).join('');
}

// Generate backup codes
function generateBackupCodes() {
  return Array.from({ length: 8 }, () => 
    Array.from({ length: 8 }, () => 
      '0123456789'[Math.floor(Math.random() * 10)]
    ).join('')
  );
}

// POST /api/auth/register - Register a new user
export async function POST(request: NextRequest) {
  try {
    const { name, email, password, phone } = await request.json();
    
    // Simple validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }
    
    // Connect to database
    await connectToDatabase();
    
    // Get user model
    const UserModel = getUserModel();
    
    // Check if user already exists
    const existingUser = await UserModel.findOne({ email });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    
    // Hash the password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate MFA setup data
    const secret = generateTotpSecret();
    const backupCodes = generateBackupCodes();
    const userId = uuidv4();
    const now = new Date().toISOString();
    
    // Default method is email, but if phone is provided, use SMS
    const mfaMethod: TwoFactorMethod = phone ? 'sms' : 'email';
    
    // Generate a verification code for email/SMS methods
    const verificationCode = mfaMethod !== 'app' ? 
      String(Math.floor(100000 + Math.random() * 900000)) : 
      undefined;
    
    // Create the user with required MFA settings
    const newUser = await UserModel.create({
      id: userId,
      name,
      email,
      phone,
      hashedPassword: hashedPassword,
      createdAt: now,
      pools: [],
      twoFactorAuth: {
        enabled: true,
        method: mfaMethod,
        secret,
        backupCodes,
        email,
        phone,
        lastUpdated: now,
        verified: false,
        temporaryCode: verificationCode,
        codeGeneratedAt: verificationCode ? now : undefined
      },
      pendingMfaVerification: true,
      mfaSetupComplete: false,
      mfaRequiredFor: {
        paymentMethods: true,
        profileChanges: true
      }
    });
    
    // Don't return the password or sensitive MFA details in the response
    const userResponse = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      createdAt: newUser.createdAt,
      requiresMfaSetup: true,
      mfaMethod
    };
    
    // For development/testing only - In production, never return these sensitive details
    // in the registration response - they should be shown only during setup
    const mfaSetupData = process.env.NODE_ENV === 'development' ? {
      secret,
      backupCodes,
      verificationCode: verificationCode,
      qrCodeUrl: `otpauth://totp/JuntasApp:${email}?secret=${secret}&issuer=JuntasSeguras`
    } : {};
    
    return NextResponse.json({
      user: userResponse,
      mfaSetup: mfaSetupData,
      message: 'User registered successfully. MFA setup required to complete registration.'
    });
    
  } catch (error: any) {
    console.error('Error registering user:', error);
    
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}