import { NextRequest, NextResponse } from 'next/server';
import { getPendingReminders, getReminderStats } from '../../../../lib/reminders/scheduler';
import { processReminders, retryFailedReminders } from '../../../../lib/reminders/sender';

/**
 * Cron endpoint for processing reminders
 *
 * This endpoint processes all reminders due within the next 24 hours.
 * Designed to work with Vercel Hobby plan's once-per-day cron limit.
 *
 * Security: Protected by CRON_SECRET environment variable
 *
 * Usage:
 * - Vercel Hobby: Add to vercel.json (runs once daily):
 *   {
 *     "crons": [{
 *       "path": "/api/cron/reminders",
 *       "schedule": "0 8 * * *"  // 8 AM UTC daily
 *     }]
 *   }
 * - Vercel Pro: Can run more frequently (hourly)
 * - External: Call with Authorization header containing CRON_SECRET
 */

// Verify cron secret for security
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // If no secret is configured, allow in development only
  if (!cronSecret) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Cron] No CRON_SECRET configured - allowing request in development');
      return true;
    }
    return false;
  }

  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Check Vercel cron header (for Vercel Cron Jobs)
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  if (vercelCronHeader === cronSecret) {
    return true;
  }

  return false;
}

/**
 * GET /api/cron/reminders
 *
 * Main cron endpoint - finds and sends pending reminders
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    console.log('[Cron] Starting reminder processing...');

    // Get pending reminders
    const pendingReminders = await getPendingReminders();
    console.log(`[Cron] Found ${pendingReminders.length} pending reminders`);

    // Process reminders
    const sendResults = await processReminders(pendingReminders);

    // Retry any recently failed reminders
    const retryResults = await retryFailedReminders(3);

    // Get updated stats
    const stats = await getReminderStats();

    const duration = Date.now() - startTime;

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      results: {
        pending: pendingReminders.length,
        sent: sendResults.sent,
        failed: sendResults.failed,
        retried: retryResults.retried,
        retrySucceeded: retryResults.succeeded,
        retryFailed: retryResults.failed,
      },
      stats,
      errors: sendResults.errors.length > 0 ? sendResults.errors.slice(0, 10) : undefined, // Limit error output
    };

    console.log('[Cron] Reminder processing complete:', response.results);

    return NextResponse.json(response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron] Error processing reminders:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/reminders
 *
 * Alternative endpoint for triggering reminder processing
 * Useful for manual triggers or testing
 */
export async function POST(request: NextRequest) {
  // Reuse GET handler
  return GET(request);
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}
