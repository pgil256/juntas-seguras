/**
 * Types for Discussion/Activity Feed features
 */

// Discussion types for filtering and display
export enum DiscussionType {
  POST = 'post',
  ANNOUNCEMENT = 'announcement',
  ACTIVITY = 'activity',
  REPLY = 'reply',
}

// Activity subtypes for auto-generated posts
export enum ActivityType {
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_CONFIRMED = 'payment_confirmed',
  PAYOUT_SENT = 'payout_sent',
  PAYOUT_COMPLETED = 'payout_completed',
  MEMBER_JOINED = 'member_joined',
  MEMBER_LEFT = 'member_left',
  ROUND_STARTED = 'round_started',
  ROUND_COMPLETED = 'round_completed',
  POOL_CREATED = 'pool_created',
  POOL_STATUS_CHANGED = 'pool_status_changed',
  REMINDER_SENT = 'reminder_sent',
}

// Activity metadata for rich display
export interface ActivityMetadata {
  memberId?: number;
  memberName?: string;
  amount?: number;
  round?: number;
  paymentMethod?: string;
  transactionId?: string;
}

// Discussion item from API
export interface Discussion {
  id: string;
  type: DiscussionType;
  activityType?: ActivityType;
  title?: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  isPinned: boolean;
  isEdited: boolean;
  editedAt?: string;
  replyCount: number;
  mentions: string[];
  parentId?: string;
  activityMetadata?: ActivityMetadata;
  createdAt: string;
  isRead: boolean;
  isOwnPost: boolean;
}

// Discussion reply item
export interface DiscussionReply {
  id: string;
  type: DiscussionType.REPLY;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  isEdited: boolean;
  editedAt?: string;
  mentions: string[];
  createdAt: string;
  isOwnPost: boolean;
}

// Mention item from API
export interface DiscussionMention {
  id: string;
  discussionId: string;
  mentionedByName: string;
  discussionType: string;
  discussionPreview: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// Mentionable member for autocomplete
export interface MentionableMember {
  id: string;
  name: string;
  avatar?: string;
}

// Pagination info
export interface PaginationInfo {
  total: number;
  limit: number;
  skip: number;
  hasMore: boolean;
}

// API Response types
export interface DiscussionsResponse {
  discussions: Discussion[];
  pagination: PaginationInfo;
  unreadCount: number;
}

export interface DiscussionDetailResponse {
  discussion: Discussion;
  replies: DiscussionReply[];
  pagination: {
    totalReplies: number;
    replyLimit: number;
    replySkip: number;
    hasMoreReplies: boolean;
  };
}

export interface CreateDiscussionRequest {
  content: string;
  title?: string;
  type?: DiscussionType.POST | DiscussionType.ANNOUNCEMENT;
  parentId?: string;
}

export interface CreateDiscussionResponse {
  success: boolean;
  discussion: Discussion;
}

export interface UpdateDiscussionRequest {
  content?: string;
  title?: string;
  isPinned?: boolean;
}

export interface UpdateDiscussionResponse {
  success: boolean;
  discussion: Discussion;
}

export interface DiscussionReadStatusResponse {
  unreadCount: number;
  totalCount: number;
  lastReadAt: string | null;
}

export interface MarkReadRequest {
  discussionIds?: string[];
  markAll?: boolean;
}

export interface MarkReadResponse {
  success: boolean;
  markedAll?: boolean;
  markedCount?: number;
}

export interface MentionsResponse {
  mentions: DiscussionMention[];
  members: MentionableMember[];
  pagination: PaginationInfo;
  unreadCount: number;
}

export interface MarkMentionsReadRequest {
  mentionIds?: string[];
  markAll?: boolean;
}

export interface MarkMentionsReadResponse {
  success: boolean;
  markedCount: number;
}
