import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/options';
import connectToDatabase from '@/lib/db/connect';
import { getUserModel } from '@/lib/db/models/user';
import { sendEmailVerificationCode } from '@/lib/services/mfa';

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Connect to the database
    await connectToDatabase();
    
    // Send verification code
    console.log(`Sending verification code to user ${session.user.id}`);
    const sent = await sendEmailVerificationCode(session.user.id);
    
    if (!sent) {
      return NextResponse.json(
        { error: 'Failed to send verification code' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully'
    });
  } catch (error) {
    console.error('Error sending verification code:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
} 