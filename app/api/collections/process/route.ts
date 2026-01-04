/**
 * Collection Process API Route
 *
 * POST - Trigger the collection processor job
 *
 * This endpoint should be called by a cron job to process scheduled collections.
 * It can also be triggered manually by an admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { processScheduledCollections } from '@/lib/jobs/collection-processor';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minute timeout for processing

/**
 * POST /api/collections/process
 *
 * Trigger the collection processor.
 *
 * Authentication:
 * - Cron: Vercel Cron secret in Authorization header
 * - Admin: Session-based auth (TODO: implement admin check)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Check for cron secret
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        // If not cron, check for admin auth
        // TODO: Add admin authentication check here
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    console.log('[Collections API] Starting collection processor');

    const result = await processScheduledCollections();

    console.log('[Collections API] Collection processor completed:', result);

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Collections API] Error processing collections:', error);
    return NextResponse.json(
      {
        error: 'Failed to process collections',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/collections/process
 *
 * Health check for the collection processor endpoint.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/collections/process',
    description: 'Collection processor endpoint',
  });
}
