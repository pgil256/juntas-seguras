import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/connect';
import getUserModel from '@/lib/db/models/user';
import * as bcrypt from 'bcryptjs';

// Define the user document type
interface UserDocument {
  _id: any;
  email: string;
  hashedPassword?: string;
  resetToken?: string | null;
  resetTokenExpiry?: Date | null;
}

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();
    
    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const UserModel = getUserModel();

    // Find user with valid reset token
    console.log('Searching for user with token:', token);
    
    // First, let's log all users to see what we're working with
    const allUsers = await UserModel.find({});
    console.log(`Found ${allUsers.length} total users in database`);
    
    if (allUsers.length > 0) {
      console.log('First user example:', {
        id: allUsers[0].id,
        _id: allUsers[0]._id,
        email: allUsers[0].email,
        hasResetToken: !!allUsers[0].resetToken,
        resetToken: allUsers[0].resetToken,
        resetTokenExpiry: allUsers[0].resetTokenExpiry
      });
    }
    
    // Try to find user with this token
    let user = null;
    
    // First try to find by token without expiry check
    user = await UserModel.findOne({ resetToken: token });
    console.log('Found user by token only:', user ? 'yes' : 'no');
    
    // If not found, try with case-insensitive query
    if (!user) {
      // Create a case-insensitive regex
      const tokenRegex = new RegExp(`^${token}$`, 'i');
      user = await UserModel.findOne({ resetToken: tokenRegex });
      console.log('Found user with case-insensitive token:', user ? 'yes' : 'no');
    }
    
    if (!user) {
      console.log('No user found with this token');
      return NextResponse.json(
        { error: 'Invalid reset token' },
        { status: 400 }
      );
    }
    
    // Check if token is expired
    const now = new Date();
    if (user.resetTokenExpiry && new Date(user.resetTokenExpiry) < now) {
      console.log('Token is expired:', {
        expiry: user.resetTokenExpiry,
        now: now
      });
      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user's password and clear reset token using direct manipulation
    console.log('Updating password for user:', user._id);
    
    // Set only hashedPassword
    user.hashedPassword = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;

    try {
      // Save the updated user document
      await user.save({ validateBeforeSave: true });

      // Double check the saved state
      const savedUser = await UserModel.findById(user._id).lean() as UserDocument | null;
      if (!savedUser) {
        console.error('Failed to retrieve saved user after save');
        return NextResponse.json(
          { error: 'Failed to verify password update' },
          { status: 500 }
        );
      }

      console.log('User document after password reset:', {
        id: savedUser._id,
        email: savedUser.email,
        passwordFields: {
          // Check only hashedPassword
          hashedPassword: savedUser.hashedPassword === hashedPassword,
        }
      });
      
      // Verify only hashedPassword was saved
      if (!savedUser.hashedPassword) {
        console.error('Hashed password field not properly saved');
        return NextResponse.json(
          { error: 'Failed to properly save password' },
          { status: 500 }
        );
      }
      
      console.log('Password updated successfully for user:', user._id);

      return NextResponse.json({ success: true });

    } catch (saveError) {
      console.error('Error saving user after password reset:', saveError);
      return NextResponse.json(
        { error: 'Failed to save password reset' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in reset password:', error);
    return NextResponse.json(
      { error: 'An error occurred while resetting your password' },
      { status: 500 }
    );
  }
} 