import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/db/connect';
import { getUserModel } from '../../../../lib/db/models/user';
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

    // Update user's password and clear reset token using findOneAndUpdate
    // This avoids the validation issues with the save() method
    console.log('Updating password for user:', user._id);
    
    try {
      const updateResult = await UserModel.findByIdAndUpdate(
        user._id,
        {
          $set: { hashedPassword },
          $unset: { resetToken: "", resetTokenExpiry: "" }
        },
        { new: true }
      );

      if (!updateResult) {
        console.error('Failed to update user password');
        return NextResponse.json(
          { error: 'Failed to reset password' },
          { status: 500 }
        );
      }

      console.log('Password updated successfully for user:', user._id);
      return NextResponse.json({ success: true });

    } catch (updateError) {
      console.error('Error updating user after password reset:', updateError);
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