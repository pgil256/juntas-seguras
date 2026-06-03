import { NextRequest, NextResponse } from 'next/server';
import { ActivityType } from '../../../../../types/security';
import { getCurrentUser } from '../../../../../lib/auth';
import { logServerActivity } from '../../../../../lib/utils';
import { sendEmailVerificationCode } from '../../../../../lib/services/mfa';
import { RateLimiters, getClientIp } from '../../../../../lib/utils/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }

    const user = userResult.user;
    const method = user.twoFactorAuth?.method === 'totp' ? 'app' : user.twoFactorAuth?.method || 'email';

    if (method === 'app') {
      return NextResponse.json(
        { error: 'Authenticator app codes cannot be resent' },
        { status: 400 }
      );
    }

    const rateLimitResult = RateLimiters.mfaResend(`${getClientIp(request)}:${user._id.toString()}`);
    if (!rateLimitResult.allowed) {
      const retryAfterSeconds = Math.ceil(rateLimitResult.retryAfterMs / 1000);
      return NextResponse.json(
        {
          error: `Too many resend requests. Please try again in ${retryAfterSeconds} seconds.`,
          waitTime: retryAfterSeconds,
        },
        {
          status: 429,
          headers: { 'Retry-After': retryAfterSeconds.toString() },
        }
      );
    }

    const sent = await sendEmailVerificationCode(user._id.toString());
    if (!sent) {
      return NextResponse.json(
        { error: 'Failed to send verification code' },
        { status: 500 }
      );
    }

    logServerActivity(user._id.toString(), ActivityType.TWO_FACTOR_SETUP, {
      method: 'email',
      action: 'code_resent',
    });

    return NextResponse.json({
      success: true,
      message: 'Verification code sent via email',
      sentTo: user.email,
    });
  } catch (error) {
    console.error('Failed to resend 2FA code:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}
