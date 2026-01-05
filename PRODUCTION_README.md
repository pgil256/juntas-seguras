# Juntas Seguras Production Guide

This guide outlines the production deployment configuration for the Juntas Seguras application.

## Production Status

**Current Deployment**: https://juntas-seguras.vercel.app

**Platform**: Vercel
**Database**: MongoDB Atlas
**Payment Processor**: Stripe

---

## Implemented Features

### Security Enhancements

| Feature | Status | Description |
|---------|--------|-------------|
| MFA Enforcement | Done | Mandatory multi-factor authentication for all users |
| Security Headers | Done | CSP, HSTS, X-Frame-Options, X-Content-Type-Options |
| Rate Limiting | Done | Protection on authentication and sensitive endpoints |
| Identity Verification | Done | Stripe Identity KYC for pool members |
| Audit Logging | Done | Comprehensive activity tracking |
| Session Management | Done | JWT with secure cookie settings |

### Production Configuration

| Feature | Status | Description |
|---------|--------|-------------|
| Environment Validation | Done | Validates required env vars at startup |
| TypeScript Checking | Configured | TypeScript errors checked in builds |
| ESLint Integration | Configured | Linting available during builds |
| Image Optimization | Done | Next.js image optimization configured |
| Error Handling | Partial | Basic error handling, boundaries needed |

### Payment Processing

| Feature | Status | Description |
|---------|--------|-------------|
| Stripe Payments | Done | Contribution collection via Stripe |
| Stripe Connect | Done | Payouts to member bank accounts |
| Stripe Identity | Done | KYC verification |
| Manual Payout Methods | Done | Venmo, PayPal, Zelle, Cash App support |
| Zelle QR Codes | Done | Generate Zelle QR codes for easy payments |
| Webhook Handling | Done | Payment status updates |
| Automatic Collections | Done | Scheduled contribution collection |
| Payment Reminders | Done | Automated reminder emails |

### Communication Features

| Feature | Status | Description |
|---------|--------|-------------|
| Pool Discussions | Done | Threaded discussions with @mentions |
| Read Receipts | Done | Track discussion read status |
| Direct Messages | Done | Member-to-member messaging |
| Legacy Messaging | Done | In-pool message system |
| Search | Done | Search across pools and users |

---

## Deployment Configuration

### Build Commands

```bash
# Standard build
npm run build

# Vercel build (used in production)
npm run vercel-build

# Pre-deployment validation
npm run pre-deploy-check
```

### Environment Variables

All environment variables must be set in the Vercel dashboard:

