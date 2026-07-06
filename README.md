# Juntas Seguras — Community Savings Pool Platform

A secure, transparent platform for managing community savings pools (juntas / ROSCAs). Juntas Seguras digitizes traditional rotating savings and credit associations, adding modern security, automation, and transparency for community-based savings groups.

**[Live demo →](https://juntas-seguras.vercel.app)**

[![CI](https://github.com/pgil256/juntas-seguras/actions/workflows/ci.yml/badge.svg)](https://github.com/pgil256/juntas-seguras/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Tests](https://img.shields.io/badge/tests-Jest%20%2B%20Playwright-C21325?logo=jest&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

## Overview

Juntas Seguras lets groups of people create and manage savings pools where:

- Members contribute a fixed amount on a regular cadence (weekly, bi-weekly, or monthly)
- Each round, one member receives the full pool amount as a payout
- The cycle continues until every member has received a payout
- Trust is reinforced through mandatory MFA, an audit trail, and transparent contribution/payout tracking

## Demo

Try it against the deployed app with the seeded demo account (read/write; please be gentle):

| Field | Value |
|-------|-------|
| URL | https://juntas-seguras.vercel.app |
| Email | `demo@juntas-seguras.app` |
| Password | `DemoPass123!` |

The demo account is pre-verified and MFA-exempt so you can sign in without email/TOTP setup. It comes pre-populated (via `npm run seed`) with a pool mid-cycle: multiple members, a history of confirmed contributions, and a completed payout.

<!-- TODO(screenshots): add dashboard.png, pool-detail.png, and a create-pool.gif to docs/screenshots/ and embed them here. -->
<!--
![Dashboard](docs/screenshots/dashboard.png)
![Pool detail](docs/screenshots/pool-detail.png)
-->

## Key Features

### Pool Management
- Create and customize savings pools (1–20 members)
- Configurable contribution amounts and frequencies
- Member position management and round tracking
- Pool invitations with email notifications
- **Discussion threads** for member communication, with @mentions and read receipts

### Payments (manual tracking)
- **Manual payment collection**: members pay the admin directly via Venmo, PayPal, Zelle, or Cash App — the app tracks and confirms; it does not move funds or store card data
- Admin confirms each contribution and records payouts to recipients
- **Escrow tracking**: contributions are tracked as held until a round is complete
- **Payment reminders** with customizable settings
- Zelle QR code generation and payment deep links (PayPal.me, Venmo)
- *Stripe Identity (KYC) is scaffolded but not yet wired up — see [Roadmap](#roadmap)*

### Security
- **Mandatory Multi-Factor Authentication (MFA)** for all users (email-based by default, or TOTP authenticator app)
- Comprehensive audit logging (`AuditLog` model)
- Security headers (CSP, HSTS, etc.) applied in middleware
- Rate limiting on sensitive endpoints
- Environment-variable validation at startup

### User Experience
- Mobile-responsive design
- In-app notifications
- Dashboard with pool analytics
- Transaction history and reporting
- Support ticket system and in-app help documentation

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Frontend**: React 18, Tailwind CSS, shadcn/ui (Radix primitives)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js v4 (JWT strategy) + Google / Microsoft OAuth
- **Payments**: Manual method tracking (Venmo/PayPal/Zelle/Cash App) with payment deep links & Zelle QR; Stripe Identity KYC *scaffolded*
- **Email**: Nodemailer with Gmail SMTP
- **Testing**: Jest + React Testing Library + mongodb-memory-server; Playwright for E2E
- **Deployment**: Vercel

## Quick Start

### Prerequisites
- Node.js v18.x or higher
- npm v9.x or higher
- MongoDB (local via Docker, or MongoDB Atlas)
- A Gmail account with an app password (for email/MFA delivery)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/pgil256/juntas-seguras.git
   cd juntas-seguras
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your values. See the **[Setup Guide](SETUP_GUIDE.md)** for a walkthrough of every variable.

4. (Optional) Start a local MongoDB and seed demo data:
   ```bash
   docker-compose up -d      # local MongoDB on :27017
   npm run seed              # creates a demo user + a pool mid-cycle
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000). Register a new account, or sign in with the seeded demo credentials above.

## Testing

Juntas Seguras has a comprehensive test suite (92 Jest test files + 16 Playwright E2E specs) organized by type. See the **[Testing section of the Setup Guide](SETUP_GUIDE.md#testing)** for details.

### Test Strategy

| Layer | Tool | Directory | What it covers |
|-------|------|-----------|----------------|
| **Unit** | Jest | `__tests__/unit/` | Business logic, components, hooks, services |
| **Integration** | Jest + `mongodb-memory-server` | `__tests__/integration/` | API routes, database models, transactions |
| **Security** | Jest | `__tests__/security/` | Auth, authorization, input validation, headers |
| **Performance** | Jest | `__tests__/performance/` | API response times, database query timing |
| **E2E** | Playwright | `e2e/` | Full user journeys, cross-browser, mobile, accessibility |

Integration tests use an in-memory MongoDB, so **no external database is required** to run them.

### Running Tests

```bash
npm test                       # All Jest tests
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests (in-memory Mongo)
npm run test:security          # Security tests
npm run test:coverage          # Generate a coverage report
npm run test:e2e               # Playwright E2E (needs a running app + DB)
```

Coverage threshold is currently **30%** (target: 70%), enforced in `jest.config.js`.

### CI

Every push and pull request runs `.github/workflows/ci.yml`: **lint → type-check (`tsc --noEmit`) → unit / integration / security tests → production build**. Playwright E2E runs in a separate, manually-triggered workflow (`.github/workflows/e2e.yml`) because it needs a running app and a seeded database.

## Project Structure

```
juntas-seguras/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/               # 60 API endpoints
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # User dashboard
│   ├── pools/             # Pool detail pages
│   ├── help/              # Help & documentation
│   └── ...
├── components/            # React components (shadcn/ui + feature components)
│   ├── pools/            # Pool-related components
│   ├── payments/         # Payment UI components
│   ├── discussions/      # Discussion/thread components
│   ├── ui/               # shadcn/ui primitives
│   └── ...
├── lib/                   # Utility libraries
│   ├── db/               # Database connection + 12 Mongoose models
│   ├── hooks/            # 21 custom React hooks
│   ├── services/         # Business-logic services (MFA, notifications)
│   ├── payments/         # QR codes, deep links, payment types
│   └── email/            # Email provider + templates
├── scripts/              # Build, deploy, and seed scripts
├── types/                # TypeScript type definitions
├── __tests__/            # Jest unit/integration/security/performance tests
├── e2e/                  # Playwright E2E specs
└── public/               # Static assets
```

See **[ARCHITECTURE.md](ARCHITECTURE.md)** for system diagrams (request flow, auth/MFA, payment/escrow lifecycle).

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Type-check with `tsc --noEmit` |
| `npm test` | Run the Jest test suite |
| `npm run test:coverage` | Run tests with coverage |
| `npm run seed` | Seed demo data (user + pool mid-cycle) |
| `npm run test-db` | Test the database connection |

## Documentation

- **[Setup Guide](SETUP_GUIDE.md)** — end-to-end local setup, environment variables, and testing
- **[Architecture](ARCHITECTURE.md)** — system design, data models, and key flows
- **[CLAUDE.md](CLAUDE.md)** / **[AGENTS.md](AGENTS.md)** — repository guide for AI coding assistants

## Environment Variables

See **[.env.example](.env.example)** for the full list with inline comments.

**Required:** `MONGODB_URI`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `EMAIL_USER`, `EMAIL_PASSWORD`.
**Optional / feature-gated:** Google & Microsoft OAuth, Twilio (SMS MFA), Stripe (Identity KYC — scaffolded), `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, `EMAIL_FROM`.

## Deployment

Deployed on **Vercel** with **MongoDB Atlas**:

1. Push to GitHub and import the repo in [Vercel](https://vercel.com/import).
2. Add every variable from `.env.example` in the Vercel dashboard (use production values; keep secrets out of the repo).
3. Deploy. The default build command is `npm run vercel-build`.

## Database Models

| Model | Purpose |
|-------|---------|
| User | Accounts, authentication, MFA, identity verification |
| Pool | Savings pool configuration, members, transactions |
| Payment | Payment records |
| PoolInvitation | Pool member invitations |
| Message | In-pool messaging |
| DirectMessage | Direct messages between members |
| Discussion | Pool discussion threads |
| DiscussionMention | @mentions in discussions |
| DiscussionReadReceipt | Discussion read-status tracking |
| AuditLog | Comprehensive audit trail |
| Reminder | Payment reminders |
| NotificationPreference | User notification settings |

## Roadmap

- **Stripe Identity (KYC)** — the UI, hook, and API route exist, but `app/api/identity/verification` currently returns `501`; wiring up the Stripe Identity SDK is the next step.
- **SMS / web-push notifications** — the notification service is email + in-app today; Twilio SMS and web push are stubbed in `lib/reminders/sender.ts`.
- **Raise coverage threshold** from 30% toward the 70% target.

## Security

- All authentication endpoints are rate-limited.
- Security headers (CSP, HSTS) are applied to all responses via middleware.
- MFA is enforced for authenticated routes.
- Environment variables are validated at startup (`lib/validation.ts`).
- The app tracks manual payments and **never stores card data or moves funds**.

Found a security issue? Please open a private report rather than a public issue.

## License

Licensed under the [MIT License](LICENSE).
