/**
 * Stripe Confirm Setup API Route
 *
 * POST - Confirm a completed Setup Intent and save the payment method
 *
 * Called after the user completes Stripe Elements and the payment method is attached.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import connectToDatabase from '@/lib/db/connect';
import User from '@/lib/db/models/user';
import { getPoolModel } from '@/lib/db/models/pool';
import { getPaymentSetupModel, PaymentSetupStatus } from '@/lib/db/models/paymentSetup';
import { getSetupIntent, getPaymentMethodFromSetupIntent } from '@/lib/stripe/setup-intents';
import { getAuditLogModel } from '@/lib/db/models/auditLog';
import { AuditLogType } from '@/types/audit';

export const runtime = 'nodejs';

/**
 * POST /api/stripe/confirm-setup
 *
 * Confirm a completed Setup Intent and create/update PaymentSetup record.
 *
 * Body: {
 *   setupIntentId: string,
 *   poolId: string,
 *   consentText: string
 * }
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
    const { setupIntentId, poolId, consentText } = body;

    if (!setupIntentId || !poolId) {
      return NextResponse.json(
        { error: 'Setup Intent ID and Pool ID are required' },
        { status: 400 }
      );
    }

    // Get the setup intent from Stripe
    const setupIntent = await getSetupIntent(setupIntentId);

    // Verify status
    if (setupIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: `Setup Intent not completed. Status: ${setupIntent.status}` },
        { status: 400 }
      );
    }

    // Verify this setup intent belongs to the user
    if (setupIntent.metadata?.userId !== user._id.toString()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Verify pool ID matches
    if (setupIntent.metadata?.poolId !== poolId) {
      return NextResponse.json(
        { error: 'Pool ID mismatch' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const Pool = getPoolModel();
    const PaymentSetup = getPaymentSetupModel();

    const pool = await Pool.findOne({ id: poolId });
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    // Get payment method details
    const paymentMethodDetails = await getPaymentMethodFromSetupIntent(setupIntentId);

    if (!paymentMethodDetails) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 400 }
      );
    }

    // Create or update PaymentSetup record
    const paymentSetupData = {
      userId: user._id,
      poolId,
      stripeCustomerId: setupIntent.customer as string,
      stripePaymentMethodId: paymentMethodDetails.paymentMethodId,
      setupIntentId,
      paymentMethodType: paymentMethodDetails.type === 'card' ? 'card' : 'us_bank_account',
      paymentMethodLast4: paymentMethodDetails.card?.last4 || paymentMethodDetails.bankAccount?.last4,
      paymentMethodBrand: paymentMethodDetails.card?.brand,
      paymentMethodExpMonth: paymentMethodDetails.card?.expMonth,
      paymentMethodExpYear: paymentMethodDetails.card?.expYear,
      status: PaymentSetupStatus.ACTIVE,
      contributionAmount: pool.contributionAmount,
      consentGivenAt: new Date(),
      consentText: consentText || `I authorize automatic weekly payments of $${pool.contributionAmount} for ${pool.name}`,
    };

    // Upsert - update if exists, create if not
    const paymentSetup = await PaymentSetup.findOneAndUpdate(
      { userId: user._id, poolId },
      { $set: paymentSetupData },
      { upsert: true, new: true }
    );

    // Update user's Stripe customer ID if not set
    if (!user.stripeCustomerId) {
      await User.updateOne(
        { _id: user._id },
        { $set: { stripeCustomerId: setupIntent.customer as string } }
      );
    }

    // Log audit
    const AuditLog = getAuditLogModel();
    await AuditLog.create({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: user._id.toString(),
      type: AuditLogType.PAYMENT,
      action: 'payment_method_saved',
      metadata: {
        poolId,
        setupIntentId,
        paymentMethodId: paymentMethodDetails.paymentMethodId,
        paymentMethodType: paymentMethodDetails.type,
        last4: paymentMethodDetails.card?.last4 || paymentMethodDetails.bankAccount?.last4,
      },
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment method saved successfully',
      paymentSetup: {
        id: paymentSetup._id,
        paymentMethodType: paymentSetup.paymentMethodType,
        last4: paymentSetup.paymentMethodLast4,
        brand: paymentSetup.paymentMethodBrand,
        status: paymentSetup.status,
      },
    });
  } catch (error) {
    console.error('Error confirming setup:', error);
    return NextResponse.json(
      { error: 'Failed to confirm setup' },
      { status: 500 }
    );
  }
}
