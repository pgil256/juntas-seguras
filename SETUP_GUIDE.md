# Setup Guide

End-to-end instructions for running Juntas Seguras locally, configuring every environment variable, and running the test suite.

## 1. Prerequisites

- **Node.js** v18.x or higher
- **npm** v9.x or higher
- **MongoDB** — either [Docker](https://www.docker.com/) (for the bundled local instance) or a [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- A **Gmail account** with an [app password](https://support.google.com/accounts/answer/185833) (used for email verification and email-based MFA)

## 2. Clone and install

```bash
git clone https://github.com/pgil256/juntas-seguras.git
cd juntas-seguras
npm install
```

## 3. Configure environment variables

Copy the template and fill it in:

```bash
cp .env.example .env.local
```

`.env.local` is git-ignored. The app validates required variables at startup (`lib/validation.ts`) and refuses to boot if any are missing.

### Required (always)

| Variable | What it is | How to get it |
|----------|-----------|---------------|
| `MONGODB_URI` | Mongo connection string | `mongodb://localhost:27017/juntas-app` for local Docker, or the Atlas SRV string |
| `NEXTAUTH_URL` | Base URL of the app | `http://localhost:3000` in dev |
| `NEXTAUTH_SECRET` | Session-signing secret (≥ 32 chars) | `openssl rand -base64 32` |
| `EMAIL_USER` | Gmail address for outbound mail | your Gmail address |
| `EMAIL_PASSWORD` | Gmail **app password** (not your login password) | see [Gmail SMTP](#gmail-smtp-setup) below |

### Required in production only

| Variable | What it is |
|----------|-----------|
| `NEXT_PUBLIC_APP_URL` | Public HTTPS URL of the deployed app |
| `EMAIL_FROM` | From address for outbound email |

### Optional / feature-gated

| Variable(s) | Feature |
|-------------|---------|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth sign-in |
| `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID` | Microsoft OAuth sign-in |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | SMS-based MFA |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe Identity (KYC) — **scaffolded, not yet wired up**. Use **test-mode** keys only. |
| `CRON_SECRET` | Auth for the `/api/cron/*` reminder endpoints |

> **Never commit real secrets.** Only `.env.example` (placeholders) belongs in git.

## 4. Start MongoDB

**Option A — local via Docker (recommended for dev):**

```bash
docker-compose up -d      # starts MongoDB on localhost:27017
```

Set `MONGODB_URI=mongodb://localhost:27017/juntas-app`.

**Option B — MongoDB Atlas:** create a free cluster, add a database user, allow your IP, and paste the SRV connection string into `MONGODB_URI`.

Verify the connection:

```bash
npm run test-db
```

## 5. Seed demo data (optional but recommended)

```bash
npm run seed
```

This creates:
- A **demo user** (`demo@juntas-seguras.app` / `DemoPass123!`) that is pre-verified and MFA-exempt, so you can log in immediately.
- A **pool mid-cycle** owned by the demo user, with several members, a history of confirmed contributions, and one completed payout.

Re-running the seed is idempotent — it clears and recreates the demo data.

## 6. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the demo credentials, or register a fresh account.

## Gmail SMTP setup

Email verification and email-based MFA use Gmail SMTP via Nodemailer.

1. Enable **2-Step Verification** on your Google account.
2. Create an **App Password**: Google Account → Security → App passwords → generate one for "Mail".
3. Put the 16-character app password (spaces are fine) in `EMAIL_PASSWORD`, and your Gmail address in `EMAIL_USER` / `EMAIL_FROM`.

**Troubleshooting**

| Symptom | Fix |
|---------|-----|
| `Invalid login: 535-5.7.8` | You used your account password. Use an **app password** instead. |
| `Missing credentials for "PLAIN"` | `EMAIL_USER` or `EMAIL_PASSWORD` is empty — check `.env.local` is loaded. |
| Emails never arrive | Check spam; confirm the app password is for "Mail"; confirm 2FA is enabled. |
| Works locally, fails on Vercel | Re-add `EMAIL_USER` / `EMAIL_PASSWORD` in the Vercel dashboard (env vars are not inherited from `.env`). |

## OAuth setup (optional)

**Google:** create OAuth credentials in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials), add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI, and set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

**Microsoft:** register an app in [Azure AD](https://portal.azure.com/), add `http://localhost:3000/api/auth/callback/azure-ad` as a redirect URI, and set the three `AZURE_AD_*` variables.

## Testing

The suite is **92 Jest test files + 16 Playwright E2E specs**.

```bash
npm test                       # all Jest tests
npm run test:unit              # unit only
npm run test:integration       # integration (in-memory MongoDB — no external DB needed)
npm run test:security          # security tests
npm run test:coverage          # coverage report
npm run type-check             # tsc --noEmit
npm run lint                   # ESLint

npm run test:e2e               # Playwright (needs a running app + seeded DB)
npm run test:e2e:ui            # interactive Playwright UI
```

Integration and E2E specs that touch the database use `mongodb-memory-server` (Jest) or your local/Atlas Mongo (Playwright). CI runs lint → type-check → unit/integration/security → build on every push and PR; see `.github/workflows/ci.yml`.

## Common issues

| Symptom | Fix |
|---------|-----|
| App won't boot: "Missing required environment variable" | Fill in the required vars in `.env.local` (see step 3). |
| `MongoServerError: bad auth` | Wrong Atlas username/password, or your IP isn't allow-listed. |
| Port 3000 in use | `npm run dev -- -p 3001` or stop the other process. |
| Changes not picked up on Windows | `npm run dev:force` (enables polling). |
