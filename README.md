# Juntas Seguras - Financial Savings Pool App

A secure, transparent platform for managing community savings pools (juntas).

## Overview

Juntas Seguras allows groups of people to create and manage savings pools. Members contribute a set amount regularly, and each member gets a turn to receive the full pool amount. This app provides transparency, security, and ease of management for these traditional savings systems.

## Features

- Create and manage savings pools with customizable parameters
- Track contributions and payouts
- Member management with invite system
- In-app messaging for pool communication
- Transaction history and analytics
- Mobile-friendly interface
- Secure escrow payments with Stripe integration

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up MongoDB:
   - See [MongoDB Setup Guide](MONGODB_SETUP.md) for detailed instructions
   - Recommended: Use MongoDB Atlas for cloud-hosted database (WSL compatible)
   - Alternative: Run MongoDB locally using Docker

4. Set up environment variables:
   - Create a `.env.local` file with:
   ```
   # For MongoDB Atlas
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/juntas-app
   # Or for local MongoDB
   # MONGODB_URI=mongodb://localhost:27017/juntas-app
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-random-secret-key
   
   # For Stripe escrow payments
   STRIPE_SECRET_KEY=sk_test_your_test_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```
   
5. Test your database connection:
   ```
   npm run test-db
   ```

6. Start the development server:
   ```
   npm run dev
   ```

7. Register a new user account to begin using the application

## Tech Stack

- Next.js 15 with App Router
- React 18
- TypeScript
- MongoDB (with Mongoose)
- NextAuth.js for authentication
- Tailwind CSS for styling
- shadcn/ui components
- Stripe Connect for payment processing and escrow

## Core Features

- User authentication
- Pool creation and management
- Viewing pool details
- Member management
- Pool messaging
- Payment tracking
- Escrow payments with Stripe Connect
  - Secure funds holding
  - Scheduled automatic release
  - Administrator-controlled manual release
- KYC & Identity Verification
  - Mandatory identity verification for all members
  - Document verification via Stripe Identity
  - Fraud prevention and trust building
- Controlled Disbursements
  - Funds released only after all contributions received
  - Pool admin approval required for payouts
  - Transparent payout process with audit trails
- Comprehensive Audit Logging
  - Detailed tracking of all system activity
  - Complete audit trails for financial actions
  - Rich querying for monitoring and compliance

## Development

To run in development mode:

```
npm run dev
```

To build for production:

```
npm run build
npm start
```

## Deployment

To deploy this application to Vercel:

1. Set up MongoDB Atlas (see [MongoDB Setup Guide](MONGODB_SETUP.md))
2. Follow the [Vercel Deployment Guide](VERCEL_DEPLOYMENT.md) for step-by-step instructions
3. Make sure to set environment variables in the Vercel dashboard:
   - `MONGODB_URI` (your MongoDB Atlas connection string)
   - `NEXTAUTH_SECRET` (see .env.production file)
   - `NEXTAUTH_URL` (your Vercel deployment URL)
   - `STRIPE_SECRET_KEY` (your Stripe secret key)
   - `STRIPE_PUBLISHABLE_KEY` (your Stripe publishable key)
   - `STRIPE_WEBHOOK_SECRET` (your Stripe webhook secret)

## License

This project is licensed under the MIT License - see the LICENSE file for details.