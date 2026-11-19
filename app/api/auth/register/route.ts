import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '../../../../lib/db/connect';
import { getUserModel } from '../../../../lib/db/models/user';
import nodemailer from 'nodemailer';
import { generateVerificationCode } from '../../../../lib/utils/verification';

// Email configuration
const transporter = process.env.SMTP_URL ? nodemailer.createTransport(process.env.SMTP_URL) : nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || '***REMOVED***',
    pass: process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD,
  }
});

// POST /api/auth/register - Register a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Expected a registration form' }, { status: 400 });
    }
    const { name, email, password, verificationMethod } = body;

    if (!name || !email || !password || !verificationMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' ||
        !['email', 'app'].includes(verificationMethod)) {
      return NextResponse.json({ error: 'Invalid registration fields' }, { status: 400 });
    }

    // Sanitize and validate inputs
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length > 100) {
      return NextResponse.json(
        { error: 'Name must be 100 characters or less' },
        { status: 400 }
      );
    }

    if (trimmedEmail.length > 255) {
      return NextResponse.json(
        { error: 'Email address is too long' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const UserModel = getUserModel();

    // Clean up any existing temporary users
    await UserModel.deleteMany({
      email: trimmedEmail,
      isTemporary: true,
      isVerified: false
    });

    // Check if user already exists and is verified
    const existingUser = await UserModel.findOne({
      email: trimmedEmail,
      $or: [
        { isTemporary: false },
        { isVerified: true }
      ]
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification code
    const code = generateVerificationCode();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create tempo***REMOVED***fication data
    const userData = {
      name: trimmedName,
      email: trimmedEmail,
      hashedPassword,
      verificationCode: code,
      verificationExpiry: expiry,
      verificationMethod: 'email',
      isVerified: false,
      isTemporary: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Store the verification code in twoFactorAuth object too
      twoFactorAuth: {
        enabled: true,
        method: 'email',
        verified: false,
        temporaryCode: code,
        codeGeneratedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }
    };
    
    const user = await UserModel.create(userData);

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: trimmedEmail,
        subject: 'Verify your account',
        text: `Your verification code is: ${code}`,
        html: `<p>Your verification code is: <strong>${code}</strong></p>`
      });
    } catch {
      await UserModel.deleteOne({ _id: user._id, isTemporary: true });
      return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        userId: user._id.toString(),
        mfaMethod: 'email',
        isTemporary: true // Indicate this is a temporary user
      },
      mfaSetup: null
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
