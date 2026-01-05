/**
 * Admin Payout Reminder Email Template
 * Sent to pool admins when contributions are collected and payout is ready
 */

import {
  baseTemplate,
  heading,
  paragraph,
  highlightBox,
  dataTable,
  dataRow,
  divider,
  badge,
  escapeHtml,
  colors,
} from './base-template';
import { AdminPayoutReminderData, formatCurrency } from '../types';

export function adminPayoutReminderTemplate(data: AdminPayoutReminderData): string {
  const {
    recipientName,
    poolName,
    recipientName: winnerName,
    recipientEmail,
    payoutAmount,
    round,
    totalRounds,
    payoutMethod,
    contributionsCollected,
    totalContributions,
    isReady,
    previewText,
  } = data;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://juntasseguras.com';
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : 'Hi Admin,';
  const allCollected = contributionsCollected >= totalContributions;

  let content = '';

  // Greeting
  content += paragraph(greeting);

  // Main message based on collection status
  if (isReady && allCollected) {
    content += highlightBox(
      `<p style="margin: 0; font-size: 16px; font-weight: 600; color: ${colors.success};">
        All contributions collected! Ready to send payout.
      </p>
      <p style="margin: 8px 0 0; font-size: 14px; color: #065f46;">
        Round ${round} of ${totalRounds} is complete. Time to send the payout to ${escapeHtml(winnerName)}.
      </p>`,
      'success'
    );
  } else {
    content += highlightBox(
      `<p style="margin: 0; font-size: 16px; font-weight: 600; color: ${colors.warning};">
        Payout Reminder - ${contributionsCollected} of ${totalContributions} contributions collected
      </p>
      <p style="margin: 8px 0 0; font-size: 14px; color: #92400e;">
        Some contributions are still pending for round ${round}. Consider sending reminders to members.
      </p>`,
      'warning'
    );
  }

  // Payout details
  content += heading('Payout Details', 2);
  content += dataTable(
    dataRow('Pool', poolName) +
    dataRow('Round', `${round} of ${totalRounds}`) +
    dataRow('Payout Amount', formatCurrency(payoutAmount)) +
    dataRow('Recipient', winnerName) +
    dataRow('Recipient Email', recipientEmail) +
    dataRow('Collection Status', allCollected
      ? `<span style="color: ${colors.success}; font-weight: 600;">${contributionsCollected}/${totalContributions} Complete</span>`
      : `<span style="color: ${colors.warning}; font-weight: 600;">${contributionsCollected}/${totalContributions} Collected</span>`)
  );

  content += divider();

  // Recipient's payout method
  content += heading('Recipient Payment Info', 2);

  if (payoutMethod && payoutMethod.handle) {
    content += buildPayoutMethodSection(payoutMethod, payoutAmount);
  } else {
    content += highlightBox(
      `<p style="margin: 0; font-size: 14px; color: ${colors.warning};">
        <strong>No payout method configured.</strong><br />
        ${escapeHtml(winnerName)} hasn't set up their payout preferences. Contact them at ${escapeHtml(recipientEmail)} to get their payment information.
      </p>`,
      'warning'
    );
  }

  // Instructions
  content += divider();
  content += heading('Next Steps', 3);
  content += `
    <ol style="margin: 0; padding-left: 20px; color: ${colors.text}; font-size: 14px; line-height: 1.8;">
      <li>Send the payout of ${formatCurrency(payoutAmount)} to ${escapeHtml(winnerName)}</li>
      <li>Use their preferred payment method shown above</li>
      <li>Mark the payout as complete in the app</li>
      <li>The pool will automatically advance to round ${round + 1}</li>
    </ol>
  `;

  // Generate the full email
  return baseTemplate({
    title: `Payout Reminder - ${poolName} Round ${round}`,
    previewText: previewText || (isReady
      ? `Ready to send ${formatCurrency(payoutAmount)} payout to ${winnerName}`
      : `${contributionsCollected}/${totalContributions} contributions collected for ${poolName}`),
    content,
    ctaButton: {
      text: isReady ? 'Complete Payout' : 'View Pool Status',
      url: `${appUrl}/pools`,
      color: isReady ? colors.success : colors.primary,
    },
    footerText: 'You received this email because you are an admin of a savings pool on Juntas Seguras.',
  });
}

