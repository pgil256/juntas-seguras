import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/options';
import connectToDatabase from '../../../../lib/db/connect';
import { User } from '../../../../lib/db/models/user';

/**
 * GET /api/user/payout-method
 * Get the current user's payout method
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      payoutMethod: user.payoutMethod || null,
    });
  } catch (error) {
    console.error('Error fetching payout method:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payout method' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/payout-method
 * Save or update the user's payout method
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, handle, displayName } = body;

    // Validate payout method type
    const validTypes = ['venmo', 'paypal', 'zelle', 'cashapp', 'bank'];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid payout method type' },
        { status: 400 }
      );
    }

    // Validate handle
    if (!handle || typeof handle !== 'string' || handle.trim().length === 0) {
      return NextResponse.json(
        { error: 'Payout account handle is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      {
        $set: {
          payoutMethod: {
            type,
            handle: handle.trim(),
            displayName: displayName?.trim() || undefined,
            updatedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      payoutMethod: user.payoutMethod,
    });
  } catch (error) {
    console.error('Error saving payout method:', error);
    return NextResponse.json(
      { error: 'Failed to save payout method' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/payout-method
 * Remove the user's payout method
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      {
        $unset: { payoutMethod: 1 },
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error removing payout method:', error);
    return NextResponse.json(
      { error: 'Failed to remove payout method' },
      { status: 500 }
    );
  }
}
