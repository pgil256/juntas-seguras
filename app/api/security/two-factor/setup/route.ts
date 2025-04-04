import { NextRequest, NextResponse } from 'next/server';
import { TwoFactorMethod } from '@/types/security';

// In a real application, this would use a proper auth system
// and database to store user-specific 2FA settings
const mockUsers = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, method } = body;

    if (!userId || !method) {
      return NextResponse.json(
        { error: 'User ID and authentication method are required' },
        { status: 400 }
      );
    }

    // Validate method type
    if (!['app', 'sms', 'email'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid authentication method. Must be app, sms, or email' },
        { status: 400 }
      );
    }

    // Generate a mock secret (in a real app, this would be a proper TOTP secret)
    const secret = generateMockSecret();
    
    // Generate backup codes (in a real app, these would be secure random codes)
    const backupCodes = generateMockBackupCodes();

    // Store the 2FA setup
    const twoFactorSetup = {
      enabled: true,
      method: method as TwoFactorMethod,
      secret,
      backupCodes,
      lastUpdated: new Date().toISOString(),
      email: body.email,
      phone: body.phone,
    };

    // In a real app, this would save to a database
    mockUsers.set(userId, { ...mockUsers.get(userId) || {}, twoFactorSetup });

    // Log the activity
    await logActivity(userId, 'two_factor_setup', { method });

    // For SMS and email methods, a verification code would be sent
    // For app method, return the secret for QR code generation
    if (method === 'app') {
      return NextResponse.json({
        success: true,
        secret,
        backupCodes,
        qrCodeUrl: `otpauth://totp/JuntasApp:${userId}?secret=${secret}&issuer=JuntasSeguras`,
      });
    } else {
      return NextResponse.json({
        success: true,
        message: `Verification code sent to your ${method === 'sms' ? 'phone' : 'email'}`,
        backupCodes,
      });
    }
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'Failed to set up two-factor authentication' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // In a real app, this would delete from a database
    const user = mockUsers.get(userId);
    
    if (!user || !user.twoFactorSetup || !user.twoFactorSetup.enabled) {
      return NextResponse.json(
        { error: 'Two-factor authentication is not enabled for this user' },
        { status: 404 }
      );
    }

    // Disable 2FA but keep the settings
    user.twoFactorSetup.enabled = false;
    user.twoFactorSetup.lastUpdated = new Date().toISOString();
    mockUsers.set(userId, user);

    // Log the activity
    await logActivity(userId, 'two_factor_disable', {});

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication has been disabled'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: 'Failed to disable two-factor authentication' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // In a real app, this would fetch from a database
    const user = mockUsers.get(userId);
    
    if (!user || !user.twoFactorSetup) {
      return NextResponse.json({
        enabled: false,
        method: null
      });
    }

    // Don't return the actual secret or backup codes for security
    const { secret, backupCodes, ...safeData } = user.twoFactorSetup;
    
    return NextResponse.json(safeData);
  } catch (error) {
    console.error('2FA status error:', error);
    return NextResponse.json(
      { error: 'Failed to get two-factor authentication status' },
      { status: 500 }
    );
  }
}

// Helper functions
function generateMockSecret() {
  // In a real app, this would generate a proper TOTP secret
  return Array.from({ length: 16 }, () => 
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]
  ).join('');
}

function generateMockBackupCodes() {
  // In a real app, these would be secure random codes
  return Array.from({ length: 8 }, () => 
    Array.from({ length: 8 }, () => 
      '0123456789'[Math.floor(Math.random() * 10)]
    ).join('')
  );
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