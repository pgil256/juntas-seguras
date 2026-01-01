# PayPal Payment Processing Setup Guide

This guide explains how to set up PayPal for payment processing in the Juntas App, including escrow payments (authorization/capture), payouts, and webhooks.

> **TODO**: Set up PayPal webhook after deploying to production. See [Step 5: Set Up Webhooks](#step-5-set-up-webhooks) below. The app will work without webhooks for creating payments, processing escrow, and payouts. Webhooks are needed for real-time payment status updates.

## Prerequisites

- A PayPal Business account (create one at [paypal.com/business](https://www.paypal.com/business))
- Node.js 18+ installed
- The application dependencies installed (`npm install`)

## Step 1: Create a PayPal Developer Account

1. Go to [https://developer.paypal.com/](https://developer.paypal.com/)
2. Log in with your PayPal Business account
3. Access the Developer Dashboard

## Step 2: Create an Application

1. In the Developer Dashboard, go to **Apps & Credentials**
2. Click **Create App**
3. Enter your app name (e.g., "Juntas Seguras")
4. Select **Merchant** as the app type
5. Click **Create App**

## Step 3: Get Your API Credentials

After creating the app, you'll see your credentials:

- **Client ID**: Starts with a long alphanumeric string
- **Secret**: Click "Show" to reveal

> **Important**: Use Sandbox credentials during development. Switch to Live credentials only when deploying to production.

### Your Credentials

Based on your PayPal app setup:
- **App Name**: Juntas Seguras
- **Client ID**: `AexxUgxvB-VN0L0GlPp7ULxGBTAqlXdzZ1b352x9DVM-qus4pbAxTidYCyrECPlAnO_HPeZxxXxAUBzP`
- **Secret Key**: `EKFmeRrlmcq65WAmGGwiwjmn5uHl3kfZo2X1pj8q6ByDr4dHC-N3VU82lMvlABkEeskybJ1jJS_uV7wa`

## Step 4: Configure Environment Variables

Add the following variables to your `.env` file:

```bash
# PayPal Integration for Payments
PAYPAL_CLIENT_ID=AexxUgxvB-VN0L0GlPp7ULxGBTAqlXdzZ1b352x9DVM-qus4pbAxTidYCyrECPlAnO_HPeZxxXxAUBzP
PAYPAL_CLIENT_SECRET=EKFmeRrlmcq65WAmGGwiwjmn5uHl3kfZo2X1pj8q6ByDr4dHC-N3VU82lMvlABkEeskybJ1jJS_uV7wa
PAYPAL_WEBHOOK_ID=your_webhook_id_here
```

## Step 5: Set Up Webhooks

> **Note**: Webhooks are optional but recommended. The app works without them. Set this up after deploying to production.

### For Production

1. **Deploy your app first** - PayPal validates that the webhook URL is accessible
2. In the Developer Dashboard, go to **Webhooks**
3. Click **Add Webhook**
4. Enter your webhook URL: `https://juntas-seguras.vercel.app/api/webhooks/paypal`
5. Select the events you want to listen for (see below)
6. Click **Save**
7. Copy the **Webhook ID** and add it to your environment variables as `PAYPAL_WEBHOOK_ID`

### Webhook Events to Subscribe

Select these events when configuring your webhook:

**Order Events:**
- `CHECKOUT.ORDER.APPROVED`
- `CHECKOUT.ORDER.COMPLETED`

**Payment Events:**
- `PAYMENT.AUTHORIZATION.CREATED`
- `PAYMENT.AUTHORIZATION.VOIDED`
- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.DENIED`
- `PAYMENT.CAPTURE.REFUNDED`

**Payout Events:**
- `PAYMENT.PAYOUTSBATCH.SUCCESS`
- `PAYMENT.PAYOUTSBATCH.DENIED`
- `PAYMENT.PAYOUTS-ITEM.SUCCEEDED`
- `PAYMENT.PAYOUTS-ITEM.FAILED`

### For Local Development

Use a tool like ngrok to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Start your dev server
npm run dev

# In another terminal, expose your local server
ngrok http 3000

# Use the ngrok URL for your webhook: https://xxxx.ngrok.io/api/webhooks/paypal
```

## PayPal Integration Features

### Payment Processing

The application uses PayPal REST API for the following features:

| Feature | Description | PayPal API |
|---------|-------------|------------|
| Orders | Create payment orders | `POST /v2/checkout/orders` |
| Authorization | Authorize payments (escrow) | `POST /v2/checkout/orders/{id}/authorize` |
| Capture | Capture authorized payments | `POST /v2/payments/authorizations/{id}/capture` |
| Void | Cancel authorizations | `POST /v2/payments/authorizations/{id}/void` |
| Payouts | Pay members | `POST /v1/payments/payouts` |
| Refunds | Refund captured payments | `POST /v2/payments/captures/{id}/refund` |

### Escrow Payment Flow

1. **Create Order**: When a member makes a contribution, an Order is created with `intent: AUTHORIZE`
2. **User Approval**: User is redirected to PayPal to approve the payment
3. **Authorization**: After approval, the payment is authorized (funds held for up to 29 days)
4. **Capture**: When the pool admin releases funds, the authorization is captured
5. **Void**: If needed, the authorization can be voided to release holds

### Member Payout Flow

1. **Collect PayPal Email**: Store the member's PayPal email when they join
2. **Create Payout**: When it's their turn, create a Payout batch to their email
3. **Payout Processing**: PayPal sends funds directly to their PayPal account

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payments/process` | POST | Create a new payment order |
| `/api/payments/escrow/release` | POST | Capture authorized payment |
| `/api/payments/methods` | GET/POST/DELETE | Manage payment methods |
| `/api/webhooks/paypal` | POST | Handle PayPal webhook events |
| `/api/pools/[id]/payouts` | POST | Process pool payout to member |

## Testing

### Sandbox Test Accounts

Create sandbox test accounts in the PayPal Developer Dashboard:

1. Go to **Sandbox** > **Accounts**
2. Create Personal and Business test accounts
3. Use these for testing in sandbox mode

### Test Credentials

Use sandbox credentials for testing:
- Sandbox API endpoint: `https://api-m.sandbox.paypal.com`
- Production API endpoint: `https://api-m.paypal.com`

### Test Payment Flow

1. Create an order with your sandbox client credentials
2. Use the approval URL to authorize as a sandbox buyer
3. Capture the authorization to complete the payment

## Security Best Practices

1. **Never expose your secret key** - Only use environment variables, never commit keys
2. **Verify webhook signatures** - Always verify webhook events in production
3. **Use HTTPS** - PayPal requires HTTPS for all production endpoints
4. **Validate amounts** - Always verify payment amounts on the server side
5. **Store minimal data** - Only store necessary transaction IDs, not sensitive payment data

## Going to Production

Before going live:

1. **Complete PayPal Business Account Verification**
   - Verify your business information
   - Complete any required identity verification

2. **Switch to Live Credentials**
   - In the Developer Dashboard, toggle to **Live** mode
   - Create a new Live app or switch existing app to Live
   - Update `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` with Live credentials

3. **Set Up Production Webhook**
   - Create a new webhook pointing to your production URL
   - Update `PAYPAL_WEBHOOK_ID` with the production webhook ID

4. **Enable Payouts**
   - Apply for Payouts API access if not already enabled
   - Ensure your business account is approved for payouts

5. **Test End-to-End**
   - Process a small real payment to verify everything works
   - Test the complete payment and payout flow

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "INVALID_CLIENT" | Check that your Client ID and Secret are correct |
| "Authorization not capturable" | Ensure the authorization hasn't expired (29 days max) |
| "PAYOUTS_NOT_AVAILABLE" | Apply for Payouts API access in your PayPal account |
| "Webhook signature verification failed" | Verify the webhook ID matches your endpoint |
| "RESOURCE_NOT_FOUND" | Check that the order/authorization ID exists |

### Debug Mode

Check PayPal API logs:
1. Go to Developer Dashboard > **Logs**
2. View API requests and responses
3. Check for error details in failed requests

## API Response Codes

| Status | Meaning |
|--------|---------|
| `CREATED` | Order/Authorization created |
| `APPROVED` | User approved the payment |
| `VOIDED` | Authorization was voided |
| `CAPTURED` | Payment was captured |
| `COMPLETED` | Transaction completed |
| `FAILED` | Transaction failed |

## Resources

- [PayPal Developer Documentation](https://developer.paypal.com/docs/)
- [PayPal REST API Reference](https://developer.paypal.com/docs/api/orders/v2/)
- [PayPal Payouts API](https://developer.paypal.com/docs/api/payments.payouts-batch/v1/)
- [PayPal Webhooks Guide](https://developer.paypal.com/docs/api-basics/notifications/webhooks/)
- [PayPal Sandbox Testing](https://developer.paypal.com/docs/api-basics/sandbox/)
