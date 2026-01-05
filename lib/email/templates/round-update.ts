/**
 * Round Update Email Template
 * Sent to pool members when a new round starts or completes
 */

import {
  baseTemplate,
  heading,
  paragraph,
  highlightBox,
  dataTable,
  dataRow,
  divider,
  escapeHtml,
  colors,
} from './base-template';
import { RoundUpdateData, formatCurrency, formatDate } from '../types';

export function roundUpdateTemplate(data: RoundUpdateData): string {
  const {
    recipientName,
    poolName,
    round,
    totalRounds,
    recipientName: winnerName,
    contributionAmount,
    payoutAmount,
    dueDate,
    status,
    poolLink,
    previewText,
  } = data;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://juntasseguras.com';
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : 'Hi,';
  const resolvedPoolLink = poolLink || `${appUrl}/pools`;

  let content = '';

  // Greeting
  content += paragraph(greeting);

  // Main content varies by status
  switch (status) {
    case 'started':
      content += buildRoundStartedContent({
        poolName,
        round,
        totalRounds,
        winnerName,
        contributionAmount,
        payoutAmount,
        dueDate,
        recipientName,
      });
      break;

    case 'completed':
      content += buildRoundCompletedContent({
        poolName,
        round,
        totalRounds,
        winnerName,
        payoutAmount,
      });
      break;

    case 'reminder':
      content += buildRoundReminderContent({
        poolName,
        round,
        totalRounds,
        winnerName,
        contributionAmount,
        dueDate,
      });
      break;
  }

  // CTA button config
  const ctaConfig = {
    started: { text: 'View Pool Details', color: colors.primary },
    completed: { text: 'See Next Round', color: colors.success },
    reminder: { text: 'Make Payment', color: colors.warning },
  };

  // Generate the full email
  return baseTemplate({
    title: getTitleByStatus(status, poolName, round),
    previewText: previewText || getPreviewTextByStatus(status, poolName, round, winnerName),
    content,
    ctaButton: {
      text: ctaConfig[status].text,
      url: resolvedPoolLink,
      color: ctaConfig[status].color,
    },
    footerText: 'You received this email because you are a member of this pool.',
  });
}

// Build content for round started
function buildRoundStartedContent(data: {
  poolName: string;
  round: number;
  totalRounds: number;
  winnerName: string;
  contributionAmount: number;
  payoutAmount: number;
  dueDate: string;
  recipientName?: string;
}): string {
  const {
    poolName,
    round,
    totalRounds,
    winnerName,
    contributionAmount,
    payoutAmount,
    dueDate,
    recipientName,
  } = data;

  let content = '';

  // Announcement
  content += highlightBox(
    `<p style="margin: 0; font-size: 18px; font-weight: 600; color: ${colors.primary};">
      Round ${round} of ${totalRounds} has begun!
    </p>
    <p style="margin: 8px 0 0; font-size: 14px; color: ${colors.text};">
      ${escapeHtml(poolName)}
    </p>`,
    'info'
  );

  // Winner announcement
  content += heading('This Round\'s Recipient', 2);

  const isCurrentUserWinner = recipientName && winnerName.toLowerCase() === recipientName.toLowerCase();

  if (isCurrentUserWinner) {
    content += highlightBox(
      `<p style="margin: 0; font-size: 16px; font-weight: 600; color: ${colors.success};">
        🎉 Congratulations! You're this round's recipient!
      </p>
      <p style="margin: 8px 0 0; font-size: 14px; color: #065f46;">
        You'll receive ${formatCurrency(payoutAmount)} once all contributions are collected.
      </p>`,
      'success'
    );
  } else {
    content += `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0; padding: 20px; background-color: ${colors.background}; border-radius: 8px; text-align: center;">
        <tr>
          <td>
            <p style="margin: 0 0 4px; font-size: 13px; color: ${colors.textLight}; text-transform: uppercase; letter-spacing: 0.5px;">
              This round's payout goes to
            </p>
            <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${colors.text};">
              ${escapeHtml(winnerName)}
            </p>
          </td>
        </tr>
      </table>
    `;
  }

  content += divider();

  // Round details
  content += heading('Round Details', 2);
  content += dataTable(
    dataRow('Your Contribution', formatCurrency(contributionAmount)) +
    dataRow('Total Payout', formatCurrency(payoutAmount)) +
    dataRow('Payment Due By', formatDate(dueDate)) +
    dataRow('Progress', `Round ${round} of ${totalRounds}`)
  );

  // Reminder about payment
  if (!isCurrentUserWinner) {
    content += highlightBox(
      `<p style="margin: 0; font-size: 14px; color: ${colors.text};">
        <strong>Remember:</strong> Please send your ${formatCurrency(contributionAmount)} contribution by ${formatDate(dueDate, 'short')} to ensure ${escapeHtml(winnerName)} receives their payout on time.
      </p>`,
      'info'
    );
  }

  return content;
}

