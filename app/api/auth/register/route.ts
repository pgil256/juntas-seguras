import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import connectToDatabase from '../../../../lib/db/connect';
import { getUserModel } from '../../../../lib/db/models/user';
import { TwoFactorMethod } from '../../../../types/security';
import nodemailer from 'nodemailer';
import * as speakeasy from 'speakeasy';

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'juntassegurasservice@gmail.com',
    pass: 'mpdo mzvb dotr pqna'
  }
});

// Verify email configuration
console.log('Email configuration:', {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
  from: process.env.EMAIL_FROM
});

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
    const { name, email, password, verificationMethod } = await request.json();
    
    console.log('Registration request received:', { name, email, verificationMethod });
    
    if (!name || !email || !password || !verificationMethod) {
      console.log('Missing required fields:', { name, email, verificationMethod });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const UserModel = getUserModel();

    // Clean up any existing temporary users
    const cleanupResult = await UserModel.deleteMany({ 
      email, 
      isTemporary: true,
      isVerified: false
    });
    console.log('Cleaned up existing temporary users:', cleanupResult);

    // Check if user already exists and is verified
    const existingUser = await UserModel.findOne({ 
      email,
      $or: [
        { isTemporary: false },
        { isVerified: true }
      ]
    });

    if (existingUser) {
      console.log('User already exists:', existingUser);
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log('Creating new user with:', {
      name,
      email,
      verificationMethod,
      isVerified: false,
      isTemporary: true,
      verificationCode: code,
      verificationExpiry: expiry
    });

    // Create temporary user with verification data
    const userData = {
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      verificationCode: code,
      verificationExpiry: expiry,
      verificationMethod,
      isVerified: false,
      isTemporary: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Store the verification code in twoFactorAuth object too
      twoFactorAuth: {
        enabled: true,
        method: verificationMethod,
        verified: false,
        temporaryCode: code,
        codeGeneratedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }
    };
    
    console.log('Attempting to create user with data:', JSON.stringify(userData, null, 2));
    
    const user = await UserModel.create(userData).catch(error => {
      console.error('User creation failed:', error);
      throw error;
    });

    // Log the FULL user document
    console.log('FULL user document:', JSON.stringify(user.toObject(), null, 2));
    
    // Log verification details specifically
    console.log('Verification details:', {
      code: code,
      userVerificationCode: user.verificationCode,
      expiry: expiry,
      userVerificationExpiry: user.verificationExpiry
    });

    // Send verification email if using email method
    if (verificationMethod === 'email') {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: email,
          subject: 'Verify your account',
          text: `Your verification code is: ${code}`,
          html: `<p>Your verification code is: <strong>${code}</strong></p>`
        });
        console.log('Verification email sent successfully');
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Delete the temporary user since email failed
        await UserModel.deleteOne({ _id: user._id });
        return NextResponse.json(
          { error: 'Failed to send verification email' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        userId: user._id.toString(),
        mfaMethod: verificationMethod,
        isTemporary: true // Indicate this is a temporary user
      },
      mfaSetup: verificationMethod === 'app' ? {
        totpSecret: code,
        totpUrl: `otpauth://totp/JuntasSeguras:${email}?secret=${code}&issuer=JuntasSeguras`
      } : null
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}