import { NextRequest, NextResponse } from 'next/server';
import { captureOrder, getOrderDetails } from '../../../../lib/paypal';
import { getCurrentUser } from '../../../../lib/auth';
import connectToDatabase from '../../../../lib/db/connect';
import { getPaymentModel } from '../../../../lib/db/models/payment';
import { TransactionStatus } from '../../../../types/payment';

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

    const body = await request.json();
    const { token, payerId, poolId } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Payment token is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const Payment = getPaymentModel();

    // The token from PayPal is the order ID
    const orderId = token;

    // Get order details to verify
    const orderDetails = await getOrderDetails(orderId);
    if (!orderDetails.success) {
      return NextResponse.json(
        { error: 'Failed to verify payment order' },
        { status: 400 }
      );
    }

    // Check if order is approved and ready to capture
    if (orderDetails.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `Payment not approved. Status: ${orderDetails.status}` },
        { status: 400 }
      );
    }

    // Capture the payment
    const captureResult = await captureOrder(orderId);

    if (!captureResult.success) {
      return NextResponse.json(
        { error: captureResult.error || 'Failed to capture payment' },
        { status: 400 }
      );
    }

    // Update payment record in database
    const payment = await Payment.findOneAndUpdate(
      { paypalOrderId: orderId },
      {
        $set: {
          status: TransactionStatus.COMPLETED,
          paypalCaptureId: captureResult.captureId,
          completedAt: new Date(),
        }
      },
      { new: true }
    );

    if (!payment) {
      // Payment was captured but record not found - log this but don't fail
      console.error('Payment record not found for order:', orderId);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment completed successfully!',
      payment: payment ? {
        id: payment.paymentId,
        amount: payment.amount,
        status: payment.status,
      } : null,
    });

  } catch (error) {
    console.error('Payment capture error:', error);
    return NextResponse.json(
      { error: 'Failed to capture payment' },
      { status: 500 }
    );
  }
}
