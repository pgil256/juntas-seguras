import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/options';
import connectToDatabase from '../../../../lib/db/connect';
import { User } from '../../../../lib/db/models/user';
import {
  validatePayoutHandle,
  PayoutMethodType,
} from '../../../../lib/payments/deep-links';

/**
 * GET /api/user/payout-method
 * Get the current user's payout methods (both legacy single and new multiple format)
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

    // Return both formats for compatibility
    return NextResponse.json({
      // Legacy single payout method (for backwards compatibility)
      payoutMethod: user.payoutMethod || null,
      // New multiple payout methods
      payoutMethods: user.payoutMethods || null,
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
 * Save or update the user's payout methods
 *
 * Supports two formats:
 * 1. Legacy single method: { type, handle, displayName }
 * 2. New multiple methods: { payoutMethods: { venmo, cashapp, paypal, zelle, preferred } }
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

    await connectToDatabase();

    // Check if this is the new multi-method format
    if (body.payoutMethods !== undefined) {
      const { payoutMethods } = body;
      const { venmo, cashapp, paypal, zelle, preferred } = payoutMethods || {};

      // Validate each provided handle
      const validationErrors: string[] = [];

      if (venmo) {
        const result = validatePayoutHandle('venmo', venmo);
        if (!result.valid) {
          validationErrors.push(`Venmo: ${result.error}`);
        }
      }

      if (cashapp) {
        const result = validatePayoutHandle('cashapp', cashapp);
        if (!result.valid) {
          validationErrors.push(`Cash App: ${result.error}`);
        }
      }

      if (paypal) {
        const result = validatePayoutHandle('paypal', paypal);
        if (!result.valid) {
          validationErrors.push(`PayPal: ${result.error}`);
        }
      }

      if (zelle) {
        const result = validatePayoutHandle('zelle', zelle);
        if (!result.valid) {
          validationErrors.push(`Zelle: ${result.error}`);
        }
      }

      if (validationErrors.length > 0) {
        return NextResponse.json(
          { error: validationErrors.join('; ') },
          { status: 400 }
        );
      }

      // Validate preferred method if set
      const validTypes: (PayoutMethodType | null)[] = ['venmo', 'paypal', 'zelle', 'cashapp', 'bank', null];
      if (preferred && !validTypes.includes(preferred)) {
        return NextResponse.json(
          { error: 'Invalid preferred payout method' },
          { status: 400 }
        );
      }

      // If preferred is set, ensure that method has a handle
      if (preferred && preferred !== 'bank') {
        const preferredHandle = payoutMethods[preferred as keyof typeof payoutMethods];
        if (!preferredHandle || (typeof preferredHandle === 'string' && preferredHandle.trim().length === 0)) {
          return NextResponse.json(
            { error: `Cannot set ${preferred} as preferred without providing a handle` },
            { status: 400 }
          );
        }
      }

      // Update the user with new multi-method format
      const updateData: Record<string, unknown> = {
        'payoutMethods.updatedAt': new Date(),
      };

      // Only set non-empty values, unset empty ones
      if (venmo !== undefined) {
        if (venmo && venmo.trim()) {
          updateData['payoutMethods.venmo'] = venmo.trim();
        } else {
          updateData['payoutMethods.venmo'] = null;
        }
      }

      if (cashapp !== undefined) {
        if (cashapp && cashapp.trim()) {
          // Strip $ prefix if provided
          updateData['payoutMethods.cashapp'] = cashapp.trim().replace(/^\$/, '');
        } else {
          updateData['payoutMethods.cashapp'] = null;
        }
      }

      if (paypal !== undefined) {
        if (paypal && paypal.trim()) {
          updateData['payoutMethods.paypal'] = paypal.trim();
        } else {
          updateData['payoutMethods.paypal'] = null;
        }
      }

      if (zelle !== undefined) {
        if (zelle && zelle.trim()) {
          updateData['payoutMethods.zelle'] = zelle.trim();
        } else {
          updateData['payoutMethods.zelle'] = null;
        }
      }

      if (preferred !== undefined) {
        updateData['payoutMethods.preferred'] = preferred;
      }

      // Also update legacy payoutMethod for backwards compatibility
      if (preferred && preferred !== 'bank') {
        const preferredHandle = payoutMethods[preferred as keyof typeof payoutMethods];
        if (preferredHandle && typeof preferredHandle === 'string') {
          updateData['payoutMethod.type'] = preferred;
          updateData['payoutMethod.handle'] = preferredHandle.trim().replace(/^\$/, '');
          updateData['payoutMethod.updatedAt'] = new Date();
        }
      }

      const user = await User.findOneAndUpdate(
        { email: session.user.email },
        { $set: updateData },
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
        payoutMethods: user.payoutMethods,
      });
    }

    // Legacy single method format
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

    // Validate handle format
    const validation = validatePayoutHandle(type as PayoutMethodType, handle);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const sanitizedHandle = validation.sanitizedHandle || handle.trim();

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      {
        $set: {
          payoutMethod: {
            type,
            handle: sanitizedHandle,
            displayName: displayName?.trim() || undefined,
            updatedAt: new Date(),
          },
          // Also update the new format for the specific type
          [`payoutMethods.${type}`]: sanitizedHandle,
          'payoutMethods.preferred': type,
          'payoutMethods.updatedAt': new Date(),
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
      payoutMethods: user.payoutMethods,
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
 * Remove the user's payout method(s)
 *
 * Query params:
 * - type: 'all' | 'venmo' | 'cashapp' | 'paypal' | 'zelle' - specific method to remove (default: 'all')
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    await connectToDatabase();

    let updateQuery: { $unset: Record<string, number>; $set?: Record<string, unknown> };

    if (type === 'all') {
      // Remove both legacy and new format
      updateQuery = {
        $unset: { payoutMethod: 1, payoutMethods: 1 },
      };
    } else {
      // Remove specific method type
      const validTypes = ['venmo', 'cashapp', 'paypal', 'zelle'];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: 'Invalid payout method type' },
          { status: 400 }
        );
      }

      updateQuery = {
        $unset: { [`payoutMethods.${type}`]: 1 },
        $set: { 'payoutMethods.updatedAt': new Date() },
      };

      // If removing the preferred method, also clear the legacy payoutMethod
      const user = await User.findOne({ email: session.user.email });
      if (user?.payoutMethods?.preferred === type) {
        updateQuery.$unset['payoutMethod'] = 1;
        if (updateQuery.$set) {
          updateQuery.$set['payoutMethods.preferred'] = null;
        }
      }
    }

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      updateQuery,
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
      payoutMethod: user.payoutMethod || null,
      payoutMethods: user.payoutMethods || null,
    });
  } catch (error) {
    console.error('Error removing payout method:', error);
    return NextResponse.json(
      { error: 'Failed to remove payout method' },
      { status: 500 }
    );
  }
}
