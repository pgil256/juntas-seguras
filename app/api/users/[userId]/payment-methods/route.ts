/**
 * User Payment Methods API Route
 *
 * GET - Get user's payout method (Venmo, PayPal, Zelle, Cash App)
 *
 * Note: This app uses manual payments only. This endpoint returns the user's
 * preferred payout method for receiving payouts from pool administrators.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import connectToDatabase from '@/lib/db/connect';

export const runtime = 'nodejs';

/**
 * GET /api/users/[userId]/payment-methods
 *
 * Get user's payout method.
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

    // Get user's payout method (Venmo, PayPal, Zelle, Cash App)
    const payoutMethod = user.payoutMethod ? {
      type: user.payoutMethod.type,
      handle: user.payoutMethod.handle,
      displayName: user.payoutMethod.displayName,
    } : null;

    return NextResponse.json({
      success: true,
      userId,
      payoutMethod,
    });
  } catch (error) {
    console.error('Error getting payment methods:', error);
    return NextResponse.json(
      { error: 'Failed to get payment methods' },
      { status: 500 }
    );
  }
}
