/**
 * SMTP Email Test Script
 * Run with: node scripts/test-smtp.js
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

// ANSI color codes for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'blue');
  console.log('='.repeat(60));
}

async function testSMTP() {
  logSection('SMTP EMAIL DIAGNOSTIC TEST');

  // Step 1: Check environment variables
  logSection('Step 1: Checking Environment Variables');

  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  const emailFrom = process.env.EMAIL_FROM;

  console.log(`EMAIL_USER: ${emailUser ? `${emailUser.substring(0, 5)}...${emailUser.includes('@') ? '@' + emailUser.split('@')[1] : '(no @ found)'}` : 'NOT SET'}`);
  console.log(`EMAIL_PASSWORD: ${emailPassword ? `SET (${emailPassword.length} characters)` : 'NOT SET'}`);
  console.log(`EMAIL_FROM: ${emailFrom || 'NOT SET (will use EMAIL_USER)'}`);

  if (!emailUser) {
    log('\n ERROR: EMAIL_USER is not set in .env file', 'red');
    return;
  }

  if (!emailPassword) {
    log('\n ERROR: EMAIL_PASSWORD is not set in .env file', 'red');
    return;
  }

  // Check if password looks like an app password (16 chars, no spaces for Gmail)
  const cleanPassword = emailPassword.replace(/\s/g, '');
  if (emailUser.includes('gmail.com')) {
    log('\nGmail detected - checking App Password format...', 'yellow');
    if (cleanPassword.length === 16) {
      log(' App Password appears to be correct format (16 characters)', 'green');
    } else {
      log(` WARNING: Gmail App Passwords should be 16 characters. Yours is ${cleanPassword.length} characters.`, 'yellow');
      log('  Make sure you\'re using an App Password, not your regular Gmail password.', 'yellow');
      log('  Generate one at: https://myaccount.google.com/apppasswords', 'yellow');
    }
  }

  // Step 2: Create transporter and verify connection
  logSection('Step 2: Creating SMTP Transporter');

  let transporter;

  // Try Gmail service first
  log('Attempting connection with Gmail service...', 'yellow');

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
    debug: true,
    logger: true,
  });

  // Step 3: Verify SMTP connection
  logSection('Step 3: Verifying SMTP Connection');

  try {
    log('Verifying connection to Gmail SMTP server...', 'yellow');
    await transporter.verify();
    log(' SMTP connection verified successfully!', 'green');
  } catch (verifyError) {
    log(` SMTP connection FAILED: ${verifyError.message}`, 'red');

    // Provide specific troubleshooting based on error
    console.log('\n--- Troubleshooting Guide ---');

    if (verifyError.message.includes('Invalid login') || verifyError.message.includes('auth') || verifyError.code === 'EAUTH') {
      log('\nAuthentication Error Detected:', 'yellow');
      log('1. Make sure you\'re using a Gmail App Password, NOT your regular password', 'yellow');
      log('2. To create an App Password:', 'yellow');
      log('   a. Go to https://myaccount.google.com/security', 'yellow');
      log('   b. Enable 2-Step Verification if not already enabled', 'yellow');
      log('   c. Go to https://myaccount.google.com/apppasswords', 'yellow');
      log('   d. Create a new App Password for "Mail"', 'yellow');
      log('   e. Copy the 16-character password (no spaces) to your .env file', 'yellow');
    }

    if (verifyError.message.includes('ECONNREFUSED') || verifyError.message.includes('ETIMEDOUT')) {
      log('\nConnection Error Detected:', 'yellow');
      log('1. Check your internet connection', 'yellow');
      log('2. Check if your firewall is blocking port 587 or 465', 'yellow');
      log('3. Try restarting your router/network', 'yellow');
    }

    if (verifyError.message.includes('certificate')) {
      log('\nSSL/TLS Certificate Error:', 'yellow');
      log('This might be a network/proxy issue intercepting SSL connections', 'yellow');
    }

    // Try alternative configuration
    logSection('Step 3b: Trying Alternative SMTP Configuration');

    log('Attempting direct SMTP connection (smtp.gmail.com:587)...', 'yellow');

    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
      tls: {
        rejectUnauthorized: false,
      },
      debug: true,
    });

    try {
      await transporter.verify();
      log(' Alternative configuration works!', 'green');
    } catch (altError) {
      log(` Alternative configuration also failed: ${altError.message}`, 'red');

      // Try port 465
      log('\nTrying SSL connection (smtp.gmail.com:465)...', 'yellow');

      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
        debug: true,
      });

      try {
        await transporter.verify();
        log(' SSL configuration works!', 'green');
      } catch (sslError) {
        log(` SSL configuration also failed: ${sslError.message}`, 'red');
        log('\n All connection attempts failed. Please check your credentials.', 'red');
        return;
      }
    }
  }

  // Step 4: Send test email
  logSection('Step 4: Sending Test Email');

  const testRecipient = emailUser; // Send to self for testing

  log(`Sending test email to: ${testRecipient}`, 'yellow');

  try {
    const info = await transporter.sendMail({
      from: emailFrom || emailUser,
      to: testRecipient,
      subject: 'SMTP Test - Juntas App',
      text: 'This is a test email from the Juntas App SMTP diagnostic script.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #4F46E5;">SMTP Test Successful!</h2>
          <p>This is a test email from the Juntas App SMTP diagnostic script.</p>
          <p>If you're reading this, your email configuration is working correctly.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            Sent at: ${new Date().toISOString()}
          </p>
        </div>
      `,
    });

    log(' Test email sent successfully!', 'green');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);

    logSection('SUCCESS - EMAIL CONFIGURATION WORKING');
    log('Your SMTP configuration is correct!', 'green');
    log(`Check ${testRecipient} inbox (and spam folder) for the test email.`, 'green');

  } catch (sendError) {
    log(` Failed to send test email: ${sendError.message}`, 'red');
    console.log('\nFull error:', sendError);
  }

  // Summary
  logSection('Configuration Summary');
  console.log(`
Current .env settings needed:
  EMAIL_USER=${emailUser}
  EMAIL_PASSWORD=<your-16-char-app-password>
  EMAIL_FROM=${emailFrom || emailUser}

If emails are still not working:
1. Verify 2-Step Verification is enabled on your Google account
2. Generate a fresh App Password at https://myaccount.google.com/apppasswords
3. Make sure there are no spaces in the App Password in your .env file
4. Check if "Less secure app access" needs to be enabled (legacy accounts)
5. Check your Gmail inbox for any security alerts from Google
`);
}

// Run the test
testSMTP().catch(console.error);
