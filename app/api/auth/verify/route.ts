import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/db/connect';
import { getUserModel } from '../../../../lib/db/models/user';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  try {
    const { userId, code, email } = await req.json(); 
    
    console.log('Verification request:', { userId, code, email });
    
    // Validate required fields
    if (!userId || !code) {
      console.log('Missing required fields:', { userId, code });
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
      console.error('Invalid ObjectId format:', error);
    }
    
    const user = await UserModel.findOne({ _id: objectId });
    
    if (!user) {
      console.log('User not found with ID:', userId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 400 }
      );
    }
    
    console.log('User found:', {
      id: user.id,
      email: user.email,
      _id: user._id,
      temporaryCode: user.twoFactorAuth?.temporaryCode,
      verificationCode: user.verificationCode
    });
    
    // Check for verification code in either place
    const storedCode = user.verificationCode || user.twoFactorAuth?.temporaryCode;
    const codeMatches = storedCode === code;
    
    console.log('Code verification:', {
      providedCode: code,
      storedCode: storedCode,
      matches: codeMatches
    });
    
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
    user.twoFactorAuth.verified = true;
    await user.save();
    
    console.log('User verified successfully');
    
    return NextResponse.json({ message: 'Account verified successfully' });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    );
  }
} 