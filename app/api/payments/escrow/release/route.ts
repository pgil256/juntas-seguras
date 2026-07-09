import { NextRequest, NextResponse } from 'next/server';
import { TransactionStatus, TransactionType } from '../../../../../types/payment';
import { PoolMemberRole } from '../../../../../types/pool';
import { getCurrentUser } from '../../../../../lib/auth';
import connectToDatabase from '../../../../../lib/db/connect';
import { getPaymentModel, generatePaymentId } from '../../../../../lib/db/models/payment';
import { getPoolModel } from '../../../../../lib/db/models/pool';
import { getPaymentProvider } from '../../../../../lib/payments/providers/stripe';
import { isStripeConfigured } from '../../../../../lib/stripe/client';
import { writeServerAuditLog } from '../../../../../lib/audit-server';
import { AuditLogType } from '../../../../../types/audit';

interface EscrowReleaseRequest {
  paymentId: string;
  poolId: string;
  releaseNow: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const requestingUser = userResult.user;

    const body = await request.json() as EscrowReleaseRequest;
    const { paymentId, poolId, releaseNow } = body;

    // Validate required fields
    if (!paymentId || !poolId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const Payment = getPaymentModel();
    const Pool = getPoolModel();

    // Retrieve payment from database
    const payment = await Payment.findOne({ paymentId });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Verify payment is in escrow
    if (payment.type !== TransactionType.ESCROW ||
        (payment.status !== TransactionStatus.ESCROWED && payment.status !== TransactionStatus.PENDING)) {
      return NextResponse.json(
        { error: 'Payment is not in escrow' },
        { status: 400 }
      );
    }

    // Verify payment belongs to specified pool
    if (payment.poolId !== poolId) {
      return NextResponse.json(
        { error: 'Payment does not belong to specified pool' },
        { status: 400 }
      );
    }

    // Get the pool to verify user permissions
    const pool = await Pool.findOne({ id: poolId });
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    // CRITICAL: Verify user is an admin of this pool
    const userMembership = pool.members.find(
      (member: any) => member.email === requestingUser.email
    );

    if (!userMembership) {
      return NextResponse.json(
        { error: 'You are not a member of this pool' },
        { status: 403 }
      );
    }

    if (userMembership.role !== PoolMemberRole.ADMIN) {
      return NextResponse.json(
        { error: 'Only pool administrators can release escrow payments' },
        { status: 403 }
      );
    }

    // Check if we should release now or if we're just validating the request
    if (!releaseNow) {
      return NextResponse.json({
        success: true,
        payment: {
          id: payment.paymentId,
          amount: payment.amount,
          status: payment.status,
          poolId: payment.poolId,
          releaseDate: payment.releaseDate,
        },
        message: 'Payment can be released',
      });
    }

    // Release the payment through the payment provider (simulated transfer in the PoC).
    try {
      const releasePaymentId = generatePaymentId();

      // Route the payout through the provider so a (simulated) Stripe transfer id
      // is recorded. Falls back gracefully when Stripe is not configured.
      let stripeTransferId: string | undefined;
      let simulated = false;
      if (isStripeConfigured()) {
        try {
          const provider = getPaymentProvider();
          const recipientMember = pool.members.find((m: any) => m.name === payment.member);
          const release = await provider.releasePayout({
            poolId,
            round: payment.round || pool.currentRound || 0,
            recipientMemberId: recipientMember?.id ?? 0,
            recipientName: payment.member || 'recipient',
            amount: payment.amount,
            currency: (payment.currency || 'usd').toLowerCase(),
            reference: releasePaymentId,
          });
          stripeTransferId = release.transferId;
          simulated = release.simulated;
        } catch (providerError) {
          console.error('Provider transfer during escrow release failed:', providerError);
          // Non-fatal: the escrow release still completes below.
        }
      }

      // Update the escrowed payment record
      payment.status = TransactionStatus.RELEASED;
      payment.processedAt = new Date();
      payment.releasedAt = new Date();
      payment.releasedBy = requestingUser._id;
      if (stripeTransferId) payment.stripeTransferId = stripeTransferId;
      await payment.save();

      // Update pool balance now that funds are released
      pool.totalAmount = (pool.totalAmount || 0) + payment.amount;
      await pool.save();

      // Create a new transaction record for the release
      const releaseRecord = new Payment({
        paymentId: releasePaymentId,
        userId: payment.userId,
        poolId: payment.poolId,
        amount: payment.amount,
        currency: payment.currency,
        type: TransactionType.ESCROW_RELEASE,
        status: TransactionStatus.COMPLETED,
        description: `Release of escrowed funds for payment ${paymentId}`,
        member: payment.member,
        relatedPaymentId: paymentId,
        stripeTransferId,
        processedAt: new Date(),
        releasedBy: requestingUser._id,
      });

      await releaseRecord.save();

      // Audit the money-out event.
      await writeServerAuditLog({
        userId: requestingUser._id.toString(),
        userEmail: requestingUser.email,
        type: AuditLogType.PAYMENT_ESCROW_RELEASE,
        action: 'Escrow funds released',
        metadata: {
          poolId,
          amount: payment.amount,
          paymentId,
          releasePaymentId,
          stripeTransferId,
          simulated,
        },
        poolId,
        success: true,
      });

      return NextResponse.json({
        success: true,
        payment: {
          id: releaseRecord.paymentId,
          amount: releaseRecord.amount,
          status: releaseRecord.status,
          type: releaseRecord.type,
          processedAt: releaseRecord.processedAt,
        },
        stripeTransferId,
        simulated,
        message: 'Payment successfully released from escrow',
      });

    } catch (releaseError: any) {
      console.error('Escrow release error:', releaseError);

      // Update payment with failure info
      payment.failureCount = (payment.failureCount || 0) + 1;
      payment.failureReason = releaseError.message;
      await payment.save();

      return NextResponse.json(
        { error: releaseError.message || 'Failed to release payment from escrow' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Escrow release error:', error);
    return NextResponse.json(
      { error: 'Failed to release payment from escrow' },
      { status: 500 }
    );
  }
}
