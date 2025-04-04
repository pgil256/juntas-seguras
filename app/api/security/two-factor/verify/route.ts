import { NextRequest, NextResponse } from 'next/server';

// In a real application, this would use a proper auth system and database
const mockUsers = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, code, recoveryCode } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!code && !recoveryCode) {
      return NextResponse.json(
        { error: 'Authentication code or recovery code is required' },
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

    let success = false;
    let usedRecoveryCode = false;

    if (code) {
      // Simulate TOTP code validation
      // In a real app, this would use a proper TOTP verification library
      success = simulateCodeVerification(code, user.twoFactorSetup.secret);
    } else if (recoveryCode) {
      // Verify recovery code
      if (user.twoFactorSetup.backupCodes && user.twoFactorSetup.backupCodes.includes(recoveryCode)) {
        success = true;
        usedRecoveryCode = true;
        
        // Remove the used recovery code
        user.twoFactorSetup.backupCodes = user.twoFactorSetup.backupCodes.filter(
          (code: string) => code !== recoveryCode
        );
        mockUsers.set(userId, user);
      }
    }

    if (success) {
      // Log the successful verification
      await logActivity(userId, 'two_factor_verified', { 
        usedRecoveryCode,
        method: user.twoFactorSetup.method
      });

      return NextResponse.json({
        success: true,
        message: 'Two-factor authentication verified successfully'
      });
    } else {
      // Log the failed verification
      await logActivity(userId, 'two_factor_failed', { 
        usedRecoveryCode,
        method: user.twoFactorSetup.method
      });

      return NextResponse.json(
        { error: 'Invalid authentication code' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify two-factor authentication' },
      { status: 500 }
    );
  }
}

// Helper functions
function simulateCodeVerification(inputCode: string, secret: string) {
  // In a real app, this would use a proper TOTP validation library 
  // like speakeasy or otplib to verify the code against the secret
  
  // For mock purposes, we'll accept a specific code for testing
  return inputCode === '123456';
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