// Helper to build payout method section with payment link
function buildPayoutMethodSection(
  method: NonNullable<AdminPayoutReminderData['payoutMethod']>,
  amount: number
): string {
  const { type, handle, displayName } = method;
  let paymentUrl: string | null = null;
  let methodName = type.charAt(0).toUpperCase() + type.slice(1);

  // Generate payment URLs where possible
  switch (type.toLowerCase()) {
    case 'venmo':
      paymentUrl = `https://venmo.com/${handle}?txn=pay&amount=${amount}&note=${encodeURIComponent('Pool payout')}`;
      break;
    case 'cashapp':
      const cashtag = handle.startsWith('$') ? handle : `$${handle}`;
      paymentUrl = `https://cash.app/${cashtag}/${amount}`;
      break;
    case 'paypal':
      paymentUrl = `https://paypal.me/${handle}/${amount}`;
      break;
    case 'zelle':
      // Zelle doesn't support deep linking
      break;
  }

  const paymentButton = paymentUrl
    ? `<a href="${escapeHtml(paymentUrl)}" style="display: inline-block; padding: 10px 20px; background-color: ${colors.primary}; color: white; text-decoration: none; font-weight: 500; font-size: 14px; border-radius: 6px;">Send via ${methodName}</a>`
    : '';

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0; padding: 20px; background-color: ${colors.background}; border-radius: 8px;">
      <tr>
        <td>
          <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: ${colors.textLight}; text-transform: uppercase; letter-spacing: 0.5px;">
            ${methodName}
          </p>
          <p style="margin: 0 0 4px; font-size: 20px; font-weight: 600; color: ${colors.text};">
            ${escapeHtml(handle)}
          </p>
          ${displayName ? `<p style="margin: 0 0 16px; font-size: 14px; color: ${colors.textLight};">${escapeHtml(displayName)}</p>` : ''}
          ${paymentButton}
          ${!paymentUrl && type.toLowerCase() === 'zelle' ? `
            <p style="margin: 16px 0 0; font-size: 13px; color: ${colors.textLight};">
              Open your banking app and send to the Zelle ID above.
            </p>
          ` : ''}
        </td>
      </tr>
    </table>
  `;
}

// Plain text version
export function adminPayoutReminderPlainText(data: AdminPayoutReminderData): string {
  const {
    recipientName,
    poolName,
    recipientName: winnerName,
    recipientEmail,
    payoutAmount,
    round,
    totalRounds,
    payoutMethod,
    contributionsCollected,
    totalContributions,
    isReady,
  } = data;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://juntasseguras.com';
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi Admin,';
  const allCollected = contributionsCollected >= totalContributions;

  let text = `${greeting}\n\n`;

  if (isReady && allCollected) {
    text += `ALL CONTRIBUTIONS COLLECTED - READY TO SEND PAYOUT\n`;
    text += `Round ${round} of ${totalRounds} is complete. Time to send the payout to ${winnerName}.\n\n`;
  } else {
    text += `PAYOUT REMINDER - ${contributionsCollected}/${totalContributions} CONTRIBUTIONS COLLECTED\n`;
    text += `Some contributions are still pending for round ${round}.\n\n`;
  }

  text += `PAYOUT DETAILS\n`;
  text += `--------------\n`;
  text += `Pool: ${poolName}\n`;
  text += `Round: ${round} of ${totalRounds}\n`;
  text += `Payout Amount: ${formatCurrency(payoutAmount)}\n`;
  text += `Recipient: ${winnerName}\n`;
  text += `Recipient Email: ${recipientEmail}\n`;
  text += `Collection Status: ${contributionsCollected}/${totalContributions} ${allCollected ? 'Complete' : 'Collected'}\n\n`;

  text += `RECIPIENT PAYMENT INFO\n`;
  text += `----------------------\n`;

  if (payoutMethod && payoutMethod.handle) {
    text += `Method: ${payoutMethod.type}\n`;
    text += `Handle: ${payoutMethod.handle}\n`;
    if (payoutMethod.displayName) {
      text += `Display Name: ${payoutMethod.displayName}\n`;
    }
  } else {
    text += `No payout method configured.\n`;
    text += `Contact ${winnerName} at ${recipientEmail} to get their payment information.\n`;
  }

  text += `\nNEXT STEPS\n`;
  text += `----------\n`;
  text += `1. Send the payout of ${formatCurrency(payoutAmount)} to ${winnerName}\n`;
  text += `2. Use their preferred payment method shown above\n`;
  text += `3. Mark the payout as complete in the app\n`;
  text += `4. The pool will automatically advance to round ${round + 1}\n\n`;

  text += `View Pool: ${appUrl}/pools\n\n`;
  text += `---\n`;
  text += `You received this email because you are an admin of a savings pool on Juntas Seguras.\n`;

  return text;
}
