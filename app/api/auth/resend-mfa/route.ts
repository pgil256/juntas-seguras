import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import connectToDatabase from '../../../../lib/db/connect';
import { getUserModel } from '../../../../lib/db/models/user';
import { sendEmailVerificationCode } from '../../../../lib/services/mfa';
import { RateLimiters, getClientIp } from '../../../../lib/utils/rate-limiter';

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Apply IP-based rate limiting to prevent resend abuse
    const clientIp = getClientIp(req);
    const rateLimitResult = RateLimiters.mfaResend(clientIp);

    if (!rateLimitResult.allowed) {
      const retryAfterSeconds = Math.ceil(rateLimitResult.retryAfterMs / 1000);
      return NextResponse.json(
        {
          error: `Too many resend requests. Please try again in ${retryAfterSeconds} seconds.`,
          waitTime: retryAfterSeconds
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfterSeconds.toString()
          }
        }
      );
    }

    // Get the token to check authentication
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

    // Check if MFA is actually required
    if (!token.requiresMfa) {
      return NextResponse.json(
        { error: 'MFA is not required for this session' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();
    const UserModel = getUserModel();
    
    // Find user by MongoDB _id
    const user = await UserModel.findById(token.id);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if MFA is enabled
    if (!user.twoFactorAuth?.enabled) {
      return NextResponse.json(
        { error: 'MFA is not enabled for this account' },
        { status: 400 }
      );
    }

    // Check for rate limiting - prevent resend spam
    const lastCodeSent = user.twoFactorAuth?.codeGeneratedAt;
    if (lastCodeSent) {
      const timeSinceLastCode = Date.now() - new Date(lastCodeSent).getTime();
      const minResendInterval = 60 * 1000; // 1 minute
      
      if (timeSinceLastCode < minResendInterval) {
        const waitTime = Math.ceil((minResendInterval - timeSinceLastCode) / 1000);
        return NextResponse.json(
          { 
            error: `Please wait ${waitTime} seconds before requesting a new code`,
            waitTime 
          },
          { status: 429 }
        );
      }
    }

    // Check daily resend limit
    const today = new Date().toDateString();
    const resendCount = parseInt(user.metadata?.get(`mfaResendCount_${today}`) || '0');
    
    if (resendCount >= 5) {
      return NextResponse.json(
        { 
          error: 'Daily resend limit reached. Please try again tomorrow.',
          limitReached: true 
        },
        { status: 429 }
      );
    }

    // Resend the code based on MFA method (email only - TOTP cannot be resent)
    const mfaMethod = token.mfaMethod || user.twoFactorAuth.method || 'email';
    let codeSent = false;

    if (mfaMethod === 'email') {
      codeSent = await sendEmailVerificationCode(token.id as string);
    } else if (mfaMethod === 'app') {
      return NextResponse.json(
        { error: 'TOTP codes cannot be resent. Please use your authenticator app.' },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: 'Invalid MFA method. Only email verification codes can be resent.' },
        { status: 400 }
      );
    }

    if (!codeSent) {
      return NextResponse.json(
        { error: 'Failed to send verification code. Please try again.' },
        { status: 500 }
      );
    }

    // Update resend count
    await UserModel.findByIdAndUpdate(
      user._id,
      { 
        $set: { 
          [`metadata.mfaResendCount_${today}`]: (resendCount + 1).toString(),
          'metadata.lastResendTime': new Date().toISOString()
        } 
      }
    );

    // Log the resend action (without sensitive data)
    console.log(`[Auth] MFA code resent, method: ${mfaMethod}, daily count: ${resendCount + 1}`);

    return NextResponse.json({
      success: true,
      message: 'Verification code has been resent',
      method: mfaMethod,
      resendCount: resendCount + 1,
      remainingResends: Math.max(0, 5 - (resendCount + 1))
    });
    
  } catch (error) {
    console.error('Error resending MFA code:', error);
    return NextResponse.json(
      { error: 'Failed to resend verification code' },
      { status: 500 }
    );
  }
}

// GET endpoint to check resend eligibility
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

    // Connect to database
    await connectToDatabase();
    const UserModel = getUserModel();
    
    // Find user
    const user = await UserModel.findById(token.id);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate time since last code
    const lastCodeSent = user.twoFactorAuth?.codeGeneratedAt;
    let canResend = true;
    let waitTime = 0;
    
    if (lastCodeSent) {
      const timeSinceLastCode = Date.now() - new Date(lastCodeSent).getTime();
      const minResendInterval = 60 * 1000; // 1 minute
      
      if (timeSinceLastCode < minResendInterval) {
        canResend = false;
        waitTime = Math.ceil((minResendInterval - timeSinceLastCode) / 1000);
      }
    }

    // Check daily limit
    const today = new Date().toDateString();
    const resendCount = parseInt(user.metadata?.get(`mfaResendCount_${today}`) || '0');
    const remainingResends = Math.max(0, 5 - resendCount);
    
    return NextResponse.json({
      canResend: canResend && remainingResends > 0,
      waitTime,
      resendCount,
      remainingResends,
      method: token.mfaMethod || user.twoFactorAuth?.method || 'email'
    });
    
  } catch (error) {
    console.error('Error checking resend eligibility:', error);
    return NextResponse.json(
      { error: 'Failed to check resend eligibility' },
      { status: 500 }
    );
  }
}