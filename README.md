# Juntas Seguras - Community Savings Pool Platform

A secure, transparent platform for managing community savings pools (juntas/ROSCAs). Juntas Seguras digitizes traditional rotating savings and credit associations, providing modern security, automation, and transparency for community-based savings groups.

## Overview

Juntas Seguras allows groups of people to create and manage savings pools where:
- Members contribute a fixed amount regularly (weekly, bi-weekly, or monthly)
- Each round, one member receives the full pool amount as a payout
- The cycle continues until every member has received a payout
- Trust is built through identity verification, MFA, and transparent tracking

## Key Features

### Pool Management
- Create and customize savings pools (1-20 members)
- Configurable contribution amounts and frequencies
- Member position management and round tracking
- Pool invitations with email notifications
- In-pool messaging for member communication

### Payment Processing
- **Stripe Integration** for secure contributions and payouts
- Stripe Connect for direct payouts to member bank accounts
- Escrow system holds funds until all contributions received
- Automatic contribution collection with configurable schedules
- **Manual Payout Methods**: Venmo, PayPal, Zelle, Cash App support

### Security
- **Mandatory Multi-Factor Authentication (MFA)** for all users
  - Email-based MFA (default)
  - TOTP authenticator app support
- **Identity Verification** via Stripe Identity (KYC)
- Comprehensive audit logging
- Session management with security headers
- Rate limiting on sensitive endpoints

### User Experience
- Mobile-responsive design
- Real-time notifications
- Dashboard with pool analytics
- Transaction history and reporting
- Support ticket system
- In-app help documentation

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Frontend**: React 18
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js v4 with JWT strategy
- **Payments**: Stripe (Connect, Identity)
- **Email**: Nodemailer with Gmail SMTP
- **Deployment**: Vercel

## Quick Start

### Prerequisites
- Node.js v18.x or higher
- npm v9.x or higher
- MongoDB (local or MongoDB Atlas)
- Stripe account (for payments)
- Gmail account (for email notifications)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd my-juntas-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your configuration (see [Setup Guide](SETUP_GUIDE.md))

4. Test your database connection:
   ```bash
   npm run test-db
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) and register a new account

## Project Structure

```
my-juntas-app/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/               # API endpoints (55+ routes)
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # User dashboard
│   ├── pools/             # Pool detail pages
│   ├── help/              # Help & documentation
│   └── ...
├── components/            # React components (67 files)
│   ├── pools/            # Pool-related components
│   ├── payments/         # Payment UI components
│   ├── ui/               # shadcn/ui components
│   └── ...
├── lib/                   # Utility libraries
│   ├── db/               # Database models (9 Mongoose schemas)
│   ├── hooks/            # Custom React hooks (22 hooks)
│   ├── services/         # Business logic services
│   └── stripe/           # Stripe utilities
├── types/                # TypeScript type definitions
└── public/               # Static assets
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test-db` | Test database connection |
| `npm run clean` | Clean .next directory |
| `npm run pre-deploy-check` | Run pre-deployment validation |

## Documentation

- [Setup Guide](SETUP_GUIDE.md) - Complete setup instructions
- [Production Guide](PRODUCTION_README.md) - Production deployment preparation
- [Vercel Deployment](VERCEL_DEPLOYMENT.md) - Vercel deployment instructions
- [Production Checklist](PRODUCTION_CHECKLIST.md) - Production readiness checklist
- [Gmail SMTP Troubleshooting](GMAIL_SMTP_TROUBLESHOOTING.md) - Email configuration help

## Environment Variables

See [.env.example](.env.example) for all required and optional environment variables.

### Required Variables
- `MONGODB_URI` - MongoDB connection string
- `NEXTAUTH_URL` - Application URL
- `NEXTAUTH_SECRET` - NextAuth secret key
- `EMAIL_USER` / `EMAIL_PASSWORD` - Gmail SMTP credentials
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe API keys

### Optional Variables
- Google OAuth credentials
- Microsoft Azure AD credentials
- Twilio SMS credentials
- Stripe webhook secret

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com/import)
3. Add environment variables in Vercel dashboard
4. Deploy

See [Vercel Deployment Guide](VERCEL_DEPLOYMENT.md) for detailed instructions.

### Other Platforms

The application can also be deployed to:
- Railway
- Render
- DigitalOcean App Platform
- AWS Amplify

## Database Models

| Model | Purpose |
|-------|---------|
| User | User accounts, authentication, MFA, identity verification |
| Pool | Savings pool configuration, members, transactions |
| Payment | Payment records with Stripe integration |
| PaymentMethod | Tokenized payment methods |
| PoolInvitation | Pool member invitations |
| Message | Pool messaging |
| DirectMessage | Direct messages between members |
| AuditLog | Comprehensive audit trail |
| ScheduledCollection | Automated payment collection |

## API Routes

The application includes 55+ API endpoints organized by feature:
- `/api/auth/*` - Authentication (register, verify, MFA, password reset)
- `/api/pools/*` - Pool management (CRUD, members, messages)
- `/api/payments/*` - Payment processing (history, methods, escrow)
- `/api/stripe/*` - Stripe integration (payments, Connect, webhooks)
- `/api/users/*` - User management (profile, settings)
- `/api/notifications/*` - Notification system
- `/api/identity/*` - Identity verification
- `/api/audit/*` - Audit logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting: `npm run lint`
5. Submit a pull request

## Security

- All authentication endpoints have rate limiting
- Security headers are applied to all responses
- MFA is enforced for authenticated routes
- Environment variables are validated at startup
- Payments are processed through PCI-compliant Stripe

## License

This project is licensed under the MIT License.

---

*Last updated: January 2026*
