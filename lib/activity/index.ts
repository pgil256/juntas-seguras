/**
 * Activity Module Index
 *
 * Re-exports all activity-related functionality for easy importing.
 */

// @mentions parsing and processing
export {
  parseMentions,
  resolveMentions,
  createMentionRecords,
  processMentions,
  getMentionableMembers,
  formatMentions,
  type ParsedMention,
  type ResolvedMention,
} from './mentions';

// Auto-generated activity posts
export {
  createActivityPost,
  postPaymentReceived,
  postPaymentConfirmed,
  postPayoutSent,
  postPayoutCompleted,
  postMemberJoined,
  postMemberLeft,
  postRoundStarted,
  postRoundCompleted,
  postPoolCreated,
  postPoolStatusChanged,
  postReminderSent,
  getActivityIcon,
  getActivityColor,
} from './auto-posts';
