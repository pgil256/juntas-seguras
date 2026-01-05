/**
 * Auto-Generated Activity Posts
 *
 * This module creates automatic activity posts in the discussion feed
 * when important events occur in the pool (payments, payouts, member changes, etc.)
 *
 * Activity posts:
 * - Are created automatically by the system
 * - Have a special "activity" type for filtering
 * - Include metadata about the event for rich display
 * - Can be hidden/collapsed by users but not deleted
 */

import mongoose, { Types } from 'mongoose';
import { Discussion, DiscussionType, ActivityType } from '../db/models/discussion';
import connectToDatabase from '../db/connect';

// System user ID for auto-generated posts
const SYSTEM_USER_NAME = 'Pool Activity';
const SYSTEM_AUTHOR_ID = new mongoose.Types.ObjectId('000000000000000000000000');

interface ActivityPostOptions {
  poolId: Types.ObjectId;
  activityType: ActivityType;
  content: string;
  metadata?: {
    memberId?: number;
    memberName?: string;
    amount?: number;
    round?: number;
    paymentMethod?: string;
    transactionId?: string;
  };
}

/**
 * Create an auto-generated activity post
 *
 * @param options - Activity post options
 * @returns The created discussion document
 */
export async function createActivityPost(
  options: ActivityPostOptions
): Promise<any> {
  await connectToDatabase();

  const { poolId, activityType, content, metadata } = options;

  const discussion = await Discussion.create({
    poolId,
    authorId: SYSTEM_AUTHOR_ID,
    authorName: SYSTEM_USER_NAME,
    type: DiscussionType.ACTIVITY,
    activityType,
    content,
    activityMetadata: metadata,
    mentions: [],
    isPinned: false,
    isEdited: false,
    deleted: false,
    replyCount: 0
  });

  return discussion;
}

/**
 * Create activity post for payment received
 */
export async function postPaymentReceived(
  poolId: Types.ObjectId | string,
  memberName: string,
  amount: number,
  round: number,
  paymentMethod?: string
): Promise<any> {
  const poolObjectId = new mongoose.Types.ObjectId(poolId.toString());

  const content = `${memberName} made a contribution of $${amount.toFixed(2)} for round ${round}${paymentMethod ? ` via ${paymentMethod}` : ''}.`;

  return createActivityPost({
    poolId: poolObjectId,
    activityType: ActivityType.PAYMENT_RECEIVED,
    content,
    metadata: {
      memberName,
      amount,
      round,
      paymentMethod
    }
  });
}

/**
 * Create activity post for payment confirmed by admin
 */
export async function postPaymentConfirmed(
  poolId: Types.ObjectId | string,
  memberName: string,
  amount: number,
  round: number,
  confirmedBy: string
): Promise<any> {
  const poolObjectId = new mongoose.Types.ObjectId(poolId.toString());

  const content = `${confirmedBy} confirmed ${memberName}'s contribution of $${amount.toFixed(2)} for round ${round}.`;

  return createActivityPost({
    poolId: poolObjectId,
    activityType: ActivityType.PAYMENT_CONFIRMED,
    content,
    metadata: {
      memberName,
      amount,
      round
    }
  });
}

/**
 * Create activity post for payout sent
 */
export async function postPayoutSent(
  poolId: Types.ObjectId | string,
  recipientName: string,
  amount: number,
  round: number,
  paymentMethod?: string
): Promise<any> {
  const poolObjectId = new mongoose.Types.ObjectId(poolId.toString());

  const content = `Payout of $${amount.toFixed(2)} was sent to ${recipientName} for round ${round}${paymentMethod ? ` via ${paymentMethod}` : ''}.`;

  return createActivityPost({
    poolId: poolObjectId,
    activityType: ActivityType.PAYOUT_SENT,
    content,
    metadata: {
      memberName: recipientName,
      amount,
      round,
      paymentMethod
    }
  });
}

/**
 * Create activity post for payout completed/confirmed
 */
export async function postPayoutCompleted(
  poolId: Types.ObjectId | string,
  recipientName: string,
  amount: number,
  round: number
): Promise<any> {
  const poolObjectId = new mongoose.Types.ObjectId(poolId.toString());

  const content = `${recipientName} confirmed receiving the payout of $${amount.toFixed(2)} for round ${round}. 🎉`;

  return createActivityPost({
    poolId: poolObjectId,
    activityType: ActivityType.PAYOUT_COMPLETED,
    content,
    metadata: {
      memberName: recipientName,
      amount,
      round
    }
  });
}

/**
 * Create activity post for member joined
 */
export async function postMemberJoined(
  poolId: Types.ObjectId | string,
  memberName: string,
  position?: number
): Promise<any> {
  const poolObjectId = new mongoose.Types.ObjectId(poolId.toString());

  const content = position
    ? `${memberName} joined the pool at position ${position}.`
    : `${memberName} joined the pool.`;

  return createActivityPost({
    poolId: poolObjectId,
    activityType: ActivityType.MEMBER_JOINED,
    content,
    metadata: {
      memberName
    }
  });
}

/**
 * Create activity post for member left
 */
export async function postMemberLeft(
  poolId: Types.ObjectId | string,
  memberName: string
): Promise<any> {
  const poolObjectId = new mongoose.Types.ObjectId(poolId.toString());

  const content = `${memberName} left the pool.`;

  return createActivityPost({
    poolId: poolObjectId,
    activityType: ActivityType.MEMBER_LEFT,
    content,
    metadata: {
      memberName
    }
  });
}

