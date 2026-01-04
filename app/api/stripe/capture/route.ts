/**
 * Capture Payment Intent API
 *
 * Captures a held payment (releases escrow)
 * Only accessible by pool admins
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { capturePaymentIntent, getPaymentIntent } from '@/lib/stripe';
import { connectToDatabase } from '@/lib/db/connection';
import Payment from '@/lib/db/models/payment';
import Pool from '@/lib/db/models/pool';
import { logActivity } from '@/lib/db/models/activityLog';
import { Types } from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentIntentId, paymentId } = body;

    if (!paymentIntentId && !paymentId) {
      return NextResponse.json(
        { error: 'paymentIntentId or paymentId required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find the payment record
    const query = paymentId
      ? { paymentId }
      : { stripePaymentIntentId: paymentIntentId };

    const payment = await Payment.findOne(query);
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Verify user is admin of the pool
    if (payment.poolId) {
      const pool = await Pool.findById(payment.poolId);
      if (!pool) {
        return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
      }

      const isAdmin = pool.members.some(
        (m: { userId: Types.ObjectId; role: string }) =>
          m.userId.toString() === session.user.id && m.role === 'ADMIN'
      );
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Only pool admins can release escrow payments' },
          { status: 403 }
        );
      }
    }

    // Check payment status
    const stripePaymentIntent = await getPaymentIntent(
      payment.stripePaymentIntentId
    );

    if (stripePaymentIntent.status !== 'requires_capture') {
      return NextResponse.json(
        {
          error: `Payment cannot be captured. Current status: ${stripePaymentIntent.status}`,
        },
        { status: 400 }
      );
    }

    // Capture the payment
    const capturedIntent = await capturePaymentIntent(
      payment.stripePaymentIntentId
    );

    // Update payment record
    payment.status = 'RELEASED';
    payment.releasedAt = new Date();
    payment.releasedBy = new Types.ObjectId(session.user.id);
    payment.stripeCaptureId = capturedIntent.latest_charge as string;
    await payment.save();

    // Update pool transactions if applicable
    if (payment.poolId) {
      const pool = await Pool.findById(payment.poolId);
      if (pool) {
        const txIndex = pool.transactions.findIndex(
          (tx: { stripePaymentIntentId?: string }) =>
            tx.stripePaymentIntentId === payment.stripePaymentIntentId
        );
        if (txIndex >= 0) {
          pool.transactions[txIndex].status = 'COMPLETED';
        }
        await pool.save();
      }
    }

    // Log activity
    await logActivity({
      userId: new Types.ObjectId(session.user.id),
      action: 'escrow_released',
      category: 'payment',
      details: {
        paymentId: payment.paymentId,
        poolId: payment.poolId?.toString(),
        amount: payment.amount,
        stripePaymentIntentId: payment.stripePaymentIntentId,
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      status: 'RELEASED',
      paymentId: payment.paymentId,
    });
  } catch (error) {
    console.error('Error capturing payment:', error);
    return NextResponse.json(
      { error: 'Failed to capture payment' },
      { status: 500 }
    );
  }
}
