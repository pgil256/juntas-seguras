# Juntas Seguras - Complete Setup Guide

This guide covers all the steps necessary to set up and deploy the Juntas Seguras application, including authentication, payments, and notification services.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Configuration (MongoDB)](#database-configuration-mongodb)
4. [Authentication Setup](#authentication-setup)
   - [NextAuth Configuration](#nextauth-configuration)
   - [Google OAuth](#google-oauth)
   - [Microsoft OAuth](#microsoft-oauth)
5. [Email Service Setup (Gmail)](#email-service-setup-gmail)
6. [SMS Service Setup (Twilio)](#sms-service-setup-twilio-optional)
7. [Payment Processing (Stripe)](#payment-processing-stripe)
8. [Running the Application](#running-the-application)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** v18.x or higher
- **npm** v9.x or higher
- **MongoDB** (local installation or MongoDB Atlas account)
- **Git** for version control

---

## Environment Setup

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd my-juntas-app

# Install dependencies
npm install
```

### Step 2: Create Environment File

Copy the example environment file:

```bash
cp .env.example .env.local
```

### Step 3: Generate NextAuth Secret

Generate a secure secret for NextAuth:

```bash
openssl rand -base64 32
```

Copy the output and add it to your `.env.local` file as `NEXTAUTH_SECRET`.

---

## Database Configuration (MongoDB)

### Option A: Local MongoDB (Development)

1. **Install MongoDB Community Edition**
   - Download from: https://www.mongodb.com/try/download/community
   - Follow installation instructions for your OS

2. **Start MongoDB Service**
   ```bash
   # macOS/Linux
   mongod --dbpath /data/db

   # Windows
   net start MongoDB
   ```

3. **Configure Environment Variable**
   ```env
   MONGODB_URI=mongodb://localhost:27017/juntas-app
   ```

### Option B: MongoDB Atlas (Production)

1. **Create MongoDB Atlas Account**
   - Go to: https://www.mongodb.com/cloud/atlas
   - Sign up for a free account

2. **Create a Cluster**
   - Click "Build a Database"
   - Choose the free tier (M0 Sandbox)
   - Select your preferred region
   - Click "Create Cluster"

3. **Configure Database Access**
   - Go to "Database Access" in the sidebar
   - Click "Add New Database User"
   - Create a username and password (save these!)
   - Set permissions to "Read and write to any database"

4. **Configure Network Access**
   - Go to "Network Access" in the sidebar
   - Click "Add IP Address"
   - For development: Add your current IP
   - For production: Add your server's IP or use "Allow Access from Anywhere" (0.0.0.0/0)

5. **Get Connection String**
   - Go to "Database" in the sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

6. **Configure Environment Variable**
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/juntas-app?retryWrites=true&w=majority
   ```
   Replace `<username>` and `<password>` with your database user credentials.

---

## Authentication Setup

### NextAuth Configuration

1. **Set Base URL**
   ```env
   NEXTAUTH_URL=http://localhost:3000
   ```
   For production, use your actual domain (e.g., `https://yourdomain.com`)

2. **Set Secret Key**
   ```env
   NEXTAUTH_SECRET=<your-generated-secret>
   ```

---

### Google OAuth

1. **Create Google Cloud Project**
   - Go to: https://console.cloud.google.com/
   - Click "Select a project" > "New Project"
   - Enter a project name and click "Create"

2. **Enable OAuth Consent Screen**
   - Go to "APIs & Services" > "OAuth consent screen"
   - Select "External" user type
   - Fill in the required fields:
     - App name: "Juntas Seguras"
     - User support email: Your email
     - Developer contact email: Your email
   - Click "Save and Continue"
   - Add scopes: `email`, `profile`, `openid`
   - Add test users if in testing mode

3. **Create OAuth Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application"
   - Add authorized redirect URIs:
     - Development: `http://localhost:3000/api/auth/callback/google`
     - Production: `https://yourdomain.com/api/auth/callback/google`
   - Click "Create"

4. **Copy Credentials**
   - Copy the Client ID and Client Secret

5. **Configure Environment Variables**
   ```env
   GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=<your-client-secret>
   ```

---

### Microsoft OAuth

1. **Create Azure AD Application**
   - Go to: https://portal.azure.com/
   - Navigate to "Azure Active Directory" > "App registrations"
   - Click "New registration"

2. **Register Application**
   - Name: "Juntas Seguras"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI:
     - Platform: Web
     - URI: `http://localhost:3000/api/auth/callback/azure-ad`
   - Click "Register"

3. **Create Client Secret**
   - Go to "Certificates & secrets"
   - Click "New client secret"
   - Add a description and select expiration
   - Click "Add"
   - **Copy the secret value immediately** (it won't be shown again!)

4. **Get Application IDs**
   - Go to "Overview"
   - Copy "Application (client) ID"
   - Copy "Directory (tenant) ID" (or use "common" for multi-tenant)

5. **Configure API Permissions**
   - Go to "API permissions"
   - Click "Add a permission"
   - Select "Microsoft Graph" > "Delegated permissions"
   - Add: `email`, `openid`, `profile`, `User.Read`
   - Click "Grant admin consent" if you have admin access

6. **Configure Environment Variables**
   ```env
   AZURE_AD_CLIENT_ID=<your-application-client-id>
   AZURE_AD_CLIENT_SECRET=<your-client-secret>
   AZURE_AD_TENANT_ID=common
   ```
   Use `common` for multi-tenant, or your specific tenant ID for single-tenant.

---

## Email Service Setup (Gmail)

Email is required for MFA codes, password resets, and notifications.

### Step 1: Create Gmail App Password

1. **Enable 2-Step Verification**
   - Go to: https://myaccount.google.com/security
   - Enable "2-Step Verification" if not already enabled

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other (Custom name)"
   - Enter: "Juntas Seguras"
   - Click "Generate"
   - **Copy the 16-character password** (spaces are optional)

### Step 2: Configure Environment Variables

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM=your-email@gmail.com
```

### Alternative: Other SMTP Providers

You can modify `lib/services/mfa.ts` to use other providers:

- **SendGrid**: https://sendgrid.com/
- **Mailgun**: https://www.mailgun.com/
- **Amazon SES**: https://aws.amazon.com/ses/

---

## SMS Service Setup (Twilio) - Optional

SMS-based MFA is optional. If not configured, the app will use email for 2FA.

### Step 1: Create Twilio Account

1. Go to: https://www.twilio.com/try-twilio
2. Sign up for a free account
3. Verify your phone number

### Step 2: Get a Phone Number

1. Go to: https://console.twilio.com/
2. Navigate to "Phone Numbers" > "Manage" > "Buy a number"
3. Search for a number with SMS capability
4. Purchase the number (free trial includes credits)

### Step 3: Get API Credentials

1. Go to Twilio Console dashboard
2. Find your "Account SID" and "Auth Token"
3. Copy both values

### Step 4: Configure Environment Variables

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

---

## Payment Processing (Stripe)

Stripe is required for pool contributions, escrow payments, and identity verification.

### Step 1: Create Stripe Account

1. Go to: https://dashboard.stripe.com/register
2. Sign up for an account
3. Complete business verification for production use

### Step 2: Get API Keys

1. Go to: https://dashboard.stripe.com/apikeys
2. Copy "Publishable key" (starts with `pk_test_` or `pk_live_`)
3. Copy "Secret key" (starts with `sk_test_` or `sk_live_`)

### Step 3: Set Up Webhooks

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `identity.verification_session.verified`
   - `identity.verification_session.requires_input`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)

### Step 4: Enable Stripe Connect (for payouts)

1. Go to: https://dashboard.stripe.com/settings/connect
2. Enable Stripe Connect
3. Configure platform settings

### Step 5: Enable Identity Verification

1. Go to: https://dashboard.stripe.com/settings/identity
2. Enable Identity
3. Configure verification settings

### Step 6: Configure Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Running the Application

### Development Mode

```bash
# Start the development server
npm run dev
```

The app will be available at: http://localhost:3000

### Test Database Connection

```bash
npm run test-db
```

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm run start
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Generate new `NEXTAUTH_SECRET` for production
- [ ] Update `NEXTAUTH_URL` to production domain
- [ ] Switch Stripe keys from `test` to `live`
- [ ] Configure production MongoDB Atlas cluster
- [ ] Set up SSL/HTTPS
- [ ] Update OAuth callback URLs to production domain
- [ ] Configure webhook endpoints with production URLs
- [ ] Remove any test users/data

### Environment Variables Summary

```env
# Database
MONGODB_URI=mongodb+srv://...

# NextAuth
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<secure-random-string>

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Microsoft OAuth
AZURE_AD_CLIENT_ID=...
AZURE_AD_CLIENT_SECRET=...
AZURE_AD_TENANT_ID=common

# Email
EMAIL_USER=...
EMAIL_PASSWORD=...
EMAIL_FROM=...

# Twilio (Optional)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Environment
NODE_ENV=production
```

### Deployment Platforms

#### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel: https://vercel.com/import
3. Add environment variables in Vercel dashboard
4. Deploy

#### Other Platforms

- **Railway**: https://railway.app/
- **Render**: https://render.com/
- **DigitalOcean App Platform**: https://www.digitalocean.com/products/app-platform
- **AWS Amplify**: https://aws.amazon.com/amplify/

---

## Troubleshooting

### Common Issues

#### MongoDB Connection Failed
```
Error: MongoNetworkError: failed to connect
```
**Solution**: Check that MongoDB is running and the connection string is correct. For Atlas, verify IP whitelist settings.

#### OAuth Callback Error
```
Error: OAuthCallbackError
```
**Solution**: Verify that callback URLs match exactly in the OAuth provider console and your app.

#### Email Not Sending
```
Error: Invalid login
```
**Solution**: Ensure you're using an App Password, not your regular Gmail password. Check that 2-Step Verification is enabled.

#### Stripe Webhook Signature Invalid
```
Error: Webhook signature verification failed
```
**Solution**: Ensure `STRIPE_WEBHOOK_SECRET` matches the signing secret from Stripe dashboard.

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

In development mode:
- MFA codes are logged to console
- Detailed error messages are shown
- Email/SMS can be skipped

### Getting Help

- Check the documentation in `/app/help/documentation/`
- Review API routes in `/app/api/`
- Check component structure in `/components/`

---

## Service Status Table

| Service | Required | Purpose |
|---------|----------|---------|
| MongoDB | Yes | Database storage |
| NextAuth | Yes | Authentication framework |
| Gmail SMTP | Yes* | Email notifications & MFA |
| Google OAuth | No | Social login option |
| Microsoft OAuth | No | Social login option |
| Twilio | No | SMS-based MFA |
| Stripe | No** | Payments & identity verification |

*Required if using email-based MFA (default)
**Required for payment features

---

## Quick Start Summary

1. Install dependencies: `npm install`
2. Copy environment file: `cp .env.example .env.local`
3. Configure MongoDB connection
4. Generate and set `NEXTAUTH_SECRET`
5. Configure email credentials (Gmail App Password)
6. (Optional) Set up OAuth providers
7. (Optional) Set up Stripe for payments
8. Run the app: `npm run dev`

---

*Last updated: December 2024*
