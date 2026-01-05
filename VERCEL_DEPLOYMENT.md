# Vercel Deployment Guide for Juntas Seguras

This guide walks you through deploying the Juntas Seguras application to Vercel.

## Prerequisites

1. A [Vercel account](https://vercel.com/signup) (sign up with GitHub, GitLab, or Email)
2. Your Juntas Seguras code in a Git repository (GitHub, GitLab, or Bitbucket)
3. A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) database
4. A [Stripe account](https://stripe.com) with API keys

---

## Quick Deployment

### Step 1: Connect Repository

1. Log in to [Vercel](https://vercel.com/)
2. Click "Add New..." > "Project"
3. Import your Git repository
4. Select the Juntas Seguras repository

### Step 2: Configure Build Settings

Vercel should auto-detect Next.js. Verify these settings:

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Root Directory | `/` |
| Build Command | `npm run vercel-build` |
| Output Directory | `.next` |
| Install Command | `npm install` |

### Step 3: Add Environment Variables

Click "Environment Variables" and add the following:

#### Required Variables

| Variable | Example Value | Notes |
|----------|---------------|-------|
| `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas connection string |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Your Vercel deployment URL |
| `NEXTAUTH_SECRET` | `<random-string>` | Generate with `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Same as NEXTAUTH_URL |
| `EMAIL_USER` | `your-email@gmail.com` | Gmail address |
| `EMAIL_PASSWORD` | `xxxx xxxx xxxx xxxx` | Gmail App Password |
| `EMAIL_FROM` | `your-email@gmail.com` | Sender address |
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` | Stripe secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` | Stripe publishable key |

#### Optional Variables

| Variable | Example Value | Notes |
|----------|---------------|-------|
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | For webhook verification |
| `GOOGLE_CLIENT_ID` | `...apps.googleusercontent.com` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | Google OAuth |
| `AZURE_AD_CLIENT_ID` | `<guid>` | Microsoft OAuth |
| `AZURE_AD_CLIENT_SECRET` | `<secret>` | Microsoft OAuth |
| `AZURE_AD_TENANT_ID` | `common` | Microsoft OAuth |
| `TWILIO_ACCOUNT_SID` | `AC...` | SMS MFA |
| `TWILIO_AUTH_TOKEN` | `<token>` | SMS MFA |
| `CRON_SECRET` | `<random-string>` | Cron job authentication |

### Step 4: Deploy

1. Click "Deploy"
2. Wait for the build to complete
3. Visit your deployment URL to verify

---

## MongoDB Atlas Configuration

### IP Whitelist

For Vercel deployments, you need to allow Vercel's IP addresses:

1. Go to MongoDB Atlas > Network Access
2. Click "Add IP Address"
3. Choose "Allow Access from Anywhere" (0.0.0.0/0)
   - Or add Vercel's specific IP ranges

**Note**: "Allow Access from Anywhere" is acceptable because MongoDB Atlas also requires username/password authentication.

### Connection String

Ensure your connection string includes:
- Database name: `juntas-app`
- `retryWrites=true`
- `w=majority`

Example:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/juntas-app?retryWrites=true&w=majority
```

---

## Stripe Webhook Configuration

### Create Webhook Endpoint

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter endpoint URL: `https://your-app.vercel.app/api/stripe/webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `setup_intent.succeeded`
   - `identity.verification_session.verified`
   - `identity.verification_session.requires_input`
   - `account.updated`
   - `transfer.created`
   - `transfer.paid`
5. Click "Add endpoint"
6. Copy the "Signing secret" and add as `STRIPE_WEBHOOK_SECRET`

### Test Webhooks Locally

Use Stripe CLI for local testing:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## OAuth Configuration

### Google OAuth

Update redirect URIs in Google Cloud Console:
- `https://your-app.vercel.app/api/auth/callback/google`

### Microsoft OAuth

Update redirect URIs in Azure Portal:
- `https://your-app.vercel.app/api/auth/callback/azure-ad`

---

## Cron Jobs

### Automatic Collection

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/collections/process",
    "schedule": "0 0 * * *"
  }]
}
```

**Note**: Vercel Hobby plan allows 1 cron job per day. Upgrade to Pro for more frequent schedules.

### Cron Authentication

Set `CRON_SECRET` in environment variables. The cron endpoint validates this header.

---

## Troubleshooting

### Build Failures

#### TypeScript/ESLint Errors

If you encounter build errors:

1. The `vercel-build` command should handle most issues
2. Check Vercel build logs for specific errors
3. Fix errors locally and redeploy

#### Memory Issues

For large builds:
1. Go to Project Settings > Functions
2. Increase memory limit if available

### Runtime Errors

#### MongoDB Connection Failed

1. Verify `MONGODB_URI` is correct
2. Check IP whitelist in Atlas
3. Ensure cluster is running
4. Check connection string format

#### Authentication Errors

1. Verify `NEXTAUTH_URL` matches your Vercel URL exactly (including https://)
2. Check `NEXTAUTH_SECRET` is set
3. Verify OAuth callback URLs

#### Email Not Sending

1. Verify Gmail App Password (not regular password)
2. Check 2-Step Verification is enabled
3. See [GMAIL_SMTP_TROUBLESHOOTING.md](GMAIL_SMTP_TROUBLESHOOTING.md)

#### Stripe Errors

1. Verify API keys match environment (test vs live)
2. Check webhook secret
3. Review Stripe dashboard for errors

### Function Timeouts

Default Vercel Hobby timeout is 60 seconds. For longer operations:
1. Upgrade to Pro for 300s timeout
2. Optimize database queries
3. Use background processing

---

## Environment-Specific Deployments

### Production

- Use live Stripe keys (`sk_live_`, `pk_live_`)
- Set `NODE_ENV=production`
- Use production MongoDB cluster

### Preview/Staging

Vercel creates preview deployments for pull requests:
- Use test Stripe keys
- Consider separate MongoDB database
- Set appropriate `NEXTAUTH_URL` for preview

---

## Custom Domain

### Add Domain

1. Go to Project Settings > Domains
2. Add your domain
3. Configure DNS records as instructed

### Update Environment Variables

After adding a custom domain:
1. Update `NEXTAUTH_URL` to new domain
2. Update `NEXT_PUBLIC_APP_URL` to new domain
3. Update OAuth callback URLs
4. Update Stripe webhook URL

---

## Monitoring

### Vercel Analytics

Enable in Project Settings > Analytics for:
- Page views
- Web Vitals
- API usage

### Logs

View deployment and function logs:
1. Go to Deployments
2. Click on a deployment
3. View "Functions" tab for logs

### Alerts

Set up alerts in Vercel for:
- Build failures
- Function errors
- High usage

---

## Rollback

If a deployment causes issues:

1. Go to Deployments
2. Find the last working deployment
3. Click "..." > "Promote to Production"

---

## Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Use different secrets per environment** - Separate test/prod keys
3. **Rotate secrets regularly** - Update `NEXTAUTH_SECRET` periodically
4. **Monitor access** - Review Vercel team access
5. **Enable 2FA** - On Vercel, Stripe, and MongoDB accounts

---

## Cost Considerations

### Vercel Hobby (Free)

- 100GB bandwidth/month
- 60s function timeout
- 1 cron job/day
- Suitable for development/small apps

### Vercel Pro ($20/month)

- 1TB bandwidth/month
- 300s function timeout
- More cron jobs
- Better for production

### External Costs

- **MongoDB Atlas**: Free tier available (512MB)
- **Stripe**: Transaction fees only
- **Gmail SMTP**: Free (500 emails/day limit)

---

## Checklist

### Before Deployment

- [ ] All environment variables prepared
- [ ] MongoDB Atlas configured
- [ ] Stripe account ready
- [ ] Gmail App Password created
- [ ] OAuth apps configured (if using)

### After Deployment

- [ ] Visit deployment URL
- [ ] Test user registration
- [ ] Verify MFA works
- [ ] Test payment flow (with test keys)
- [ ] Verify webhook delivery
- [ ] Check all pages load correctly

### Going Live

- [ ] Switch to live Stripe keys
- [ ] Configure production webhook
- [ ] Update OAuth callback URLs
- [ ] Set up monitoring
- [ ] Configure custom domain (optional)

---

*Last updated: January 2026*