#### Required

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `NEXTAUTH_URL` | Production URL (https://juntas-seguras.vercel.app) |
| `NEXTAUTH_SECRET` | Secure random string for session encryption |
| `NEXT_PUBLIC_APP_URL` | Public-facing application URL |
| `EMAIL_USER` | Gmail address for sending emails |
| `EMAIL_PASSWORD` | Gmail App Password |
| `EMAIL_FROM` | Email sender address |
| `STRIPE_SECRET_KEY` | Stripe secret key (sk_live_...) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (pk_live_...) |

#### Optional

| Variable | Description |
|----------|-------------|
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `AZURE_AD_CLIENT_ID` | Microsoft OAuth client ID |
| `AZURE_AD_CLIENT_SECRET` | Microsoft OAuth client secret |
| `AZURE_AD_TENANT_ID` | Microsoft tenant ID |
| `TWILIO_ACCOUNT_SID` | Twilio account SID for SMS |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `CRON_SECRET` | Secret for cron job authentication |

---

## Production Checklist

### Before Deployment

- [ ] Generate new `NEXTAUTH_SECRET` for production
- [ ] Switch Stripe keys from test to live mode
- [ ] Update OAuth callback URLs to production domain
- [ ] Configure Stripe webhook with production URL
- [ ] Set up MongoDB Atlas with proper access controls
- [ ] Configure network access (IP whitelist or allow all)
- [ ] Remove test data from database
- [ ] Update all environment variables in Vercel

### After Deployment

- [ ] Verify authentication flow works
- [ ] Test MFA code delivery
- [ ] Verify Stripe payment processing
- [ ] Test webhook delivery
- [ ] Check identity verification flow
- [ ] Monitor error logs
- [ ] Set up uptime monitoring

---

## Monitoring & Logging

### Current State

- **Audit Logging**: Comprehensive logging for all user actions
- **Console Logging**: Available in Vercel deployment logs
- **Error Tracking**: Not yet integrated (Sentry recommended)

### Recommended Additions

1. **Error Monitoring**
   - Integrate Sentry for error tracking
   - Set up alerts for critical errors

2. **Performance Monitoring**
   - Vercel Analytics (built-in)
   - Consider New Relic or DataDog

3. **Uptime Monitoring**
   - BetterUptime, Pingdom, or UptimeRobot
   - Monitor `/api/health` endpoint

4. **Database Monitoring**
   - MongoDB Atlas monitoring dashboard
   - Set up alerts for connection issues

---

## Security Measures

### Implemented

| Measure | Description |
|---------|-------------|
| HTTPS Only | Enforced by Vercel |
| Security Headers | CSP, HSTS, X-Frame-Options |
| MFA Required | All users must complete MFA setup |
| Rate Limiting | Authentication endpoints protected |
| JWT Sessions | Secure, httpOnly cookies |
| Input Validation | Zod schemas for API validation |
| KYC Verification | Stripe Identity for members |

### Recommended Additions

| Measure | Priority | Description |
|---------|----------|-------------|
| CSRF Protection | Medium | Add CSRF tokens to forms |
| Brute Force Protection | Medium | Account lockout after failed attempts |
| Security Scanning | Low | Regular dependency scanning |
| Penetration Testing | Low | Professional security audit |

---

## Cron Jobs

### Automatic Collection & Reminders

The application uses Vercel Cron for:
- **Automatic Collection**: Daily processing of scheduled contribution collections
- **Payment Reminders**: Automated reminder emails before due dates

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/collections/process` | Daily at midnight UTC | Process scheduled collections |
| `/api/cron/reminders` | Daily at 8 AM UTC | Send payment reminder emails |

### Configuration

In `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/collections/process",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/reminders",
      "schedule": "0 8 * * *"
    }
  ]
}
```

**Note**: Vercel Hobby plan limits cron to once per day. Upgrade for more frequent schedules.

---

## Scaling Considerations

### Current Limits

- **Vercel Hobby**: 60s function timeout, 1 cron/day
- **MongoDB Atlas Free**: 512MB storage, shared cluster

### When to Scale

- **User Growth**: Consider dedicated MongoDB cluster
- **Transaction Volume**: Upgrade Vercel plan for longer timeouts
- **Collection Frequency**: Upgrade for hourly/minute-level crons

### Scaling Options

1. **Vercel Pro/Enterprise**
   - Longer function timeouts
   - More frequent cron jobs
   - Better analytics

2. **MongoDB Atlas M10+**
   - Dedicated cluster
   - Better performance
   - Auto-scaling

3. **Redis/Caching**
   - Vercel KV or Redis
   - Session caching
   - Rate limit storage

---

## Backup & Recovery

### Database Backups

MongoDB Atlas provides:
- Continuous backups (paid tier)
- Point-in-time recovery (paid tier)
- Snapshot backups (all tiers)

### Recommended Backup Strategy

1. Enable MongoDB Atlas backup for production cluster
2. Set retention period to 7-30 days
3. Test restore procedure periodically
4. Export critical data weekly to separate storage

---

## Troubleshooting Production Issues

### Common Issues

#### Email Delivery Problems
- Check Gmail App Password is correct
- Verify account isn't locked by Google
- Review sending limits (500/day for free Gmail)
- Consider transactional email service for scale

#### Stripe Webhook Failures
- Verify `STRIPE_WEBHOOK_SECRET` matches dashboard
- Check webhook endpoint is accessible
- Review Stripe dashboard for failed events
- Use Stripe CLI for local testing

#### MongoDB Connection Issues
- Verify IP whitelist includes Vercel IPs
- Check connection string format
- Monitor Atlas dashboard for issues
- Consider connection pooling

#### Authentication Issues
- Verify `NEXTAUTH_URL` matches production URL exactly
- Check `NEXTAUTH_SECRET` is set correctly
- Clear cookies and retry
- Check OAuth callback URLs

### Debug Steps

1. Check Vercel deployment logs
2. Review MongoDB Atlas logs
3. Check Stripe dashboard for events
4. Test API endpoints directly
5. Review audit logs in database

---

## Support & Maintenance

### Regular Maintenance Tasks

- [ ] Review audit logs for suspicious activity
- [ ] Monitor database size and performance
- [ ] Check Stripe balance and payouts
- [ ] Update dependencies (security patches)
- [ ] Review error logs and fix issues

### Emergency Contacts

- **Vercel Status**: https://vercel-status.com
- **MongoDB Atlas Status**: https://status.mongodb.com
- **Stripe Status**: https://status.stripe.com

---

*Last updated: January 2026*
