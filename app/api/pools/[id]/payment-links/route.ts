import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '../../../../../lib/db/connect';
import { Pool } from '../../../../../lib/db/models/pool';
import {
  generatePayoutLink,
  PayoutMethodType,
} from '../../../../../lib/payments/deep-links';
import { getCurrentUser } from '../../../../../lib/auth';

interface Params {
  params: Promise<{ id: string }>;
}

interface GeneratedLinks {
  venmo: string | null;
  cashapp: string | null;
  paypal: string | null;
  zelle: { identifier: string; copyText: string } | null;
}

/**
 * GET /api/pools/[id]/payment-links
 * Get payment links for contributors to pay the admin
 * Query params:
 * - type: 'pay_admin' | 'payout' (default: pay_admin)
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    // Get current user with proper validation
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const linkType = searchParams.get('type') || 'pay_admin';

    await connectToDatabase();

    const pool = await Pool.findOne({
      $or: [{ id }, { _id: id }],
    });

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    }

    // SECURITY: Check membership using userId (primary) with email fallback
    const userEmailLower = user.email?.toLowerCase();
    const member = pool.members.find(
      (m: any) => m.userId?.toString() === user._id.toString() || m.email?.toLowerCase() === userEmailLower
    );

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this pool' }, { status: 403 });
    }

    const currentRound = pool.currentRound || 1;
    const amount = pool.contributionAmount;

    if (linkType === 'pay_admin') {
      // Generate links for contributor to pay admin
      const adminMethods = pool.adminPaymentMethods;
      if (!adminMethods) {
        return NextResponse.json({
          links: null,
          message: 'Admin has not set up payment methods',
        });
      }

      // Find admin member
      const admin = pool.members.find(
        (m: any) => m.role === 'admin' || m.role === 'creator'
      );
      const adminName = admin?.name || 'Admin';

      const note = `${pool.name} - Round ${currentRound} Contribution`;

      const links: GeneratedLinks = {
        venmo: adminMethods.venmo
          ? generatePayoutLink('venmo', { recipientHandle: adminMethods.venmo, amount, note })
          : null,
        cashapp: adminMethods.cashapp
          ? generatePayoutLink('cashapp', { recipientHandle: adminMethods.cashapp, amount, note })
          : null,
        paypal: adminMethods.paypal
          ? generatePayoutLink('paypal', { recipientHandle: adminMethods.paypal, amount, note })
          : null,
        zelle: adminMethods.zelle
          ? { identifier: adminMethods.zelle, copyText: `Send $${amount} to ${adminMethods.zelle} for ${note}` }
          : null,
      };

      return NextResponse.json({
        links,
        adminName,
        amount,
        note,
        preferredMethod: adminMethods.preferred,
      });
    } else if (linkType === 'payout') {
      // Generate links for admin to pay winner
      const winner = pool.members.find((m: any) => m.position === currentRound);
      if (!winner) {
        return NextResponse.json({
          links: null,
          message: 'Could not find winner for current round',
        });
      }

      const winnerMethods = winner.payoutMethods;
      if (!winnerMethods) {
        return NextResponse.json({
          links: null,
          winnerName: winner.name,
          message: 'Winner has not set up payout methods',
        });
      }

      const potAmount = pool.contributionAmount * pool.members.length;
      const note = `${pool.name} - Round ${currentRound} Payout`;

      const links: GeneratedLinks = {
        venmo: winnerMethods.venmo
          ? generatePayoutLink('venmo', { recipientHandle: winnerMethods.venmo, amount: potAmount, note })
          : null,
        cashapp: winnerMethods.cashapp
          ? generatePayoutLink('cashapp', { recipientHandle: winnerMethods.cashapp, amount: potAmount, note })
          : null,
        paypal: winnerMethods.paypal
          ? generatePayoutLink('paypal', { recipientHandle: winnerMethods.paypal, amount: potAmount, note })
          : null,
        zelle: winnerMethods.zelle
          ? { identifier: winnerMethods.zelle, copyText: `Send $${potAmount} to ${winnerMethods.zelle} for ${note}` }
          : null,
      };

      return NextResponse.json({
        links,
        winnerName: winner.name,
        winnerEmail: winner.email,
        amount: potAmount,
        note,
        preferredMethod: winnerMethods.preferred,
      });
    } else {
      return NextResponse.json({ error: 'Invalid link type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error generating payment links:', error);
    return NextResponse.json(
      { error: 'Failed to generate payment links' },
      { status: 500 }
    );
  }
}
