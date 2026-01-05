# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run dev:turbo` | Development with Turbo |
| `npm run dev:force` | Development with polling |
| `npm run build` | Build for production |
| `npm run build:no-lint` | Build without ESLint |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test-db` | Test database connection |
| `npm run clean` | Clean .next directory |
| `npm run pre-deploy-check` | Run pre-deployment validation |
| `npm run vercel-build` | Vercel-specific build command |

## Code Style

- **Imports**: Group imports - React, Next.js, external libraries, internal components/utils
- **Component Structure**: Use named exports for UI components, React.forwardRef for interactive elements
- **Naming**: PascalCase for components, camelCase for variables/functions, types end with 'Type'
- **Types**: Use TypeScript types/interfaces, prefer explicit types over 'any'
- **CSS**: Use Tailwind with compositional utilities via cn() helper from lib/utils
- **Styling**: Use class-variance-authority (cva) for component variants
- **Error Handling**: Use try/catch for async operations, provide meaningful error messages
- **File Structure**: Group related components in subdirectories, follow Next.js App Router conventions
- **Comments**: Add component comments at top of file, document complex logic

## UI Components

- Use shadcn/ui pattern with Radix UI primitives as the base
- Utilize the component composition pattern for reusable UI elements
- Component library located in `components/ui/`

## Architecture Overview

### Framework & Routing
- **Next.js 14.2 App Router**: All pages in `app/` directory
- **API Routes**: Located in `app/api/` following Next.js convention
- **Middleware**: `middleware.ts` handles auth protection, security headers, rate limiting

### Authentication
- **NextAuth.js v4** with JWT strategy
- **MFA**: Mandatory for all users (email-based or TOTP)
- **OAuth Providers**: Google and Microsoft Azure AD
- **Session Management**: JWT tokens with custom callbacks

### Database
- **MongoDB** with Mongoose ODM
- **Connection**: `lib/db/connect.ts`
- **Models** (12 total):
  - `User` - accounts, auth, MFA, identity verification
  - `Pool` - savings pool configuration, members, transactions
  - `Payment` - payment records with Stripe integration
  - `PoolInvitation` - pool member invitations
  - `Message` - pool messaging (legacy)
  - `DirectMessage` - direct messages between members
  - `Discussion` - pool discussion threads
  - `DiscussionMention` - @mentions in discussions
  - `DiscussionReadReceipt` - discussion read status tracking
  - `AuditLog` - comprehensive audit trail
  - `Reminder` - payment reminders
  - `NotificationPreference` - user notification settings

### Payment Processing
- **Stripe** for all payments (no PayPal)
- **Stripe Connect** for payouts to member bank accounts
- **Stripe Identity** for KYC verification
- **Escrow System**: Funds held until all contributions received
- **Manual Payout Methods**: Venmo, PayPal, Zelle, Cash App (user provides details)

### Security Features
- Multi-factor authentication (mandatory)
- Identity verification via Stripe Identity
- Comprehensive audit logging
- Rate limiting on sensitive endpoints
- Security headers (CSP, HSTS, etc.)

## Project Structure

```
my-juntas-app/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes (60+ endpoints)
│   │   ├── auth/                 # Authentication (14 endpoints)
│   │   ├── pools/                # Pool management (20+ endpoints)
│   │   ├── payments/             # Payment processing
│   │   ├── users/                # User management
│   │   ├── user/                 # Current user endpoints
│   │   ├── cron/                 # Cron job endpoints
│   │   ├── notifications/        # Notifications
│   │   ├── identity/             # Identity verification
│   │   ├── security/             # Security & 2FA
│   │   ├── audit/                # Audit logging
│   │   ├── email/                # Email sending
│   │   ├── search/               # Search functionality
│   │   └── support/              # Support tickets
│   ├── analytics/                # Analytics page
│   ├── auth/                     # Auth pages (signin, signup, etc.)
│   ├── create-pool/              # Pool creation page
│   ├── dashboard/                # Dashboard page
│   ├── help/                     # Help & documentation
│   ├── my-pool/                  # User's pool dashboard
│   ├── notifications/            # Notifications page
│   ├── payments/                 # Payments page
│   ├── pools/                    # Pool detail pages
│   ├── profile/                  # User profile page
│   ├── search/                   # Search page
│   ├── settings/                 # User settings
│   └── ...
├── components/                   # React components (90 files)
│   ├── pools/                    # Pool components (17 files)
│   ├── payments/                 # Payment UI (17 files)
│   ├── auth/                     # Authentication UI (3 files)
│   ├── dashboard/                # Dashboard components (4 files)
│   ├── discussions/              # Discussion/thread components (3 files)
│   ├── notifications/            # Notification components (2 files)
│   ├── activity/                 # Activity tracking UI (2 files)
│   ├── analytics/                # Analytics components (1 file)
│   ├── search/                   # Search functionality UI (4 files)
│   ├── security/                 # Security components (5 files)
│   ├── settings/                 # User settings components (2 files)
│   ├── support/                  # Support system UI (2 files)
│   ├── ui/                       # shadcn/ui components (27 files)
│   └── ...
├── lib/                          # Utility libraries
│   ├── db/                       # Database
│   │   ├── models/               # Mongoose models (12 schemas)
│   │   └── connect.ts            # MongoDB connection
│   ├── hooks/                    # React hooks (21 custom hooks)
│   ├── services/                 # Business logic services
│   ├── payments/                 # Payment processing logic (QR codes, deep links)
│   ├── email/                    # Email service utilities
│   ├── jobs/                     # Background job utilities
│   ├── reminders/                # Reminder job logic
│   ├── activity/                 # Activity tracking
│   └── utils/                    # Utility functions
├── types/                        # TypeScript type definitions (10 files)
├── middleware.ts                 # Next.js middleware
└── public/                       # Static assets
```

## Key Files

| File | Purpose |
|------|---------|
| `middleware.ts` | Auth protection, security headers, rate limiting |
| `lib/db/connect.ts` | MongoDB connection singleton |
| `lib/auth.ts` | NextAuth configuration |
| `lib/services/mfa.ts` | MFA code generation and verification |
| `lib/services/notifications.ts` | Notification service |
| `lib/email/send.ts` | Email sending service |
| `lib/validation.ts` | Environment variable validation |
| `lib/payments/qr-code.ts` | Payment QR code generation |
| `lib/payments/deep-links.ts` | Payment app deep links |
| `next.config.js` | Next.js configuration |
| `components.json` | shadcn/ui configuration |

## Custom Hooks

Located in `lib/hooks/` (21 hooks):
- `usePool`, `usePools` - Pool data fetching
- `usePoolContributions` - Contribution management
- `usePoolPayouts` - Payout management
- `usePoolMembers` - Member management
- `usePoolAnalytics` - Pool analytics
- `usePoolInvitations` - Pool invitations
- `useCreatePool` - Pool creation
- `usePaymentMethods`, `usePayments` - Payment handling
- `useIdentityVerification` - KYC verification
- `useEarlyPayout` - Early payout requests
- `useDirectMessages`, `usePoolMessages` - Messaging
- `useUserProfile`, `useUserSettings` - User data
- `useUserId` - Current user ID
- `useSearch` - Search functionality
- `useTickets` - Support tickets
- `useCreateNotification` - Notification creation
- `useDebounce` - Debounce utility

## API Route Patterns

### Authentication Routes (14 endpoints)
```
POST /api/auth/register              # User registration
POST /api/auth/register/resend       # Resend verification email
POST /api/auth/verify                # Email verification
POST /api/auth/verify-mfa            # MFA code verification
POST /api/auth/verify-totp           # TOTP authenticator verification
POST /api/auth/resend-mfa            # Resend MFA code
POST /api/auth/totp-setup            # TOTP setup
POST /api/auth/forgot-password       # Password reset request
POST /api/auth/reset-password        # Password reset
POST /api/auth/send-verification-code # Send verification code
GET  /api/auth/check-token           # Token validation
POST /api/auth/force-refresh         # Force session refresh
POST /api/auth/session-update        # Update session
```

### Pool Routes (20+ endpoints)
```
GET/POST /api/pools                        # List/create pools
GET/PUT/DELETE /api/pools/[id]             # Pool CRUD
GET/POST /api/pools/[id]/members           # Member management
POST /api/pools/[id]/members/[memberId]/reminder  # Send reminder to member
GET/POST /api/pools/[id]/members/messages  # Member direct messages
POST /api/pools/[id]/contributions         # Make contribution
POST /api/pools/[id]/payouts               # Process payout
POST /api/pools/[id]/round-payout          # Round payout
GET/POST /api/pools/[id]/round-payments    # Round payment tracking
GET/POST /api/pools/[id]/round-payments/[memberId]  # Individual member round payment
GET/POST /api/pools/[id]/discussions       # Discussion threads
GET/PUT/DELETE /api/pools/[id]/discussions/[discussionId]  # Individual discussion
POST /api/pools/[id]/discussions/read      # Mark discussions as read
GET /api/pools/[id]/discussions/mentions   # @mentions handling
GET/POST /api/pools/[id]/messages          # Pool messaging (legacy)
POST /api/pools/[id]/invitations           # Send invitations
POST /api/pools/[id]/early-payout          # Early payout requests
GET/POST /api/pools/[id]/admin-payment-methods  # Admin payment methods
GET /api/pools/[id]/payment-links          # Payment links
GET /api/pools/[id]/zelle-qr               # Zelle QR codes
POST /api/pools/invitations/accept         # Accept pool invitation
POST /api/pools/invitations/reject         # Reject pool invitation
GET /api/pools/invitations/validate        # Validate invitation
```

### Payment Routes
```
GET /api/payments/history              # Payment history
GET /api/payments/upcoming             # Upcoming payments
GET/POST/DELETE /api/payments/methods  # Payment methods
POST /api/payments/escrow/release      # Release escrow funds
```

### User Routes
```
GET/PUT /api/users/profile             # Get/update user profile
GET/PUT /api/users/settings            # User settings
GET /api/users/[userId]                # User data
GET /api/users/[userId]/payment-methods # User payment methods
GET/POST /api/user/payout-method       # User payout method
GET /api/user/zelle-qr                 # Zelle QR code
GET /api/user/invitations              # Get pending pool invitations for current user
```

### Other Routes
```
POST /api/cron/reminders               # Send reminders (cron)
POST /api/identity/verification        # Identity verification
GET/POST /api/notifications            # Notifications
GET /api/security/activity-log         # Activity logging
POST /api/security/two-factor          # 2FA management
POST /api/security/two-factor/setup    # 2FA setup
POST /api/security/two-factor/verify   # 2FA verification
POST /api/security/two-factor/resend   # Resend 2FA code
POST /api/email/send                   # Send emails
POST /api/audit/log                    # Audit logging
GET /api/search                        # Search functionality
GET/POST /api/support/tickets          # Support tickets
POST /api/support/contact              # Contact support
```

## Environment Variables

Required:
- `MONGODB_URI` - MongoDB connection string
- `NEXTAUTH_URL` - Application URL
- `NEXTAUTH_SECRET` - NextAuth secret
- `NEXT_PUBLIC_APP_URL` - Public app URL
- `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM` - Gmail SMTP
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe keys

Optional:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID` - Microsoft OAuth
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` - SMS MFA
- `STRIPE_WEBHOOK_SECRET` - Stripe webhooks
- `CRON_SECRET` - Cron job authentication

## Common Tasks

### Adding a New API Route
1. Create file in `app/api/[feature]/route.ts`
2. Export handler functions (GET, POST, PUT, DELETE)
3. Use `getServerSession` for auth
4. Add audit logging for important actions

### Adding a New Database Model
1. Create schema in `lib/db/models/[name].ts`
2. Export model with mongoose.models pattern
3. Add TypeScript types in `types/`
4. Update this documentation

### Adding a New Component
1. Create in appropriate `components/` subdirectory
2. Use shadcn/ui patterns and Radix primitives
3. Use `cn()` for Tailwind class composition
4. Add component comment at top of file

### Adding a New Hook
1. Create in `lib/hooks/use[Name].ts`
2. Handle loading, error, and data states
3. Use SWR or React Query patterns for data fetching
4. Export typed return values

## Testing

Currently no automated tests. When implementing:
- Unit tests: Jest + React Testing Library
- E2E tests: Playwright or Cypress
- Run with: `npm run test`

## Deployment

- **Platform**: Vercel (recommended)
- **Build Command**: `npm run vercel-build`
- **MongoDB**: MongoDB Atlas
- **Environment**: Set all env vars in Vercel dashboard
- See `VERCEL_DEPLOYMENT.md` for details
