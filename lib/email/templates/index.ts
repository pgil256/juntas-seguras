/**
 * Email templates exports
 */

// Base template utilities
export {
  baseTemplate,
  escapeHtml,
  heading,
  paragraph,
  highlightBox,
  codeDisplay,
  dataRow,
  dataTable,
  divider,
  link,
  badge,
  colors,
} from './base-template';

// Payment reminder template
export {
  paymentReminderTemplate,
  paymentReminderPlainText,
} from './payment-reminder';

// Admin payout reminder template
export {
  adminPayoutReminderTemplate,
  adminPayoutReminderPlainText,
} from './admin-payout-reminder';

// Discussion notification template
export {
  discussionNotificationTemplate,
  discussionNotificationPlainText,
  discussionBatchNotificationTemplate,
} from './discussion-notification';

// Round update template
export {
  roundUpdateTemplate,
  roundUpdatePlainText,
} from './round-update';
