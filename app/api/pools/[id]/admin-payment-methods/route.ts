import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/options';
import connectToDatabase from '../../../../../lib/db/connect';
import { Pool } from '../../../../../lib/db/models/pool';
import { PoolMemberRole } from '../../../../../types/pool';
import {
  validatePayoutHandle,
  PayoutMethodType,
} from '../../../../../lib/payments/deep-links';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/pools/[id]/admin-payment-methods
 * Get the admin's collection payment methods for this pool
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await connectToDatabase();

    // Build query based on id format - ObjectId format vs custom string id
    const mongoose = (await import('mongoose')).default;
    let query;
    if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
      query = { $or: [{ id }, { _id: id }] };
    } else {
      query = { id };
    }

    const pool = await Pool.findOne(query);

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    }

    // Check if user is a member of this pool
    const member = pool.members.find(
      (m: any) => m.email.toLowerCase() === session.user?.email?.toLowerCase()
    );

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this pool' }, { status: 403 });
    }

    return NextResponse.json({
      adminPaymentMethods: pool.adminPaymentMethods || null,
    });
  } catch (error) {
    console.error('Error fetching admin payment methods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin payment methods' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/pools/[id]/admin-payment-methods
 * Update the admin's collection payment methods for this pool
 * Only pool admin/creator can update
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { venmo, cashapp, paypal, zelle, preferred } = body;

    await connectToDatabase();

    // Build query based on id format - ObjectId format vs custom string id
    const mongoose = (await import('mongoose')).default;
    let query;
    if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
      query = { $or: [{ id }, { _id: id }] };
    } else {
      query = { id };
    }

    const pool = await Pool.findOne(query);

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    }

    // Check if user is admin of this pool
    const member = pool.members.find(
      (m: any) => m.email.toLowerCase() === session.user?.email?.toLowerCase()
    );

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this pool' }, { status: 403 });
    }

    const isAdmin =
      member.role === PoolMemberRole.ADMIN ||
      member.role === PoolMemberRole.CREATOR;

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only pool admin can update payment methods' },
        { status: 403 }
      );
    }

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

    // Validate preferred method
    const validTypes: (PayoutMethodType | null)[] = ['venmo', 'paypal', 'zelle', 'cashapp', null];
    if (preferred && !validTypes.includes(preferred)) {
      return NextResponse.json(
        { error: 'Invalid preferred payment method' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      'adminPaymentMethods.updatedAt': new Date(),
    };

    // Only set non-empty values
    if (venmo !== undefined) {
      updateData['adminPaymentMethods.venmo'] = venmo?.trim() || null;
    }
    if (cashapp !== undefined) {
      updateData['adminPaymentMethods.cashapp'] = cashapp?.trim()?.replace(/^\$/, '') || null;
    }
    if (paypal !== undefined) {
      updateData['adminPaymentMethods.paypal'] = paypal?.trim() || null;
    }
    if (zelle !== undefined) {
      updateData['adminPaymentMethods.zelle'] = zelle?.trim() || null;
    }
    if (preferred !== undefined) {
      updateData['adminPaymentMethods.preferred'] = preferred;
    }

    const updatedPool = await Pool.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      adminPaymentMethods: updatedPool.adminPaymentMethods,
    });
  } catch (error) {
    console.error('Error updating admin payment methods:', error);
    return NextResponse.json(
      { error: 'Failed to update admin payment methods' },
      { status: 500 }
    );
  }
}
