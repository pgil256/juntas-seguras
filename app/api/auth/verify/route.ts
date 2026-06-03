import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/db/connect';
import { getUserModel } from '../../../../lib/db/models/user';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  try {
    const { userId, code, email } = await req.json(); 

    // Validate required fields
    if (!userId || !code) {
      return NextResponse.json(
        { error: 'User ID and code are required' }, 
        { status: 400 }
      );
    }

    await connectToDatabase();
    const UserModel = getUserModel();
    
    // Find the user by ID
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    const query: Record<string, unknown> = { _id: objectId };
    if (email && typeof email === 'string') {
      query.email = email.trim().toLowerCase();
    }

    const user = await UserModel.findOne(query);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 400 }
      );
    }

    const codeGeneratedAt = user.twoFactorAuth?.codeGeneratedAt;
    const expiresAt = user.verificationExpiry || codeGeneratedAt;
    if (expiresAt) {
      let expiryDate: Date | null = null;
      if (user.verificationExpiry) {
        expiryDate = new Date(user.verificationExpiry);
      } else if (codeGeneratedAt) {
        expiryDate = new Date(new Date(codeGeneratedAt).getTime() + 10 * 60 * 1000);
      }

      if (expiryDate && expiryDate < new Date()) {
        return NextResponse.json(
          { error: 'Verification code has expired' },
          { status: 400 }
        );
      }
    }
    
    // Check for verification code in either place
    const storedCode = user.verificationCode || user.twoFactorAuth?.temporaryCode;
    const codeMatches = storedCode === code;
    
    // If code doesn't match, return error
    if (!codeMatches) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }
    
    // Mark the user as verified and not temporary
    user.isVerified = true;
    user.isTemporary = false;
    user.emailVerified = true;
    user.mfaSetupComplete = true;
    user.pendingMfaVerification = false;
    user.twoFactorAuth.verified = true;
    user.twoFactorAuth.enabled = true;
    user.verificationCode = undefined;
    user.verificationExpiry = undefined;
    user.twoFactorAuth.temporaryCode = undefined;
    user.twoFactorAuth.codeGeneratedAt = undefined;
    await user.save();
    
    return NextResponse.json({ message: 'Account verified successfully' });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    );
  }
} 
