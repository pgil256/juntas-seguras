import { NextRequest, NextResponse } from 'next/server';
import { TransactionStatus, TransactionType } from '../../../../types/payment';
import { createPaymentIntent, getOrCreateCustomer } from '../../../../lib/stripe';
import { v4 as uuidv4 } from 'uuid';

// Simulate database collections
const mockPayments = new Map();
const mockUsers = new Map();
const mockPools = new Map();

// For a real app, this would use MongoDB models
// import connectDB from '../../../../lib/db/connect';
// import { getPoolModel } from '../../../../lib/db/models/pool';
// import { getUserModel } from '../../../../lib/db/models/user';

interface PaymentRequest {
  userId: string;
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
    const body = await request.json() as PaymentRequest;
    const { 
      userId, 
      poolId, 
      amount, 
      paymentMethodId, 
      scheduleForLater, 
      scheduledDate,
      useEscrow,
      escrowReleaseDate 
    } = body;

    // Validate required fields
    if (!userId || !poolId || !amount || !paymentMethodId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

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

    // Validate payment method exists and belongs to user
    const userPaymentMethods = getUserPaymentMethods(userId);
    const paymentMethod = userPaymentMethods.find(method => method.id === paymentMethodId);
    
    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      );
    }

    // Get user info for Stripe customer creation
    // In a real app, this would query the database
    const user = {
      id: userId,
      email: `user${userId}@example.com`,
      name: `User ${userId}`
    };

    // Get or create Stripe customer
    const customerResult = await getOrCreateCustomer(
      userId,
      user.email,
      user.name
    );

    if (!customerResult.success) {
      return NextResponse.json(
        { error: customerResult.error || 'Failed to create payment customer' },
        { status: 400 }
      );
    }

    // Get pool name for the payment description
    // In a real app, this would query from a database
    const poolName = `Pool ${poolId}`;

    // Create payment intent with Stripe
    const paymentResult = await createPaymentIntent(
      amount,
      'usd',
      customerResult.customerId,
      `Contribution to ${poolName}`,
      {
        userId,
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

    // Create payment record
    const paymentId = generatePaymentId();
    const transactionType = useEscrow ? TransactionType.ESCROW : TransactionType.DEPOSIT;
    const status = scheduleForLater 
      ? TransactionStatus.SCHEDULED 
      : (useEscrow ? TransactionStatus.ESCROWED : TransactionStatus.COMPLETED);

    const paymentRecord = {
      id: paymentId,
      userId,
      poolId,
      amount,
      paymentMethodId,
      status,
      type: transactionType,
      stripePaymentIntentId: paymentResult.paymentIntentId,
      description: `${useEscrow ? 'Escrow payment' : 'Contribution'} to ${poolName}`,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      scheduledDate: scheduleForLater ? scheduledDate : null,
      processedAt: scheduleForLater ? null : new Date().toISOString(),
      escrowId: useEscrow ? uuidv4() : null,
      releaseDate: useEscrow ? escrowReleaseDate : null,
      member: user.name,
    };

    // In a real app, this would save to a database
    mockPayments.set(paymentId, paymentRecord);

    // Update pool balance if not in escrow
    if (!useEscrow && !scheduleForLater) {
      updatePoolBalance(poolId, amount);
    }

    // Log activity
    await logActivity(userId, 
      useEscrow 
        ? 'payment_escrowed' 
        : (scheduleForLater ? 'payment_scheduled' : 'payment_processed'), 
      {
        poolId,
        amount,
        paymentId,
      }
    );

    let successMessage = '';
    if (useEscrow) {
      successMessage = scheduleForLater 
        ? 'Escrow payment scheduled successfully' 
        : 'Payment placed in escrow successfully';
    } else {
      successMessage = scheduleForLater 
        ? 'Payment scheduled successfully' 
        : 'Payment processed successfully';
    }

    return NextResponse.json({
      success: true,
      payment: paymentRecord,
      clientSecret: paymentResult.clientSecret,
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

// Helper function to retrieve user payment methods
function getUserPaymentMethods(userId: string) {
  // In a real app, this would query from a database
  // For now, return mock data
  return [
    {
      id: 1,
      type: 'bank',
      name: 'Chase Bank',
      last4: '4567',
      isDefault: true,
    },
    {
      id: 2,
      type: 'card',
      name: 'Visa',
      last4: '8901',
      isDefault: false,
    },
  ];
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