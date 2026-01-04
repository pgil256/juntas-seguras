import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import connectToDatabase from '../../../../lib/db/connect';
import { getPaymentModel } from '../../../../lib/db/models/payment';
import { getPoolModel } from '../../../../lib/db/models/pool';
import { TransactionType } from '../../../../types/payment';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/payments/history - Fetch user's transaction history across all pools
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - poolId: Filter by specific pool
 * - type: Filter by transaction type
 * - status: Filter by transaction status
 * - search: Search in description or pool name
 * - startDate: Filter transactions from this date
 * - endDate: Filter transactions until this date
 * - sortBy: Sort field (default: createdAt)
 * - sortOrder: Sort order (asc/desc, default: desc)
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const poolId = searchParams.get('poolId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    await connectToDatabase();

    const Payment = getPaymentModel();
    const Pool = getPoolModel();

    // Build query filter
    const filter: Record<string, unknown> = {
      userId: user._id
    };

    if (poolId) {
      filter.poolId = poolId;
    }

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        (filter.createdAt as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        (filter.createdAt as Record<string, Date>).$lte = new Date(endDate);
      }
    }

    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { member: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const totalCount = await Payment.countDocuments(filter);

    // Fetch payments with pagination
    const payments = await Payment.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get unique pool IDs to fetch pool names
    const poolIds = [...new Set(payments.map(p => p.poolId))];

    // Fetch pools to get names
    const pools = await Pool.find({ id: { $in: poolIds } })
      .select('id name')
      .lean();

    const poolMap = new Map(pools.map(p => [p.id, p.name]));

    // Also get transactions from pool.transactions for legacy data
    const userPools = await Pool.find({
      'members.email': user.email
    }).lean();

    // Combine pool transactions with payment records
    const poolTransactions: Array<{
      id: string;
      paymentId: string;
      poolId: string;
      poolName: string;
      amount: number;
      currency: string;
      type: string;
      status: string;
      description: string;
      member: string;
      round?: number;
      createdAt: Date;
      source: string;
    }> = [];

    for (const pool of userPools) {
      const userMember = pool.members.find(
        (m: { email: string }) => m.email === user.email
      );

      if (userMember && pool.transactions) {
        for (const tx of pool.transactions) {
          // Only include transactions where the user is the member
          if (tx.member === userMember.name) {
            // Check if this matches search criteria
            if (search) {
              const searchLower = search.toLowerCase();
              const matchesSearch =
                tx.member?.toLowerCase().includes(searchLower) ||
                pool.name?.toLowerCase().includes(searchLower);
              if (!matchesSearch) continue;
            }

            // Check type filter
            if (type && tx.type !== type) continue;

            // Check status filter
            if (status && tx.status !== status) continue;

            // Check pool filter
            if (poolId && pool.id !== poolId) continue;

            // Check date filter
            const txDate = new Date(tx.date);
            if (startDate && txDate < new Date(startDate)) continue;
            if (endDate && txDate > new Date(endDate)) continue;

            poolTransactions.push({
              id: `pool_${pool.id}_${tx.id}`,
              paymentId: `pool_tx_${tx.id}`,
              poolId: pool.id,
              poolName: pool.name,
              amount: tx.amount,
              currency: 'USD',
              type: tx.type,
              status: tx.status,
              description: `${tx.type === TransactionType.CONTRIBUTION ? 'Contribution' : tx.type === TransactionType.PAYOUT ? 'Payout' : tx.type} - ${pool.name}`,
              member: tx.member,
              round: tx.round,
              createdAt: new Date(tx.date),
              source: 'pool'
            });
          }
        }
      }
    }

    // Format payment records
    const formattedPayments = payments.map(p => ({
      id: p._id.toString(),
      paymentId: p.paymentId,
      poolId: p.poolId,
      poolName: poolMap.get(p.poolId) || 'Unknown Pool',
      amount: p.amount,
      currency: p.currency || 'USD',
      type: p.type,
      status: p.status,
      description: p.description || '',
      member: p.member || user.name,
      round: p.round,
      stripePaymentIntentId: p.stripePaymentIntentId,
      stripeSessionId: p.stripeSessionId,
      escrowId: p.escrowId,
      releaseDate: p.releaseDate,
      scheduledDate: p.scheduledDate,
      processedAt: p.processedAt,
      failureReason: p.failureReason,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      source: 'payment'
    }));

    // Merge and deduplicate (payment records take priority)
    const paymentIds = new Set(formattedPayments.map(p => p.paymentId));
    const uniquePoolTransactions = poolTransactions.filter(
      tx => !paymentIds.has(tx.paymentId)
    );

    // Combine all transactions
    let allTransactions = [...formattedPayments, ...uniquePoolTransactions];

    // Sort combined results
    allTransactions.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 1 ? dateA - dateB : dateB - dateA;
    });

    // Apply pagination to combined results
    const paginatedTransactions = allTransactions.slice(
      (page - 1) * limit,
      page * limit
    );

    const totalPages = Math.ceil(allTransactions.length / limit);

    return NextResponse.json({
      success: true,
      transactions: paginatedTransactions,
      pagination: {
        page,
        limit,
        totalCount: allTransactions.length,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment history' },
      { status: 500 }
    );
  }
}
