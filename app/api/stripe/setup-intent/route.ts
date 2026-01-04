/**
 * Stripe Setup Intent API Route
 *
 * POST - Create a Setup Intent for saving a payment method
 * GET - Get Setup Intent status
 *
 * Used when members join a pool to save their payment method for automatic contributions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import connectToDatabase from '@/lib/db/connect';
import User from '@/lib/db/models/user';
import { getPoolModel } from '@/lib/db/models/pool';
import { getPaymentSetupModel, PaymentSetupStatus } from '@/lib/db/models/paymentSetup';
import {
  createRecurringSetupIntent,
  getSetupIntent,
  getPaymentMethodFromSetupIntent,
  getOrCreateCustomer,
} from '@/lib/stripe/setup-intents';
import { getAuditLogModel } from '@/lib/db/models/auditLog';
import { AuditLogType } from '@/types/audit';

export const runtime = 'nodejs';

/**
 * POST /api/stripe/setup-intent
 *
 * Create a Setup Intent for saving a payment method for recurring charges.
 *
 * Body: { poolId: string, returnUrl?: string }
 */
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

    const body = await request.json();
    const { poolId, returnUrl } = body;

    if (!poolId) {
      return NextResponse.json(
        { error: 'Pool ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const Pool = getPoolModel();
    const pool = await Pool.findOne({ id: poolId });

    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    // Verify user is a member of the pool
    const member = pool.members.find(
      (m: { userId?: { toString(): string }; email: string }) =>
        m.userId?.toString() === user._id.toString() || m.email === user.email
    );

    if (!member) {
      return NextResponse.json(
        { error: 'You are not a member of this pool' },
        { status: 403 }
      );
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(
      user.email,
      user.name,
      user.stripeCustomerId,
      { userId: user._id.toString() }
    );

    // Update user's Stripe customer ID if not set
    if (!user.stripeCustomerId) {
      await User.updateOne(
        { _id: user._id },
        { $set: { stripeCustomerId: customer.id } }
      );
    }

    // Create Setup Intent
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const setupResult = await createRecurringSetupIntent({
      customerId: customer.id,
      userId: user._id.toString(),
      poolId,
      contributionAmount: pool.contributionAmount,
      returnUrl: returnUrl || `${baseUrl}/pools/${poolId}?setup_complete=true`,
    });

    // Log audit
    const AuditLog = getAuditLogModel();
    await AuditLog.create({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: user._id.toString(),
      type: AuditLogType.PAYMENT,
      action: 'setup_intent_created',
      metadata: {
        poolId,
        setupIntentId: setupResult.setupIntentId,
      },
      success: true,
    });

    return NextResponse.json({
      success: true,
      setupIntentId: setupResult.setupIntentId,
      clientSecret: setupResult.clientSecret,
      stripeCustomerId: customer.id,
      contributionAmount: pool.contributionAmount,
      poolName: pool.name,
    });
  } catch (error) {
    console.error('Error creating setup intent:', error);
    return NextResponse.json(
      { error: 'Failed to create setup intent' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stripe/setup-intent?setupIntentId=xxx
 *
 * Get Setup Intent status and details
 */
export async function GET(request: NextRequest) {
  try {
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    const searchParams = request.nextUrl.searchParams;
    const setupIntentId = searchParams.get('setupIntentId');

    if (!setupIntentId) {
      return NextResponse.json(
        { error: 'Setup Intent ID is required' },
        { status: 400 }
      );
    }

    const setupIntent = await getSetupIntent(setupIntentId);

    // Verify this setup intent belongs to the user
    if (setupIntent.metadata?.userId !== user._id.toString()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const paymentMethod = await getPaymentMethodFromSetupIntent(setupIntentId);

    return NextResponse.json({
      success: true,
      status: setupIntent.status,
      paymentMethod,
    });
  } catch (error) {
    console.error('Error getting setup intent:', error);
    return NextResponse.json(
      { error: 'Failed to get setup intent' },
      { status: 500 }
    );
  }
}
