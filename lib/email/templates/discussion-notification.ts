/**
 * Discussion Notification Email Template
 * Sent to pool members when there's new activity in the pool discussion
 */

import {
  baseTemplate,
  heading,
  paragraph,
  highlightBox,
  divider,
  escapeHtml,
  colors,
} from './base-template';
import { DiscussionNotificationData } from '../types';

export function discussionNotificationTemplate(data: DiscussionNotificationData): string {
  const {
    recipientName,
    poolName,
    authorName,
    messagePreview,
    messageCount = 1,
    poolLink,
    previewText,
  } = data;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://juntasseguras.com';
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : 'Hi,';
  const resolvedPoolLink = poolLink || `${appUrl}/pools`;

  let content = '';

  // Greeting
  content += paragraph(greeting);

  // Main message
  if (messageCount > 1) {
    content += paragraph(
      `You have <strong>${messageCount} new messages</strong> in the <strong>${escapeHtml(poolName)}</strong> discussion.`
    );
  } else {
    content += paragraph(
      `<strong>${escapeHtml(authorName)}</strong> posted a new message in <strong>${escapeHtml(poolName)}</strong>.`
    );
  }

  // Message preview
  content += `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td style="padding: 20px; background-color: ${colors.background}; border-radius: 8px; border-left: 4px solid ${colors.primary};">
          <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: ${colors.textLight};">
            ${escapeHtml(authorName)} wrote:
          </p>
          <p style="margin: 0; font-size: 15px; color: ${colors.text}; line-height: 1.6; font-style: italic;">
            "${escapeHtml(truncateMessage(messagePreview, 200))}"
          </p>
        </td>
      </tr>
    </table>
  `;

  // Tip about pool discussions
  content += paragraph(
    'Pool discussions are a great way to coordinate with your group, share updates, and stay connected.',
    { muted: true }
  );

  // Generate the full email
  return baseTemplate({
    title: `New message in ${poolName}`,
    previewText: previewText || `${authorName}: "${truncateMessage(messagePreview, 50)}"`,
    content,
    ctaButton: {
      text: messageCount > 1 ? 'View All Messages' : 'View Message',
      url: resolvedPoolLink,
    },
    footerText: 'You received this email because you are a member of this pool. You can manage your notification preferences in settings.',
  });
}

// Helper to truncate long messages
function truncateMessage(message: string, maxLength: number): string {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength).trim() + '...';
}

// Plain text version
export function discussionNotificationPlainText(data: DiscussionNotificationData): string {
  const {
    recipientName,
    poolName,
    authorName,
    messagePreview,
    messageCount = 1,
    poolLink,
  } = data;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://juntasseguras.com';
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,';
  const resolvedPoolLink = poolLink || `${appUrl}/pools`;

  let text = `${greeting}\n\n`;

  if (messageCount > 1) {
    text += `You have ${messageCount} new messages in the "${poolName}" discussion.\n\n`;
  } else {
    text += `${authorName} posted a new message in "${poolName}".\n\n`;
  }

  text += `---\n`;
  text += `${authorName} wrote:\n`;
  text += `"${truncateMessage(messagePreview, 200)}"\n`;
  text += `---\n\n`;

  text += `View the discussion: ${resolvedPoolLink}\n\n`;
  text += `---\n`;
  text += `You received this email because you are a member of this pool.\n`;
  text += `Manage notifications: ${appUrl}/settings\n`;

  return text;
}

// Batch notification for multiple messages
export function discussionBatchNotificationTemplate(data: {
  recipientName?: string;
  pools: Array<{
    poolName: string;
    messageCount: number;
    lastAuthor: string;
    lastMessagePreview: string;
    poolLink: string;
  }>;
}): string {
  const { recipientName, pools } = data;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://juntasseguras.com';
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : 'Hi,';
  const totalMessages = pools.reduce((sum, p) => sum + p.messageCount, 0);

  let content = '';

  // Greeting
  content += paragraph(greeting);

  // Summary
  content += paragraph(
    `You have <strong>${totalMessages} new message${totalMessages > 1 ? 's' : ''}</strong> across ${pools.length} pool${pools.length > 1 ? 's' : ''}.`
  );

  // Pool messages list
  content += `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
  `;

  pools.forEach((pool, index) => {
    content += `
      <tr>
        <td style="padding: 16px; ${index < pools.length - 1 ? `border-bottom: 1px solid ${colors.border};` : ''} ">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td>
                <p style="margin: 0 0 4px; font-size: 16px; font-weight: 600; color: ${colors.text};">
                  ${escapeHtml(pool.poolName)}
                  <span style="font-weight: 400; color: ${colors.textLight}; font-size: 14px;">
                    (${pool.messageCount} new)
                  </span>
                </p>
                <p style="margin: 0; font-size: 14px; color: ${colors.textLight};">
                  ${escapeHtml(pool.lastAuthor)}: "${escapeHtml(truncateMessage(pool.lastMessagePreview, 80))}"
                </p>
              </td>
              <td style="text-align: right; vertical-align: middle;">
                <a href="${escapeHtml(pool.poolLink)}" style="color: ${colors.primary}; text-decoration: none; font-size: 14px; font-weight: 500;">
                  View &rarr;
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  });

  content += `</table>`;

  // Generate the full email
  return baseTemplate({
    title: `${totalMessages} new message${totalMessages > 1 ? 's' : ''} in your pools`,
    previewText: `You have ${totalMessages} new message${totalMessages > 1 ? 's' : ''} across ${pools.length} pool${pools.length > 1 ? 's' : ''}`,
    content,
    ctaButton: {
      text: 'View All Pools',
      url: `${appUrl}/pools`,
    },
    footerText: 'You received this email because you are a member of these pools. Manage notifications in settings.',
  });
}