/**
 * Create activity post for new round started
 */
export async function postRoundStarted(
  poolId: Types.ObjectId | string,
  roundNumber: number,
  recipientName: string,
  contributionAmount: number
): Promise<any> {
  const poolObjectId = new mongoose.Types.ObjectId(poolId.toString());

  const content = `Round ${roundNumber} has started! ${recipientName} is the recipient this round. Contributions of $${contributionAmount.toFixed(2)} are due.`;

  return createActivityPost({
    poolId: poolObjectId,
    activityType: ActivityType.ROUND_STARTED,
    content,
    metadata: {
      memberName: recipientName,
      round: roundNumber,
      amount: contributionAmount
    }
  });
}

/**
 * Create activity post for round completed
 */
export async function postRoundCompleted(
  poolId: Types.ObjectId | string,
  roundNumber: number,
  totalCollected: number
): Promise<any> {
  const poolObjectId = new mongoose.Types.ObjectId(poolId.toString());

  const content = `Round ${roundNumber} completed! Total of $${totalCollected.toFixed(2)} was collected and distributed.`;

  return createActivityPost({
    poolId: poolObjectId,
    activityType: ActivityType.ROUND_COMPLETED,
    content,
    metadata: {
      round: roundNumber,
      amount: totalCollected
    }
  });
}

/**
 * Create activity post for pool created
 */
export async function postPoolCreated(
  poolId: Types.ObjectId | string,
  creatorName: string,
  poolName: string
): Promise<any> {
  const poolObjectId = new mongoose.Types.ObjectId(poolId.toString());

  const content = `${creatorName} created the pool "${poolName}". Welcome everyone!`;

  return createActivityPost({
    poolId: poolObjectId,
    activityType: ActivityType.POOL_CREATED,
    content,
    metadata: {
      memberName: creatorName
    }
  });
}

/**
 * Create activity post for pool status change
 */
export async function postPoolStatusChanged(
  poolId: Types.ObjectId | string,
  newStatus: string,
  changedBy: string
): Promise<any> {
  const poolObjectId = new mongoose.Types.ObjectId(poolId.toString());

  let content: string;
  switch (newStatus) {
    case 'active':
      content = `${changedBy} activated the pool. The pool is now running!`;
      break;
    case 'paused':
      content = `${changedBy} paused the pool. Contributions are temporarily on hold.`;
      break;
    case 'completed':
      content = `The pool has been completed! Thank you everyone for participating. 🎊`;
      break;
    default:
      content = `${changedBy} changed the pool status to ${newStatus}.`;
  }

  return createActivityPost({
    poolId: poolObjectId,
    activityType: ActivityType.POOL_STATUS_CHANGED,
    content,
    metadata: {
      memberName: changedBy
    }
  });
}

/**
 * Create activity post for payment reminder sent
 */
export async function postReminderSent(
  poolId: Types.ObjectId | string,
  memberName: string,
  round: number,
  dueDate?: string
): Promise<any> {
  const poolObjectId = new mongoose.Types.ObjectId(poolId.toString());

  const content = dueDate
    ? `A payment reminder was sent to ${memberName} for round ${round}. Due: ${dueDate}.`
    : `A payment reminder was sent to ${memberName} for round ${round}.`;

  return createActivityPost({
    poolId: poolObjectId,
    activityType: ActivityType.REMINDER_SENT,
    content,
    metadata: {
      memberName,
      round
    }
  });
}

/**
 * Format amount as currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Get activity icon for display
 */
export function getActivityIcon(activityType: ActivityType): string {
  switch (activityType) {
    case ActivityType.PAYMENT_RECEIVED:
      return '💰';
    case ActivityType.PAYMENT_CONFIRMED:
      return '✅';
    case ActivityType.PAYOUT_SENT:
      return '📤';
    case ActivityType.PAYOUT_COMPLETED:
      return '🎉';
    case ActivityType.MEMBER_JOINED:
      return '👋';
    case ActivityType.MEMBER_LEFT:
      return '👋';
    case ActivityType.ROUND_STARTED:
      return '🔄';
    case ActivityType.ROUND_COMPLETED:
      return '✨';
    case ActivityType.POOL_CREATED:
      return '🎊';
    case ActivityType.POOL_STATUS_CHANGED:
      return '📋';
    case ActivityType.REMINDER_SENT:
      return '🔔';
    default:
      return '📣';
  }
}

/**
 * Get activity color for display
 */
export function getActivityColor(activityType: ActivityType): string {
  switch (activityType) {
    case ActivityType.PAYMENT_RECEIVED:
    case ActivityType.PAYMENT_CONFIRMED:
      return 'green';
    case ActivityType.PAYOUT_SENT:
    case ActivityType.PAYOUT_COMPLETED:
      return 'blue';
    case ActivityType.MEMBER_JOINED:
      return 'purple';
    case ActivityType.MEMBER_LEFT:
      return 'gray';
    case ActivityType.ROUND_STARTED:
    case ActivityType.ROUND_COMPLETED:
      return 'orange';
    case ActivityType.POOL_CREATED:
      return 'indigo';
    case ActivityType.POOL_STATUS_CHANGED:
      return 'yellow';
    case ActivityType.REMINDER_SENT:
      return 'amber';
    default:
      return 'gray';
  }
}
