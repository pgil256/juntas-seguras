/**
 * User Payment Methods API Route
 *
 * GET - Get user's saved payment methods (payout methods)
 * DELETE - Remove a payment method
 *
 * Note: This app uses manual payments, not Stripe integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import connectToDatabase from '@/lib/db/connect';
import User from '@/lib/db/models/user';
import { getPaymentSetupModel, PaymentSetupStatus } from '@/lib/db/models/paymentSetup';
import { getPoolModel } from '@/lib/db/models/pool';
import { getAuditLogModel } from '@/lib/db/models/auditLog';
import { AuditLogType } from '@/types/audit';

export const runtime = 'nodejs';

/**
 * GET /api/users/[userId]/payment-methods
 *
 * Get saved payment methods and their associated pools.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    // Users can only view their own payment methods
    if (user._id.toString() !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const PaymentSetup = getPaymentSetupModel();
    const Pool = getPoolModel();

    // Get all payment setups for this user
    const paymentSetups = await PaymentSetup.find({ userId: user._id });

    // Get pool names for each setup
    const poolIds = [...new Set(paymentSetups.map(ps => ps.poolId))];
    const pools = await Pool.find({ id: { $in: poolIds } });
    const poolMap = new Map(pools.map(p => [p.id, p.name]));

    // Get user's payout method (Venmo, PayPal, Zelle, Cash App)
    const payoutMethod = user.payoutMethod ? {
      type: user.payoutMethod.type,
      handle: user.payoutMethod.handle,
      displayName: user.payoutMethod.displayName,
    } : null;

    // Format response
    const formattedSetups = paymentSetups.map(ps => ({
      id: ps._id,
      poolId: ps.poolId,
      poolName: poolMap.get(ps.poolId) || 'Unknown Pool',
      stripePaymentMethodId: ps.stripePaymentMethodId,
      paymentMethodType: ps.paymentMethodType,
      last4: ps.paymentMethodLast4,
      brand: ps.paymentMethodBrand,
      expMonth: ps.paymentMethodExpMonth,
      expYear: ps.paymentMethodExpYear,
      status: ps.status,
      contributionAmount: ps.contributionAmount,
      lastUsedAt: ps.lastUsedAt,
      lastSuccessAt: ps.lastSuccessAt,
      lastFailedAt: ps.lastFailedAt,
      consecutiveFailures: ps.consecutiveFailures,
      totalSuccessfulCharges: ps.totalSuccessfulCharges,
      createdAt: ps.createdAt,
    }));

    return NextResponse.json({
      success: true,
      userId,
      payoutMethod,
      paymentSetups: formattedSetups,
    });
  } catch (error) {
    console.error('Error getting payment methods:', error);
    return NextResponse.json(
      { error: 'Failed to get payment methods' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[userId]/payment-methods
 *
 * Remove a payment method for a specific pool.
 *
 * Query params:
 * - poolId: Pool to remove payment method for
 * - paymentMethodId: Stripe payment method ID to detach (optional)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    // Users can only delete their own payment methods
    if (user._id.toString() !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const poolId = searchParams.get('poolId');
    const paymentMethodId = searchParams.get('paymentMethodId');

    if (!poolId) {
      return NextResponse.json(
        { error: 'Pool ID required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const PaymentSetup = getPaymentSetupModel();
    const Pool = getPoolModel();
    const AuditLog = getAuditLogModel();

    // Find the payment setup
    const paymentSetup = await PaymentSetup.findOne({ userId: user._id, poolId });

    if (!paymentSetup) {
      return NextResponse.json(
        { error: 'Payment setup not found' },
        { status: 404 }
      );
    }

    // Get pool info for warning
    const pool = await Pool.findOne({ id: poolId });

    // Mark as cancelled
    paymentSetup.status = PaymentSetupStatus.CANCELLED;
    await paymentSetup.save();

    // Audit log
    await AuditLog.create({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: user._id.toString(),
      type: AuditLogType.PAYMENT,
      action: 'payment_setup_removed',
      metadata: {
        poolId,
      },
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment method removed',
      warning: pool
        ? `You will need to manually pay contributions for ${pool.name} or set up a new payment method.`
        : 'You will need to manually pay contributions for this pool.',
    });
  } catch (error) {
    console.error('Error removing payment method:', error);
    return NextResponse.json(
      { error: 'Failed to remove payment method' },
      { status: 500 }
    );
  }
}
