import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import connectToDatabase from '../../../../lib/db/connect';
import { getUserModel } from '../../../../lib/db/models/user';
import { verifyEmailCode, verifyTotpCode } from '../../../../lib/services/mfa';
import { RateLimiters, getClientIp, resetRateLimit } from '../../../../lib/utils/rate-limiter';

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Apply IP-based rate limiting to prevent brute force attacks
    const clientIp = getClientIp(req);
    const rateLimitResult = RateLimiters.mfaVerification(clientIp);

    if (!rateLimitResult.allowed) {
      const retryAfterSeconds = Math.ceil(rateLimitResult.retryAfterMs / 1000);
      return NextResponse.json(
        {
          error: `Too many verification attempts. Please try again in ${retryAfterSeconds} seconds.`,
          retryAfter: retryAfterSeconds,
          tooManyAttempts: true
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfterSeconds.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString()
          }
        }
      );
    }

    // Get the token to check MFA status
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET
    });

    if (!token?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    // Validate code format (should be 6 digits for email, variable for TOTP)
    if (token.mfaMethod === 'email' && !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid code format. Please enter a 6-digit code.' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();
    const UserModel = getUserModel();
    
    // Find user by MongoDB _id (consistent with our fixes)
    const user = await UserModel.findById(token.id);
    
    if (!user) {
      console.error(`User not found for ID: ${token.id}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if MFA is actually enabled for this user
    if (!user.twoFactorAuth?.enabled) {
      console.log('[Auth] MFA not enabled for user, clearing session MFA requirement');
      
      // Clear any pending MFA flags
      await UserModel.findByIdAndUpdate(
        user._id,
        { 
          $set: { 
            pendingMfaVerification: false,
            mfaSetupComplete: true 
          } 
        }
      );
      
      return NextResponse.json({
        success: true,
        message: 'MFA not required - verification successful',
        requiresSetup: false
      });
    }

    // Verify MFA code based on the method (email or TOTP app only)
    let mfaValid = false;
    const mfaMethod = token.mfaMethod || user.twoFactorAuth.method || 'email';

    // SECURITY: Only log non-sensitive verification metadata
    console.log(`[Auth] Verifying MFA using method: ${mfaMethod}`, {
      codeLength: code?.length,
      hasStoredCode: !!user.twoFactorAuth?.temporaryCode
    });

    try {
      if (mfaMethod === 'email') {
        mfaValid = await verifyEmailCode(token.id as string, code.trim());
      } else if (mfaMethod === 'app') {
        mfaValid = await verifyTotpCode(token.id as string, code);
      } else {
        console.error(`Unknown MFA method: ${mfaMethod}`);
        return NextResponse.json(
          { error: 'Invalid MFA method configured. Only email and authenticator app are supported.' },
          { status: 400 }
        );
      }
    } catch (verifyError) {
      console.error('Error during MFA verification:', verifyError);
      return NextResponse.json(
        { error: 'Verification failed. Please try again.' },
        { status: 400 }
      );
    }

    if (!mfaValid) {
      // Log failed attempt (without sensitive data)
      console.log('[Auth] Invalid MFA code attempt');
      
      // Track failed attempts (optional - for rate limiting)
      const failedAttempts = (user.metadata?.get('mfaFailedAttempts') || '0');
      const attempts = parseInt(failedAttempts) + 1;
      
      await UserModel.findByIdAndUpdate(
        user._id,
        { 
          $set: { 
            'metadata.mfaFailedAttempts': attempts.toString(),
            'metadata.lastFailedAttempt': new Date().toISOString()
          } 
        }
      );
      
      // Check if too many failed attempts
      if (attempts >= 5) {
        return NextResponse.json(
          { 
            error: 'Too many failed attempts. Please wait and try again later.',
            tooManyAttempts: true 
          },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Invalid verification code',
          attemptsRemaining: 5 - attempts 
        },
        { status: 400 }
      );
    }

    // MFA verification successful
    console.log('[Auth] MFA verification successful');

    // Reset IP-based rate limit on successful verification
    resetRateLimit(clientIp, 'mfa');

    // Clear MFA pending flags and reset failed attempts
    await UserModel.findByIdAndUpdate(
      user._id,
      { 
        $set: { 
          pendingMfaVerification: false,
          mfaSetupComplete: true,
          lastLogin: new Date(),
          'metadata.mfaFailedAttempts': '0'
        },
        $unset: {
          'metadata.lastFailedAttempt': ''
        }
      }
    );
    
    // Create response with session update flag
    const response = NextResponse.json({
      success: true,
      message: 'MFA verification successful',
      sessionUpdated: true
    });
    
    // Set a cookie to signal the client to refresh the session
    response.cookies.set('mfa-verified', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 // Short-lived cookie just for session refresh
    });
    
    return response;
    
  } catch (error) {
    console.error('Error in MFA verification:', error);
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    );
  }
}

// GET endpoint to check MFA status
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check if MFA is required
    const requiresMfa = token.requiresMfa === true;
    const mfaMethod = token.mfaMethod || 'email';
    
    return NextResponse.json({
      requiresMfa,
      mfaMethod,
      userId: token.id
    });
    
  } catch (error) {
    console.error('Error checking MFA status:', error);
    return NextResponse.json(
      { error: 'Failed to check MFA status' },
      { status: 500 }
    );
  }
}