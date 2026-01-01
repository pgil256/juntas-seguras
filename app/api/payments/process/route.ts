import { NextRequest, NextResponse } from 'next/server';
import { TransactionStatus, TransactionType } from '../../../../types/payment';
import { createOrder } from '../../../../lib/paypal';
import { getCurrentUser } from '../../../../lib/auth';
import connectToDatabase from '../../../../lib/db/connect';
import { getPaymentModel, getPaymentMethodModel, generatePaymentId } from '../../../../lib/db/models/payment';
import { getPoolModel } from '../../../../lib/db/models/pool';

interface PaymentRequest {
  poolId: string;
  amount: number;
  paymentMethodId: number;
  scheduleForLater: boolean;
  scheduledDate?: string;
  useEscrow: boolean;
  escrowReleaseDate?: string;
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
    const user = userResult.user;

    const body = await request.json() as PaymentRequest;
    const {
      poolId,
      amount,
      paymentMethodId,
      scheduleForLater,
      scheduledDate,
      useEscrow,
      escrowReleaseDate
    } = body;

    // Validate required fields
    if (!poolId || !amount || !paymentMethodId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate amount is positive and reasonable
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    if (amount > 10000) {
      return NextResponse.json(
        { error: 'Amount exceeds maximum allowed ($10,000)' },
        { status: 400 }
      );
    }

    // Round to 2 decimal places
    const sanitizedAmount = Math.round(amount * 100) / 100;

    // For scheduled payments, validate scheduled date
    if (scheduleForLater && !scheduledDate) {
      return NextResponse.json(
        { error: 'Scheduled date is required for scheduled payments' },
        { status: 400 }
      );
    }

    // For escrow payments, validate release date
    if (useEscrow && !escrowReleaseDate) {
      return NextResponse.json(
        { error: 'Release date is required for escrow payments' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const Payment = getPaymentModel();
    const PaymentMethod = getPaymentMethodModel();
    const Pool = getPoolModel();

    // Validate payment method exists and belongs to user
    const paymentMethod = await PaymentMethod.findOne({
      _id: paymentMethodId,
      userId: user._id,
      deletedAt: null
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      );
    }

    // Validate pool exists and user is a member
    const pool = await Pool.findOne({ id: poolId });
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    const isMember = pool.members.some(
      (member: any) => member.email === user.email
    );

    if (!isMember) {
      return NextResponse.json(
        { error: 'You are not a member of this pool' },
        { status: 403 }
      );
    }

    // Validate amount matches pool contribution amount (with small tolerance for rounding)
    if (Math.abs(sanitizedAmount - pool.contributionAmount) > 0.01) {
      return NextResponse.json(
        { error: `Amount must match pool contribution amount ($${pool.contributionAmount})` },
        { status: 400 }
      );
    }

    // Create PayPal order with authorization intent (for escrow functionality)
    const paymentResult = await createOrder(
      sanitizedAmount,
      'USD',
      `Contribution to ${pool.name}`,
      {
        userId: user._id.toString(),
        poolId,
        isEscrow: useEscrow ? 'true' : 'false',
      }
    );

    if (!paymentResult.success) {
      return NextResponse.json(
        { error: paymentResult.error || 'Payment processing failed' },
        { status: 400 }
      );
    }

    // Create payment record in database
    const paymentId = generatePaymentId();
    const transactionType = useEscrow ? TransactionType.ESCROW : TransactionType.DEPOSIT;
    const status = scheduleForLater
      ? TransactionStatus.SCHEDULED
      : (useEscrow ? TransactionStatus.PENDING : TransactionStatus.PENDING);

    const paymentRecord = new Payment({
      paymentId,
      userId: user._id,
      poolId,
      amount: sanitizedAmount,
      currency: 'USD',
      paymentMethodId,
      type: transactionType,
      status,
      paypalOrderId: paymentResult.orderId,
      description: `${useEscrow ? 'Escrow payment' : 'Contribution'} to ${pool.name}`,
      member: user.name,
      escrowId: useEscrow ? paymentId : undefined,
      releaseDate: useEscrow && escrowReleaseDate ? new Date(escrowReleaseDate) : undefined,
      scheduledDate: scheduleForLater && scheduledDate ? new Date(scheduledDate) : undefined,
    });

    await paymentRecord.save();

    // Log activity
    await logActivity(user._id.toString(),
      useEscrow
        ? 'payment_escrow_initiated'
        : (scheduleForLater ? 'payment_scheduled' : 'payment_initiated'),
      {
        poolId,
        amount: sanitizedAmount,
        paymentId,
      }
    );

    let successMessage = '';
    if (useEscrow) {
      successMessage = scheduleForLater
        ? 'Escrow payment scheduled. Please complete payment approval.'
        : 'Escrow payment initiated. Please complete payment approval.';
    } else {
      successMessage = scheduleForLater
        ? 'Payment scheduled. Please complete payment approval.'
        : 'Payment initiated. Please complete payment approval.';
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: paymentRecord.paymentId,
        amount: paymentRecord.amount,
        status: paymentRecord.status,
        type: paymentRecord.type,
        poolId: paymentRecord.poolId,
        createdAt: paymentRecord.createdAt,
      },
      paypalOrderId: paymentResult.orderId,
      approvalUrl: paymentResult.approvalUrl,
      message: successMessage,
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}

// Helper function to log activity
async function logActivity(userId: string, type: string, metadata: Record<string, unknown>) {
  try {
    // Use absolute URL for server-side fetch
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/security/activity-log`, {
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
