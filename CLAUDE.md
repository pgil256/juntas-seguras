# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
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
- **Next.js 15 App Router**: All pages in `app/` directory
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
- **Models** (9 total):
  - `User` - accounts, auth, MFA, identity verification
  - `Pool` - savings pool configuration, members, transactions
  - `Payment` - payment records with Stripe integration
  - `PaymentMethod` - tokenized payment methods (never raw card data)
  - `PoolInvitation` - pool member invitations
  - `Message` - pool messaging
  - `DirectMessage` - direct messages between members
  - `AuditLog` - comprehensive audit trail
  - `ScheduledCollection` - automated payment collection

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
│   ├── api/                      # API routes (55+ endpoints)
│   │   ├── auth/                 # Authentication
│   │   ├── pools/                # Pool management
│   │   ├── payments/             # Payment processing
│   │   ├── stripe/               # Stripe integration
│   │   ├── users/                # User management
│   │   ├── notifications/        # Notifications
│   │   ├── identity/             # Identity verification
│   │   ├── audit/                # Audit logging
│   │   └── support/              # Support tickets
│   ├── auth/                     # Auth pages (signin, signup, etc.)
│   ├── dashboard/                # Dashboard page
│   ├── pools/                    # Pool detail pages
│   ├── my-pool/                  # User's pool dashboard
│   ├── help/                     # Help & documentation
│   ├── settings/                 # User settings
│   └── ...
├── components/                   # React components (67 files)
│   ├── pools/                    # Pool components (12 files)
│   ├── payments/                 # Payment UI
│   ├── auth/                     # Authentication UI
│   ├── dashboard/                # Dashboard components
│   ├── notifications/            # Notification components
│   ├── ui/                       # shadcn/ui components
│   └── ...
├── lib/                          # Utility libraries
│   ├── db/                       # Database
│   │   ├── models/               # Mongoose models
│   │   └── connect.ts            # MongoDB connection
│   ├── hooks/                    # React hooks (22 custom hooks)
│   ├── services/                 # Business logic services
│   ├── stripe/                   # Stripe utilities
│   └── utils/                    # Utility functions
├── types/                        # TypeScript type definitions
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
| `lib/stripe/client.ts` | Stripe client initialization |
| `lib/validation.ts` | Environment variable validation |

## Custom Hooks

Located in `lib/hooks/`:
- `usePool`, `usePools` - Pool data fetching
- `usePoolContributions` - Contribution management
- `usePoolPayouts` - Payout management
- `usePoolMembers` - Member management
- `usePaymentMethods`, `usePayments` - Payment handling
- `useIdentityVerification` - KYC verification
- `useAutoCollection` - Automatic collection status
- `useDirectMessages`, `usePoolMessages` - Messaging
- `useUserProfile`, `useUserSettings` - User data
- `useSearch` - Search functionality
- `useTickets` - Support tickets

## API Route Patterns

### Authentication Routes
```
POST /api/auth/register         # User registration
POST /api/auth/verify           # Email verification
POST /api/auth/verify-mfa       # MFA code verification
POST /api/auth/totp-setup       # TOTP authenticator setup
POST /api/auth/forgot-password  # Password reset request
POST /api/auth/reset-password   # Password reset
```

### Pool Routes
```
GET/POST /api/pools             # List/create pools
GET/PUT/DELETE /api/pools/[id]  # Pool CRUD
GET/POST /api/pools/[id]/members      # Member management
POST /api/pools/[id]/contributions    # Make contribution
POST /api/pools/[id]/payouts          # Process payout
GET/POST /api/pools/[id]/messages     # Pool messaging
POST /api/pools/[id]/invitations      # Send invitations
```

### Payment Routes
```
GET /api/payments/history       # Payment history
GET /api/payments/upcoming      # Upcoming payments
GET/POST/DELETE /api/payments/methods  # Payment methods
POST /api/stripe/create-payment-intent # Create payment
POST /api/stripe/payout         # Process payout
POST /api/stripe/webhook        # Stripe webhooks
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
