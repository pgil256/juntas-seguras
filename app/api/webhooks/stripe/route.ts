/**
 * POST /api/webhooks/stripe — Stripe webhook receiver (TEST MODE).
 *
 * Thin transport shell: it verifies the event signature against the RAW request
 * body using STRIPE_WEBHOOK_SECRET, then hands the parsed event to the DB-facing
 * handler in lib/payments/webhook.ts. No session/auth here — Stripe authenticates
 * via the signature, so middleware.ts explicitly bypasses this path.
 *
 * Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` locally.
 */

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripeClient, isStripeConfigured } from '../../../../lib/stripe/client';
import { handleStripeWebhookEvent } from '../../../../lib/payments/webhook';

// Stripe SDK needs the Node runtime; the raw body must not be cached/parsed.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!isStripeConfigured() || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhooks are not configured (test-mode keys required)' },
      { status: 503 }
    );
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // Signature verification requires the exact raw payload — never JSON.parse it.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid signature';
    console.error('Stripe webhook signature verification failed:', message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  try {
    const result = await handleStripeWebhookEvent(event);
    // Ack with 200 so Stripe stops retrying — even for events we intentionally ignore.
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error('Error handling Stripe webhook event:', error);
    // 500 signals Stripe to retry later (e.g. a transient database error).
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
