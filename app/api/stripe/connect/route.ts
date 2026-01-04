/**
 * Stripe Connect Account API
 *
 * Manages Stripe Connect accounts for members to receive payouts
 * Members must onboard to Stripe Connect before receiving pool payouts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createConnectAccount,
  createAccountLink,
  getConnectAccount,
  createLoginLink,
  canReceivePayouts,
} from '@/lib/stripe';
import { connectToDatabase } from '@/lib/db/connection';
import User from '@/lib/db/models/user';
import { logActivity } from '@/lib/db/models/activityLog';
import { Types } from 'mongoose';

/**
 * GET - Get Connect account status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // No Connect account yet
    if (!user.stripeConnectAccountId) {
      return NextResponse.json({
        hasAccount: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      });
    }

    // Get account status from Stripe
    const account = await getConnectAccount(user.stripeConnectAccountId);

    // Update local cache
    user.stripePayoutsEnabled = account.payouts_enabled || false;
    user.stripeDetailsSubmitted = account.details_submitted || false;
    await user.save();

    return NextResponse.json({
      hasAccount: true,
      payoutsEnabled: account.payouts_enabled || false,
      detailsSubmitted: account.details_submitted || false,
      accountId: account.id,
    });
  } catch (error) {
    console.error('Error getting Connect account:', error);
    return NextResponse.json(
      { error: 'Failed to get account status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create Connect account or get onboarding link
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    await connectToDatabase();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    switch (action) {
      case 'create': {
        // Create new Connect account
        if (user.stripeConnectAccountId) {
          return NextResponse.json(
            { error: 'Connect account already exists' },
            { status: 400 }
          );
        }

        const account = await createConnectAccount(user.email, {
          userId: user._id.toString(),
          userName: user.name || '',
        });

        user.stripeConnectAccountId = account.id;
        user.stripePayoutsEnabled = false;
        user.stripeDetailsSubmitted = false;
        await user.save();

        // Create onboarding link
        const accountLink = await createAccountLink(
          account.id,
          `${appUrl}/settings/payouts?refresh=true`,
          `${appUrl}/settings/payouts?success=true`
        );

        await logActivity({
          userId: new Types.ObjectId(session.user.id),
          action: 'stripe_connect_created',
          category: 'account',
          details: { accountId: account.id },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        });

        return NextResponse.json({
          accountId: account.id,
          onboardingUrl: accountLink.url,
        });
      }

      case 'onboarding': {
        // Get new onboarding link for existing account
        if (!user.stripeConnectAccountId) {
          return NextResponse.json(
            { error: 'No Connect account found. Create one first.' },
            { status: 400 }
          );
        }

        const accountLink = await createAccountLink(
          user.stripeConnectAccountId,
          `${appUrl}/settings/payouts?refresh=true`,
          `${appUrl}/settings/payouts?success=true`
        );

        return NextResponse.json({
          onboardingUrl: accountLink.url,
        });
      }

      case 'dashboard': {
        // Get login link to Stripe Express dashboard
        if (!user.stripeConnectAccountId) {
          return NextResponse.json(
            { error: 'No Connect account found' },
            { status: 400 }
          );
        }

        // Check if account is ready for dashboard
        const isReady = await canReceivePayouts(user.stripeConnectAccountId);
        if (!isReady) {
          return NextResponse.json(
            { error: 'Complete onboarding first' },
            { status: 400 }
          );
        }

        const loginLink = await createLoginLink(user.stripeConnectAccountId);

        return NextResponse.json({
          dashboardUrl: loginLink.url,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: create, onboarding, or dashboard' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error with Connect account:', error);
    return NextResponse.json(
      { error: 'Failed to process Connect account request' },
      { status: 500 }
    );
  }
}
