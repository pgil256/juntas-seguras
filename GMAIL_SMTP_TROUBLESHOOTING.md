# Gmail SMTP Troubleshooting Guide

This guide helps diagnose and fix issues with Gmail SMTP email delivery for `juntassegurasservice@gmail.com`.

## Quick Checklist

- [ ] 2-Step Verification enabled on Gmail account
- [ ] App Password generated (not regular Gmail password)
- [ ] Correct environment variables set
- [ ] Account not locked/suspended by Google

---

## Step 1: Verify Google Account Settings

### Enable 2-Step Verification (Required)

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Sign in as `juntassegurasservice@gmail.com`
3. Under "How you sign in to Google", click **2-Step Verification**
4. Follow the prompts to enable it

**Note:** App Passwords only work when 2-Step Verification is enabled.

### Generate an App Password

1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Sign in if prompted
3. Select app: **Mail**
4. Select device: **Other (Custom name)** → Enter "Juntas App"
5. Click **Generate**
6. Copy the 16-character password (spaces don't matter)

**Important:** This is the password to use in `EMAIL_PASSWORD`, NOT your regular Gmail password.

---

## Step 2: Check Environment Variables

Verify your `.env` file has these values:

```env
EMAIL_USER=juntassegurasservice@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # App Password from Step 1
EMAIL_FROM=juntassegurasservice@gmail.com
```

### Common Mistakes

| Issue | Solution |
|-------|----------|
| Using regular password | Generate and use an App Password |
| Extra spaces in password | App passwords can have spaces, but verify exact format |
| Wrong email in `EMAIL_USER` | Must match the Google account with the App Password |
| Missing `EMAIL_FROM` | Some routes may need this; set it to the same email |

---

## Step 3: Test the Connection

### Quick Test Script

Create a file `scripts/test-email.js`:

```javascript
const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  console.log('Testing email configuration...');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '[SET]' : '[NOT SET]');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  try {
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection successful!');

    // Send test email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: 'Test Email from Juntas App',
      text: 'If you receive this, SMTP is working correctly!',
    });

    console.log('✅ Test email sent:', info.messageId);
  } catch (error) {
    console.error('❌ Email test failed:', error.message);

    if (error.code === 'EAUTH') {
      console.log('\n🔧 Authentication failed. Possible causes:');
      console.log('   - Wrong App Password');
      console.log('   - 2-Step Verification not enabled');
      console.log('   - Account security issue');
    }
  }
}

testEmail();
```

Run with:
```bash
node scripts/test-email.js
```

---

## Step 4: Common Error Messages

### `Error: Invalid login: 535-5.7.8 Username and Password not accepted`

**Cause:** Authentication failed.

**Solutions:**
1. Regenerate the App Password
2. Ensure 2-Step Verification is enabled
3. Check for typos in email/password

### `Error: connect ETIMEDOUT` or `ECONNREFUSED`

**Cause:** Network/firewall blocking SMTP.

**Solutions:**
1. Check internet connection
2. Try from a different network
3. Verify firewall isn't blocking port 465/587

### `Error: self signed certificate in certificate chain`

**Cause:** SSL/TLS issue.

**Solution:** Add to transporter config:
```javascript
tls: {
  rejectUnauthorized: false
}
```

### `Error: Account suspended` or rate limit errors

**Cause:** Google has flagged or limited the account.

**Solutions:**
1. Log into Gmail and check for security alerts
2. Complete any security verification
3. Wait 24-48 hours if rate limited
4. Check [Google Account Security Checkup](https://myaccount.google.com/security-checkup)

---

## Step 5: Check Gmail Account Status

1. **Log into Gmail directly:** Go to [Gmail](https://mail.google.com) and sign in as `juntassegurasservice@gmail.com`
2. **Check for security alerts:** Look for any "suspicious activity" notifications
3. **Review recent activity:** Go to [Security Activity](https://myaccount.google.com/notifications)
4. **Unlock if necessary:** If blocked, follow Google's prompts to verify ownership

---

## Step 6: Gmail Sending Limits

Gmail has daily sending limits:

| Account Type | Daily Limit |
|--------------|-------------|
| Free Gmail | 500 emails/day |
| Google Workspace | 2,000 emails/day |

If you're hitting limits, consider:
- Using a transactional email service (SendGrid, Mailgun, AWS SES)
- Upgrading to Google Workspace

---

## Step 7: Alternative - Use Gmail with OAuth2 (More Secure)

If App Passwords continue to fail, you can use OAuth2 authentication:

```javascript
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GMAIL_REFRESH_TOKEN,
  },
});
```

This requires additional setup in Google Cloud Console but is more reliable for production.

---

## Production Recommendation

For production applications, consider switching to a dedicated transactional email service:

| Service | Free Tier | Notes |
|---------|-----------|-------|
| [SendGrid](https://sendgrid.com) | 100 emails/day | Popular, good documentation |
| [Mailgun](https://mailgun.com) | 5,000 emails/month (3 months) | Developer-friendly |
| [AWS SES](https://aws.amazon.com/ses/) | 62,000 emails/month (from EC2) | Very cheap, scalable |
| [Resend](https://resend.com) | 3,000 emails/month | Modern API, easy setup |

These services offer better deliverability, tracking, and won't have Gmail's authentication issues.

---

## Summary Checklist

1. ✅ 2-Step Verification is ON
2. ✅ App Password is generated and correctly set in `.env`
3. ✅ `EMAIL_USER` matches the Gmail account
4. ✅ No security holds on the Google account
5. ✅ Not hitting daily sending limits
6. ✅ Test script confirms connection works
