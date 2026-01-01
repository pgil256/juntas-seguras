import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/db/connect';
import { getUserModel } from '../../../../lib/db/models/user';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const UserModel = getUserModel();

    // Log all users to check what's in the database
    const allUsers = await UserModel.find({});
    console.log(`Found ${allUsers.length} total users in database`);
    
    // Print the schema of the first user if available
    if (allUsers.length > 0) {
      const firstUser = allUsers[0];
      console.log('First user schema:', Object.keys(firstUser.toObject()));
      console.log('First user resetToken field:', firstUser.resetToken);
    }
    
    // Try to find by exact token
    const userByToken = await UserModel.findOne({ resetToken: token });
    
    // Try to find by regex
    const tokenRegex = new RegExp(`^${token}$`, 'i');
    const userByRegex = await UserModel.findOne({ resetToken: tokenRegex });
    
    return NextResponse.json({
      token,
      totalUsers: allUsers.length,
      userFoundByExactToken: !!userByToken,
      userFoundByRegex: !!userByRegex,
      tokenValidity: userByToken ? 'valid' : 'invalid',
      tokenExpiry: userByToken?.resetTokenExpiry || null,
      isExpired: userByToken?.resetTokenExpiry ? 
        new Date(userByToken.resetTokenExpiry) < new Date() : 
        null,
      userDetails: userByToken ? {
        id: userByToken._id,
        email: userByToken.email,
        hasResetToken: !!userByToken.resetToken,
      } : null
    });
  } catch (error) {
    console.error('Error checking token:', error);
    return NextResponse.json(
      { error: 'An error occurred while checking the token' },
      { status: 500 }
    );
  }
} 