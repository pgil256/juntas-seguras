/**
 * Payment Reminder Email Template
 * Sent to members when their contribution is due or overdue
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
import { PaymentReminderData, formatCurrency, formatDate } from '../types';

export function paymentReminderTemplate(data: PaymentReminderData): string {
  const {
    recipientName,
    poolName,
    amount,
    dueDate,
    round,
    totalRounds,
    adminPaymentMethods,
    paymentLink,
    isOverdue = false,
    daysOverdue = 0,
    previewText,
  } = data;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://juntasseguras.com';
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : 'Hi,';

  // Build payment methods section
  const paymentMethodsHtml = buildPaymentMethodsSection(adminPaymentMethods, amount);

  // Build the main content
  let content = '';

  // Greeting
  content += paragraph(greeting);

  // Main message based on whether payment is overdue
  if (isOverdue && daysOverdue > 0) {
    content += highlightBox(
      `<p style="margin: 0; font-size: 16px; font-weight: 600; color: ${colors.error};">
        Your contribution is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue
      </p>
      <p style="margin: 8px 0 0; font-size: 14px; color: #991b1b;">
        Please make your payment as soon as possible to avoid impacting your fellow pool members.
      </p>`,
      'error'
    );
  } else {
    content += paragraph(
      `This is a friendly reminder that your contribution for <strong>${escapeHtml(poolName)}</strong> is due soon.`
    );
  }

  // Payment details table
  content += heading('Payment Details', 2);
  content += dataTable(
    dataRow('Pool', poolName) +
    dataRow('Round', `${round} of ${totalRounds}`) +
    dataRow('Amount Due', formatCurrency(amount)) +
    dataRow('Due Date', formatDate(dueDate)) +
    dataRow('Status', isOverdue ? `<span style="color: ${colors.error}; font-weight: 600;">Overdue</span>` : `<span style="color: ${colors.warning}; font-weight: 600;">Due Soon</span>`)
  );

  content += divider();

  // Payment methods section
  content += heading('How to Pay', 2);
  content += paragraph(
    'Please send your contribution using one of the following payment methods:',
    { muted: true }
  );
  content += paymentMethodsHtml;

  // Important note
  content += highlightBox(
    `<p style="margin: 0; font-size: 14px; color: ${colors.text};">
      <strong>Important:</strong> After making your payment, please mark it as paid in the app so the pool admin can verify it.
    </p>`,
    'info'
  );

  // Generate the full email
  return baseTemplate({
    title: isOverdue ? `Overdue Payment Reminder - ${poolName}` : `Payment Reminder - ${poolName}`,
    previewText: previewText || (isOverdue
      ? `Your ${formatCurrency(amount)} contribution to ${poolName} is overdue`
      : `Your ${formatCurrency(amount)} contribution to ${poolName} is due on ${formatDate(dueDate, 'short')}`),
    content,
    ctaButton: paymentLink ? {
      text: 'Make Payment',
      url: paymentLink,
      color: isOverdue ? colors.error : colors.primary,
    } : {
      text: 'View Pool',
      url: `${appUrl}/pools`,
      color: isOverdue ? colors.error : colors.primary,
    },
    footerText: 'You received this email because you are a member of a savings pool on Juntas Seguras.',
  });
}

// Helper to build payment methods section with links
function buildPaymentMethodsSection(
  methods: PaymentReminderData['adminPaymentMethods'],
  amount: number
): string {
  const methodsList: string[] = [];

  if (methods.venmo) {
    const venmoUrl = `https://venmo.com/${methods.venmo}?txn=pay&amount=${amount}&note=${encodeURIComponent('Pool contribution')}`;
    methodsList.push(createPaymentMethodRow('Venmo', methods.venmo, venmoUrl, methods.preferred === 'venmo'));
  }

  if (methods.cashapp) {
    const cashtag = methods.cashapp.startsWith('$') ? methods.cashapp : `$${methods.cashapp}`;
    const cashappUrl = `https://cash.app/${cashtag}/${amount}`;
    methodsList.push(createPaymentMethodRow('Cash App', cashtag, cashappUrl, methods.preferred === 'cashapp'));
  }

  if (methods.paypal) {
    const paypalUrl = `https://paypal.me/${methods.paypal}/${amount}`;
    methodsList.push(createPaymentMethodRow('PayPal', methods.paypal, paypalUrl, methods.preferred === 'paypal'));
  }

  if (methods.zelle) {
    // Zelle doesn't have deep linking, just show the identifier
    methodsList.push(createPaymentMethodRow('Zelle', methods.zelle, null, methods.preferred === 'zelle'));
  }

  if (methodsList.length === 0) {
    return `
      <p style="margin: 16px 0; padding: 16px; background-color: #fef3c7; border-radius: 8px; font-size: 14px; color: ${colors.warning};">
        No payment methods have been configured by the pool admin. Please contact them for payment instructions.
      </p>
    `;
  }

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0;">
      ${methodsList.join('')}
    </table>
  `;
}

// Helper to create a single payment method row
function createPaymentMethodRow(
  name: string,
  handle: string,
  url: string | null,
  isPreferred: boolean
): string {
  const preferredBadge = isPreferred
    ? `<span style="margin-left: 8px; display: inline-block; padding: 2px 8px; background-color: #d1fae5; color: ${colors.success}; font-size: 11px; font-weight: 600; border-radius: 9999px;">Preferred</span>`
    : '';

  const actionHtml = url
    ? `<a href="${escapeHtml(url)}" style="color: ${colors.primary}; text-decoration: none; font-weight: 500;">Pay Now &rarr;</a>`
    : `<span style="color: ${colors.textLight}; font-size: 13px;">Send directly to this ${name === 'Zelle' ? 'email/phone' : 'account'}</span>`;

  return `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid ${colors.border};">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td>
              <span style="font-weight: 600; color: ${colors.text};">${name}</span>${preferredBadge}
              <br />
              <span style="color: ${colors.textLight}; font-size: 14px;">${escapeHtml(handle)}</span>
            </td>
            <td style="text-align: right; vertical-align: middle;">
              ${actionHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

// Plain text version
export function paymentReminderPlainText(data: PaymentReminderData): string {
  const {
    recipientName,
    poolName,
    amount,
    dueDate,
    round,
    totalRounds,
    adminPaymentMethods,
    isOverdue = false,
    daysOverdue = 0,
  } = data;

  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://juntasseguras.com';

  let text = `${greeting}\n\n`;

  if (isOverdue && daysOverdue > 0) {
    text += `URGENT: Your contribution is ${daysOverdue} day(s) overdue!\n\n`;
  } else {
    text += `This is a friendly reminder that your contribution for "${poolName}" is due soon.\n\n`;
  }

  text += `PAYMENT DETAILS\n`;
  text += `---------------\n`;
  text += `Pool: ${poolName}\n`;
  text += `Round: ${round} of ${totalRounds}\n`;
  text += `Amount Due: ${formatCurrency(amount)}\n`;
  text += `Due Date: ${formatDate(dueDate)}\n`;
  text += `Status: ${isOverdue ? 'OVERDUE' : 'Due Soon'}\n\n`;

  text += `HOW TO PAY\n`;
  text += `----------\n`;

  if (adminPaymentMethods.venmo) {
    text += `Venmo: ${adminPaymentMethods.venmo}${adminPaymentMethods.preferred === 'venmo' ? ' (Preferred)' : ''}\n`;
  }
  if (adminPaymentMethods.cashapp) {
    const cashtag = adminPaymentMethods.cashapp.startsWith('$') ? adminPaymentMethods.cashapp : `$${adminPaymentMethods.cashapp}`;
    text += `Cash App: ${cashtag}${adminPaymentMethods.preferred === 'cashapp' ? ' (Preferred)' : ''}\n`;
  }
  if (adminPaymentMethods.paypal) {
    text += `PayPal: ${adminPaymentMethods.paypal}${adminPaymentMethods.preferred === 'paypal' ? ' (Preferred)' : ''}\n`;
  }
  if (adminPaymentMethods.zelle) {
    text += `Zelle: ${adminPaymentMethods.zelle}${adminPaymentMethods.preferred === 'zelle' ? ' (Preferred)' : ''}\n`;
  }

  text += `\nAfter making your payment, please mark it as paid in the app so the pool admin can verify it.\n\n`;
  text += `View Pool: ${appUrl}/pools\n\n`;
  text += `---\n`;
  text += `You received this email because you are a member of a savings pool on Juntas Seguras.\n`;

  return text;
}
