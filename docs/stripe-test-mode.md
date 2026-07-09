# Stripe Test-Mode Integration

This app integrates Stripe as an **additional** payment method for pool
contributions and payouts. It runs **exclusively in Stripe test mode** — a
proof-of-concept sandbox. **No live keys, no real money, ever.** The manual
payment methods (Venmo, Zelle, PayPal, Cash App) are unchanged and remain the
default; Stripe is opt-in.

Safety guarantees baked in:

- `STRIPE_SECRET_KEY` **must** start with `sk_test_`. Startup validation
  (`lib/validation.ts` via `instrumentation.ts`) and the Stripe client
  (`lib/stripe/client.ts`) both refuse to run with a live key.
- Every Stripe surface shows a **"TEST MODE — no real money"** badge.
- Payouts to individuals require Stripe Connect onboarding (out of scope for a
  PoC), so the payout path records a clearly-labeled **simulated** transfer id
  (`tr_sim_…`). The seam for real Connect transfers is documented in the code.

---

## 1. Get your test keys

1. Create/sign in to a Stripe account: <https://dashboard.stripe.com>
2. Make sure the dashboard toggle says **Test mode** (top-right).
3. Copy your test keys from <https://dashboard.stripe.com/test/apikeys>:
   - **Publishable key** → `pk_test_…`
   - **Secret key** → `sk_test_…`

## 2. Configure environment variables

Add to `.env.local` (see `.env.example`):

```bash
STRIPE_SECRET_KEY=<your_stripe_test_secret_key>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your_stripe_test_publishable_key>
# Filled in step 3:
STRIPE_WEBHOOK_SECRET=<your_stripe_webhook_signing_secret>
```

If any key is set to a non-test value, the app **will not start** — this is
intentional.

## 3. Forward webhooks locally with the Stripe CLI

Contributions are confirmed asynchronously via a webhook, so you need the Stripe
CLI to forward events to your dev server.

1. Install the CLI: <https://stripe.com/docs/stripe-cli> (`brew install stripe/stripe-cli/stripe`, `scoop install stripe`, etc.)
2. Log in: `stripe login`
3. Start forwarding (leave this running in its own terminal):

   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. The CLI prints a signing secret like `whsec_…`. Copy it into
   `STRIPE_WEBHOOK_SECRET` in `.env.local` and restart `npm run dev`.

> The webhook route (`/api/webhooks/stripe`) is deliberately excluded from auth
> middleware and verifies the Stripe signature on the raw request body.

## 4. Test cards

Use these on the Stripe Checkout page (any future expiry date, any 3-digit CVC,
any postal code):

| Card number           | Result                                    |
| --------------------- | ----------------------------------------- |
| `4242 4242 4242 4242` | ✅ Payment succeeds                        |
| `4000 0000 0000 9995` | ❌ Declined (insufficient funds)          |
| `4000 0000 0000 0002` | ❌ Declined (generic)                     |
| `4000 0025 0000 3155` | 🔐 Requires 3D Secure authentication      |

Full list: <https://stripe.com/docs/testing>

---

## 5. End-to-end demo script

Prerequisites: dev server running (`npm run dev`), `stripe listen` running, all
three test keys set.

1. **Create a pool** (`/create-pool`) with a small contribution amount (e.g. $10)
   and a couple of members, or use `npm run seed` for demo data.
2. **Start a contribution.** On `/payments`, click **Pay Now** on an upcoming
   contribution. The modal shows the **TEST MODE** badge and a
   **"Pay with card (Stripe test)"** button.
3. **Pay on Stripe Checkout.** You're redirected to Stripe's hosted page. Enter
   test card **`4242 4242 4242 4242`**, any future expiry, any CVC, and pay.
4. **Watch the webhook confirm it.** In the `stripe listen` terminal you'll see
   `checkout.session.completed`. Behind the scenes the app:
   - flips the pending `Payment` to `completed`,
   - records the contribution on the pool (round payment + transaction with the
     `stripePaymentIntentId`),
   - writes an `AuditLog` entry, and
   - notifies the pool admin.
   You land back on `/payments/complete` with a success message.
5. **Repeat for all members** so every contribution for the round is in. When the
   last one lands, the webhook marks the round **`ready_to_pay`** (funds held in
   escrow).
6. **Release the payout.** As the pool admin, confirm the round payout choosing
   the **Stripe** method (`POST /api/pools/[id]/round-payout` with
   `{ method: "stripe" }`). The provider records a **simulated** transfer id
   (`tr_sim_…`) — clearly labeled, since real transfers need Connect — and the
   round is marked `paid`. Escrow release (`POST /api/payments/escrow/release`)
   flows through the same provider.

You can also trigger events without the UI:

```bash
stripe trigger checkout.session.completed
stripe trigger payment_intent.payment_failed
```

---

## 6. Architecture

All Stripe access goes through a provider abstraction — no API route imports the
Stripe SDK directly.

| File | Responsibility |
| ---- | -------------- |
| `lib/payments/provider.ts` | `PaymentProvider` interface (createCheckout, getPaymentStatus, releasePayout, refund) |
| `lib/payments/providers/stripe.ts` | `StripeTestProvider` — the only impl; `getPaymentProvider()` factory |
| `lib/stripe/client.ts` | Test-mode-guarded Stripe SDK singleton |
| `lib/payments/webhook.ts` | DB-facing webhook handlers (framework-free, unit-testable) |
| `app/api/webhooks/stripe/route.ts` | Signature verification + dispatch |
| `app/api/pools/[id]/contributions/route.ts` | `action: 'initiate'` → Checkout Session + pending `Payment` |
| `app/api/pools/[id]/round-payout/route.ts` | Payout via provider (`method: 'stripe'`) |
| `app/api/payments/escrow/release/route.ts` | Escrow release via provider |
| `components/payments/StripeTestModeBadge.tsx` | The TEST MODE badge |

Handled webhook events: `checkout.session.completed`, `payment_intent.payment_failed`.

## 7. Going live (production seam)

This PoC intentionally stops short of moving real money. To productionize:

1. Swap test keys for live keys and **remove** the `sk_test_` assertions in
   `lib/stripe/client.ts` and `lib/validation.ts`.
2. Onboard payout recipients via **Stripe Connect**, store each recipient's
   `acct_…` id on the pool member, and pass it as `destination` to
   `PaymentProvider.releasePayout()` — the provider already creates a real
   test-mode transfer when a `destination` is present (see the
   `PRODUCTION SEAM` comment in `lib/payments/providers/stripe.ts`).
3. Register a production webhook endpoint in the Stripe Dashboard and set its
   signing secret as `STRIPE_WEBHOOK_SECRET`.
