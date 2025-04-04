import { NextRequest, NextResponse } from 'next/server';
import { TwoFactorMethod } from '@/types/security';

// In a real application, this would use a proper auth system and database
const mockUsers = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, method } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!method || !['app', 'sms', 'email'].includes(method)) {
      return NextResponse.json(
        { error: 'Valid authentication method is required' },
        { status: 400 }
      );
    }

    // In a real app, this would fetch from a database
    const user = mockUsers.get(userId);
    
    if (!user || !user.twoFactorSetup || !user.twoFactorSetup.enabled) {
      return NextResponse.json(
        { error: 'Two-factor authentication is not enabled for this user' },
        { status: 400 }
      );
    }

    // In a real app, this would generate a new code and send it via the appropriate channel
    // Here we'll simulate that the code was sent successfully
    
    // Log the activity
    await logActivity(userId, 'two_factor_code_resent', { 
      method: method as TwoFactorMethod
    });

    return NextResponse.json({
      success: true,
      message: `Verification code sent via ${method}`
    });
    
  } catch (error) {
    console.error('Failed to resend 2FA code:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}

async function logActivity(userId: string, type: string, metadata: any) {
  // In a real app, this would log to a dedicated activity log database
  try {
    await fetch('/api/security/activity-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        type,
        metadata
      })
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}