import { NextRequest, NextResponse } from 'next/server';
import { TransactionStatus, TransactionType } from '../../../../../types/payment';
import { captureAuthorization } from '../../../../../lib/paypal';

// Simulate database collections
const mockPayments = new Map();
const mockPools = new Map();

// For a real app, this would use MongoDB models
// import connectDB from '../../../../../lib/db/connect';
// import { getPoolModel } from '../../../../../lib/db/models/pool';

interface EscrowReleaseRequest {
  paymentId: string;
  userId: string; // Requester (admin)
  poolId: string;
  releaseNow: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as EscrowReleaseRequest;
    const { paymentId, userId, poolId, releaseNow } = body;

    // Validate required fields
    if (!paymentId || !userId || !poolId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Retrieve payment from database (mock)
    const payment = mockPayments.get(paymentId);

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Verify payment is in escrow
    if (payment.type !== TransactionType.ESCROW || payment.status !== TransactionStatus.ESCROWED) {
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

    // Verify user has permission (admin check)
    // In a real app, check if user is pool admin
    const hasPermission = true; // Mock permission check

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to release this payment' },
        { status: 403 }
      );
    }

    // Check if we should release now or if we're just validating the request
    if (!releaseNow) {
      return NextResponse.json({
        success: true,
        payment,
        message: 'Payment can be released',
      });
    }

    // Verify we have a PayPal authorization ID
    if (!payment.paypalAuthorizationId) {
      return NextResponse.json(
        { error: 'Payment authorization not found. The user may not have completed the payment approval.' },
        { status: 400 }
      );
    }

    // Release the payment by capturing the PayPal authorization
    const captureResult = await captureAuthorization(payment.paypalAuthorizationId);

    if (!captureResult.success) {
      return NextResponse.json(
        { error: captureResult.error || 'Failed to release payment from escrow' },
        { status: 400 }
      );
    }

    // Update payment record
    payment.status = TransactionStatus.RELEASED;
    payment.processedAt = new Date().toISOString();
    payment.paypalCaptureId = captureResult.captureId;
    mockPayments.set(paymentId, payment);

    // Update pool balance now that funds are released
    updatePoolBalance(poolId, payment.amount);

    // Create new transaction record for the release
    const releasePaymentId = generatePaymentId();
    const releaseRecord = {
      id: releasePaymentId,
      type: TransactionType.ESCROW_RELEASE,
      amount: payment.amount,
      date: new Date().toISOString(),
      status: TransactionStatus.COMPLETED,
      description: `Release of escrowed funds for payment ${paymentId}`,
      member: payment.member,
      poolId: payment.poolId,
      relatedPaymentId: paymentId,
      processedAt: new Date().toISOString(),
      processedBy: userId,
      paypalCaptureId: captureResult.captureId,
    };

    // In a real app, this would save to a database
    mockPayments.set(releasePaymentId, releaseRecord);

    // Log activity
    await logActivity(userId, 'payment_escrow_released', {
      poolId,
      amount: payment.amount,
      paymentId,
      releasePaymentId,
    });

    return NextResponse.json({
      success: true,
      payment: releaseRecord,
      message: 'Payment successfully released from escrow',
    });

  } catch (error) {
    console.error('Escrow release error:', error);
    return NextResponse.json(
      { error: 'Failed to release payment from escrow' },
      { status: 500 }
    );
  }
}

// Helper function to update pool balance
function updatePoolBalance(poolId: string, amount: number) {
  // In a real app, this would update the pool balance in a database
  let pool = mockPools.get(poolId);

  if (!pool) {
    pool = { id: poolId, balance: 0 };
  }

  pool.balance += amount;
  mockPools.set(poolId, pool);
}

// Helper function to generate a unique payment ID
function generatePaymentId() {
  return `pmt_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

// Helper function to log activity
async function logActivity(userId: string, type: string, metadata: any) {
  // In a real app, this would log to a dedicated activity log database
  try {
    await fetch('/api/security/activity-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        type,
        metadata
      })
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
