import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/options';
import connectToDatabase from '../../../../../../lib/db/connect';
import { Pool } from '../../../../../../lib/db/models/pool';
import { User } from '../../../../../../lib/db/models/user';
import { PoolMemberRole } from '../../../../../../types/pool';

interface Params {
  params: Promise<{ id: string; memberId: string }>;
}

/**
 * GET /api/pools/[id]/round-payments/[memberId]
 * Get a specific member's payment status
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, memberId } = await params;

    await connectToDatabase();

    const pool = await Pool.findOne({
      $or: [{ id }, { _id: id }],
    });

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    }

    // Check if user is a member
    const userMember = pool.members.find(
      (m: any) => m.email.toLowerCase() === session.user?.email?.toLowerCase()
    );

    if (!userMember) {
      return NextResponse.json({ error: 'Not a member of this pool' }, { status: 403 });
    }

    // Find the payment record
    const payment = (pool.currentRoundPayments || []).find(
      (p: any) => p.memberId === parseInt(memberId)
    );

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({ payment });
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pools/[id]/round-payments/[memberId]
 * Update a payment (confirm, verify, dispute, remind, etc.)
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, memberId } = await params;
    const body = await request.json();
    const { action, method, notes } = body;

    await connectToDatabase();

    const pool = await Pool.findOne({
      $or: [{ id }, { _id: id }],
    });

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    }

    // Get the current user and their membership
    const userMember = pool.members.find(
      (m: any) => m.email.toLowerCase() === session.user?.email?.toLowerCase()
    );

    if (!userMember) {
      return NextResponse.json({ error: 'Not a member of this pool' }, { status: 403 });
    }

    const isAdmin =
      userMember.role === PoolMemberRole.ADMIN ||
      userMember.role === PoolMemberRole.CREATOR;

    const memberIdNum = parseInt(memberId);

    // Find the payment
    const payments = pool.currentRoundPayments || [];
    const paymentIndex = payments.findIndex((p: any) => p.memberId === memberIdNum);

    if (paymentIndex === -1) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const payment = payments[paymentIndex];

    // Handle different actions
    switch (action) {
      case 'member_confirm': {
        // Member confirming their own payment
        const isOwnPayment = userMember.id === memberIdNum;
        if (!isOwnPayment && !isAdmin) {
          return NextResponse.json(
            { error: 'Can only confirm your own payment' },
            { status: 403 }
          );
        }

        if (payment.status !== 'pending' && payment.status !== 'late') {
          return NextResponse.json(
            { error: 'Payment cannot be confirmed in current state' },
            { status: 400 }
          );
        }

        payments[paymentIndex] = {
          ...payment,
          status: 'member_confirmed',
          memberConfirmedAt: new Date(),
          memberConfirmedVia: method || 'other',
          updatedAt: new Date(),
        };
        break;
      }

      case 'admin_verify': {
        if (!isAdmin) {
          return NextResponse.json(
            { error: 'Only admin can verify payments' },
            { status: 403 }
          );
        }

        // Get user ID for tracking
        const user = await User.findOne({ email: session.user.email });

        payments[paymentIndex] = {
          ...payment,
          status: 'admin_verified',
          adminVerifiedAt: new Date(),
          adminVerifiedBy: user?._id,
          adminNotes: notes || payment.adminNotes,
          updatedAt: new Date(),
        };
        break;
      }

      case 'dispute': {
        if (!isAdmin) {
          return NextResponse.json(
            { error: 'Only admin can dispute payments' },
            { status: 403 }
          );
        }

        // Reset to pending with dispute note
        payments[paymentIndex] = {
          ...payment,
          status: 'pending',
          memberConfirmedAt: null,
          memberConfirmedVia: null,
          adminNotes: notes || 'Payment disputed',
          updatedAt: new Date(),
        };
        break;
      }

      case 'mark_late': {
        if (!isAdmin) {
          return NextResponse.json(
            { error: 'Only admin can mark payments late' },
            { status: 403 }
          );
        }

        if (payment.status !== 'pending') {
          return NextResponse.json(
            { error: 'Only pending payments can be marked late' },
            { status: 400 }
          );
        }

        payments[paymentIndex] = {
          ...payment,
          status: 'late',
          adminNotes: notes || payment.adminNotes,
          updatedAt: new Date(),
        };
        break;
      }

      case 'excuse': {
        if (!isAdmin) {
          return NextResponse.json(
            { error: 'Only admin can excuse payments' },
            { status: 403 }
          );
        }

        const user = await User.findOne({ email: session.user.email });

        payments[paymentIndex] = {
          ...payment,
          status: 'excused',
          adminVerifiedBy: user?._id,
          adminNotes: notes || 'Payment excused',
          updatedAt: new Date(),
        };
        break;
      }

      case 'send_reminder': {
        if (!isAdmin) {
          return NextResponse.json(
            { error: 'Only admin can send reminders' },
            { status: 403 }
          );
        }

        // Check cooldown (24 hours)
        if (payment.reminderSentAt) {
          const lastReminder = new Date(payment.reminderSentAt);
          const hoursSinceReminder = (Date.now() - lastReminder.getTime()) / (1000 * 60 * 60);
          if (hoursSinceReminder < 24) {
            return NextResponse.json(
              { error: `Please wait ${Math.ceil(24 - hoursSinceReminder)} hours before sending another reminder` },
              { status: 429 }
            );
          }
        }

        // TODO: Actually send the reminder email/notification
        // For now, just track that reminder was sent

        payments[paymentIndex] = {
          ...payment,
          reminderSentAt: new Date(),
          reminderCount: (payment.reminderCount || 0) + 1,
          updatedAt: new Date(),
        };
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Check if all payments are verified
    const allVerified = payments.every(
      (p: any) => p.status === 'admin_verified' || p.status === 'excused'
    );

    // Update the pool
    const updateData: Record<string, unknown> = {
      currentRoundPayments: payments,
    };

    if (allVerified) {
      updateData.currentRoundPayoutStatus = 'ready_to_pay';
    }

    const updatedPool = await Pool.findOneAndUpdate(
      { $or: [{ id }, { _id: id }] },
      { $set: updateData },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      payment: payments[paymentIndex],
      allVerified,
      payoutStatus: updatedPool.currentRoundPayoutStatus,
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}