// Build content for round completed
function buildRoundCompletedContent(data: {
  poolName: string;
  round: number;
  totalRounds: number;
  winnerName: string;
  payoutAmount: number;
}): string {
  const { poolName, round, totalRounds, winnerName, payoutAmount } = data;

  let content = '';

  // Success announcement
  content += highlightBox(
    `<p style="margin: 0; font-size: 18px; font-weight: 600; color: ${colors.success};">
      ✓ Round ${round} Complete!
    </p>
    <p style="margin: 8px 0 0; font-size: 14px; color: #065f46;">
      ${escapeHtml(winnerName)} has received their ${formatCurrency(payoutAmount)} payout.
    </p>`,
    'success'
  );

  // Progress visualization
  const progressPercent = Math.round((round / totalRounds) * 100);
  content += `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td>
          <p style="margin: 0 0 8px; font-size: 14px; color: ${colors.textLight};">
            Pool Progress: ${round}/${totalRounds} rounds complete
          </p>
          <div style="background-color: ${colors.border}; border-radius: 4px; height: 8px; overflow: hidden;">
            <div style="background-color: ${colors.success}; width: ${progressPercent}%; height: 100%;"></div>
          </div>
        </td>
      </tr>
    </table>
  `;

  // What's next
  if (round < totalRounds) {
    content += heading('What\'s Next', 2);
    content += paragraph(
      `Round ${round + 1} will begin shortly. Keep an eye out for the announcement about the next recipient.`
    );
  } else {
    content += highlightBox(
      `<p style="margin: 0; font-size: 16px; font-weight: 600; color: ${colors.success};">
        🎉 Pool Complete!
      </p>
      <p style="margin: 8px 0 0; font-size: 14px; color: #065f46;">
        All ${totalRounds} rounds of ${escapeHtml(poolName)} have been completed. Thank you for participating!
      </p>`,
      'success'
    );
  }

  return content;
}

// Build content for round reminder
function buildRoundReminderContent(data: {
  poolName: string;
  round: number;
  totalRounds: number;
  winnerName: string;
  contributionAmount: number;
  dueDate: string;
}): string {
  const { poolName, round, totalRounds, winnerName, contributionAmount, dueDate } = data;

  let content = '';

  // Reminder header
  content += highlightBox(
    `<p style="margin: 0; font-size: 16px; font-weight: 600; color: ${colors.warning};">
      Reminder: Round ${round} contribution due soon
    </p>
    <p style="margin: 8px 0 0; font-size: 14px; color: #92400e;">
      Your payment of ${formatCurrency(contributionAmount)} is due by ${formatDate(dueDate, 'short')}.
    </p>`,
    'warning'
  );

  // Details
  content += dataTable(
    dataRow('Pool', poolName) +
    dataRow('Round', `${round} of ${totalRounds}`) +
    dataRow('Amount Due', formatCurrency(contributionAmount)) +
    dataRow('Recipient', winnerName) +
    dataRow('Due Date', formatDate(dueDate))
  );

  // Call to action
  content += paragraph(
    `Please send your contribution to help ${escapeHtml(winnerName)} receive their payout on time. Check the pool for payment methods.`
  );

  return content;
}

// Helper functions for titles and preview text
function getTitleByStatus(status: RoundUpdateData['status'], poolName: string, round: number): string {
  switch (status) {
    case 'started':
      return `Round ${round} Started - ${poolName}`;
    case 'completed':
      return `Round ${round} Complete - ${poolName}`;
    case 'reminder':
      return `Payment Reminder - ${poolName} Round ${round}`;
  }
}

function getPreviewTextByStatus(
  status: RoundUpdateData['status'],
  poolName: string,
  round: number,
  winnerName: string
): string {
  switch (status) {
    case 'started':
      return `Round ${round} has begun! ${winnerName} is this round's recipient.`;
    case 'completed':
      return `Round ${round} is complete. ${winnerName} received their payout.`;
    case 'reminder':
      return `Your contribution for ${poolName} Round ${round} is due soon.`;
  }
}

// Plain text version
export function roundUpdatePlainText(data: RoundUpdateData): string {
  const {
    recipientName,
    poolName,
    round,
    totalRounds,
    recipientName: winnerName,
    contributionAmount,
    payoutAmount,
    dueDate,
    status,
    poolLink,
  } = data;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://juntasseguras.com';
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,';
  const resolvedPoolLink = poolLink || `${appUrl}/pools`;

  let text = `${greeting}\n\n`;

  switch (status) {
    case 'started':
      text += `ROUND ${round} OF ${totalRounds} HAS BEGUN!\n`;
      text += `Pool: ${poolName}\n\n`;
      text += `This Round's Recipient: ${winnerName}\n`;
      text += `Your Contribution: ${formatCurrency(contributionAmount)}\n`;
      text += `Total Payout: ${formatCurrency(payoutAmount)}\n`;
      text += `Payment Due By: ${formatDate(dueDate)}\n\n`;
      text += `Please send your contribution by the due date to ensure ${winnerName} receives their payout on time.\n`;
      break;

    case 'completed':
      text += `ROUND ${round} COMPLETE!\n`;
      text += `Pool: ${poolName}\n\n`;
      text += `${winnerName} has received their ${formatCurrency(payoutAmount)} payout.\n`;
      text += `Progress: ${round}/${totalRounds} rounds complete\n\n`;
      if (round < totalRounds) {
        text += `Round ${round + 1} will begin shortly.\n`;
      } else {
        text += `All ${totalRounds} rounds have been completed. Thank you for participating!\n`;
      }
      break;

    case 'reminder':
      text += `PAYMENT REMINDER - ROUND ${round}\n`;
      text += `Pool: ${poolName}\n\n`;
      text += `Your contribution of ${formatCurrency(contributionAmount)} is due by ${formatDate(dueDate)}.\n`;
      text += `This round's recipient: ${winnerName}\n\n`;
      text += `Please send your contribution to help ${winnerName} receive their payout on time.\n`;
      break;
  }

  text += `\nView Pool: ${resolvedPoolLink}\n\n`;
  text += `---\n`;
  text += `You received this email because you are a member of this pool.\n`;

  return text;
}
