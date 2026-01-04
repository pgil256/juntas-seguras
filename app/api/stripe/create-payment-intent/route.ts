/**
 * Create Payment Intent API
 *
 * Creates a Stripe Payment Intent for pool contributions
 * Supports both immediate capture and manual capture (escrow)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createPaymentIntent, createCustomer } from '@/lib/stripe';
import connectToDatabase from '@/lib/db/connect';
import User from '@/lib/db/models/user';
import Pool from '@/lib/db/models/pool';
import Payment from '@/lib/db/models/payment';
import { getAuditLogModel } from '@/lib/db/models/auditLog';
import { AuditLogType } from '@/types/audit';
import { Types } from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      poolId,
      amount,
      useEscrow = false,
      escrowReleaseDate,
    } = body;

    // Validate amount
    if (!amount || amount < 0.5 || amount > 10000) {
      return NextResponse.json(
        { error: 'Amount must be between $0.50 and $10,000' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Get user and ensure they have a Stripe customer ID
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create or retrieve Stripe customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await createCustomer({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() },
      });
      stripeCustomerId = customer.id;
      user.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    // Validate pool membership if poolId provided
    let pool = null;
    if (poolId) {
      pool = await Pool.findById(poolId);
      if (!pool) {
        return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
      }

      const isMember = pool.members.some(
        (m: { userId: Types.ObjectId }) => m.userId.toString() === session.user.id
      );
      if (!isMember) {
        return NextResponse.json(
          { error: 'You are not a member of this pool' },
          { status: 403 }
        );
      }

      // Validate contribution amount matches pool requirement
      if (amount !== pool.contributionAmount) {
        return NextResponse.json(
          { error: `Contribution must be exactly $${pool.contributionAmount}` },
          { status: 400 }
        );
      }
    }

    // Create payment intent
    const paymentIntent = await createPaymentIntent({
      amount,
      customerId: stripeCustomerId,
      captureMethod: useEscrow ? 'manual' : 'automatic',
      metadata: {
        userId: session.user.id,
        poolId: poolId || '',
        isEscrow: useEscrow.toString(),
        escrowReleaseDate: escrowReleaseDate || '',
      },
      description: pool
        ? `Contribution to pool: ${pool.name} (Round ${pool.currentRound})`
        : 'Payment',
    });

    // Create payment record
    const payment = await Payment.create({
      paymentId: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: new Types.ObjectId(session.user.id),
      poolId: poolId ? new Types.ObjectId(poolId) : undefined,
      amount,
      currency: 'USD',
      type: useEscrow ? 'ESCROW' : 'CONTRIBUTION',
      status: 'PENDING',
      description: pool
        ? `Contribution to ${pool.name}`
        : 'Payment',
      stripePaymentIntentId: paymentIntent.id,
      round: pool?.currentRound,
      releaseDate: escrowReleaseDate ? new Date(escrowReleaseDate) : undefined,
    });

    // Log activity
    const AuditLog = getAuditLogModel();
    await AuditLog.create({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      type: AuditLogType.PAYMENT,
      action: useEscrow ? 'payment_escrow_initiated' : 'payment_initiated',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: {
        paymentId: payment.paymentId,
        poolId,
        amount,
        stripePaymentIntentId: paymentIntent.id,
      },
      success: true,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      paymentId: payment.paymentId,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
