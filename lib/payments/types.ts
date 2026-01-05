/**
 * Type definitions for the manual P2P payment system
 */

// Re-export the PayoutMethodType from deep-links for convenience
export type { PayoutMethodType, PayoutLinkParams, PayoutMethod, ValidationResult } from './deep-links';

/**
 * Payment status for contribution tracking
 */
export type PaymentStatus =
  | 'pending'           // Payment not yet made
  | 'member_confirmed'  // Member says they paid (awaiting admin verification)
  | 'admin_verified'    // Admin confirmed payment received
  | 'late'              // Payment is past due
  | 'missed'            // Payment was not made
  | 'excused';          // Admin excused the payment

/**
 * Payout status for round payouts
 */
export type PayoutStatus =
  | 'pending_collection'  // Still collecting contributions
  | 'ready_to_pay'        // All contributions collected, ready to pay winner
  | 'paid'                // Winner has been paid
  | 'completed';          // Round is closed

/**
 * Round lifecycle status
 */
export type RoundStatus =
  | 'scheduled'           // Future round, not yet active
  | 'active'              // Current round, collecting payments
  | 'collecting'          // Past due date, still collecting
  | 'ready_for_payout'    // All payments verified
  | 'paid'                // Winner has been paid
  | 'completed';          // Round closed

/**
 * User's payout methods configuration
 */
export interface UserPayoutMethods {
  venmo?: string;
  cashapp?: string;
  paypal?: string;
  zelle?: string;
  preferred?: 'venmo' | 'cashapp' | 'paypal' | 'zelle' | null;
  updatedAt?: Date;
}

/**
 * Admin's collection methods for a pool (where contributors send money)
 */
export interface AdminCollectionMethods {
  venmo?: string;
  cashapp?: string;
  paypal?: string;
  zelle?: string;
  preferred?: 'venmo' | 'cashapp' | 'paypal' | 'zelle' | null;
  updatedAt?: Date;
}

/**
 * Member's payout information within a pool
 */
export interface MemberPayoutInfo {
  venmo?: string;
  cashapp?: string;
  paypal?: string;
  zelle?: string;
  preferred?: 'venmo' | 'cashapp' | 'paypal' | 'zelle' | null;
}

/**
 * Individual contribution payment for a round
 */
export interface ContributionPayment {
  id: string;
  roundId: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  amount: number;
  status: PaymentStatus;

  // Member confirmation details
  memberConfirmedAt?: Date;
  memberConfirmedVia?: 'venmo' | 'cashapp' | 'paypal' | 'zelle' | 'cash' | 'other';

  // Admin verification details
  adminVerifiedAt?: Date;
  adminVerifiedBy?: string; // Admin user ID
  adminNotes?: string;

  // Reminder tracking
  reminderSentAt?: Date;
  reminderCount: number;

  // Timestamps
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Round information for a pool
 */
export interface Round {
  id: string;
  poolId: string;
  roundNumber: number;
  dueDate: Date;

  // Winner information
  winnerId: string;
  winnerName: string;
  winnerEmail: string;
  winnerPayoutMethods?: MemberPayoutInfo;

  // Financial details
  contributionAmount: number;
  totalMembers: number;
  potAmount: number; // contributionAmount × totalMembers

  // Status
  status: RoundStatus;
  payoutStatus: PayoutStatus;

  // Payout tracking
  payoutCompletedAt?: Date;
  payoutMethod?: 'venmo' | 'cashapp' | 'paypal' | 'zelle' | 'cash' | 'other';
  payoutNotes?: string;
  payoutConfirmedByAdmin?: string; // Admin user ID

  // Collection stats
  paymentsCollected: number;
  paymentsVerified: number;
  totalPaymentsExpected: number;
  amountCollected: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generated payment links for a payment
 */
export interface GeneratedPaymentLinks {
  venmo: string | null;
  cashapp: string | null;
  paypal: string | null;
  zelle: { identifier: string; copyText: string } | null;
}

/**
 * Request payload for member confirming their payment
 */
export interface MemberConfirmPaymentRequest {
  paymentId: string;
  method: 'venmo' | 'cashapp' | 'paypal' | 'zelle' | 'cash' | 'other';
}

/**
 * Request payload for admin verifying a payment
 */
export interface AdminVerifyPaymentRequest {
  paymentId: string;
  notes?: string;
}

/**
 * Request payload for admin confirming payout
 */
export interface AdminConfirmPayoutRequest {
  roundId: string;
  method: 'venmo' | 'cashapp' | 'paypal' | 'zelle' | 'cash' | 'other';
  notes?: string;
}

/**
 * Request payload for sending a payment reminder
 */
export interface SendReminderRequest {
  paymentId: string;
}

/**
 * Response for getting payment links to pay admin
 */
export interface PayToAdminLinksResponse {
  links: GeneratedPaymentLinks;
  adminName: string;
  amount: number;
  note: string;
}

/**
 * Response for getting payout links to pay winner
 */
export interface PayoutLinksResponse {
  links: GeneratedPaymentLinks;
  winnerName: string;
  amount: number;
  note: string;
  preferredMethod?: 'venmo' | 'cashapp' | 'paypal' | 'zelle' | null;
}

/**
 * Collection progress for a round
 */
export interface CollectionProgress {
  roundId: string;
  roundNumber: number;
  totalMembers: number;
  paymentsReceived: number;
  paymentsPending: number;
  paymentsLate: number;
  amountCollected: number;
  amountExpected: number;
  percentComplete: number;
  allVerified: boolean;
}

/**
 * Payment method display info
 */
export interface PaymentMethodDisplay {
  type: 'venmo' | 'cashapp' | 'paypal' | 'zelle';
  handle: string;
  displayHandle: string; // Formatted for display (e.g., @handle, $handle, paypal.me/handle)
  link: string | null; // Deep link URL or null for Zelle
  supportsDeepLink: boolean;
  label: string; // Human-readable label
  color: string; // Brand color class
  icon: string; // Icon name or emoji
}

/**
 * Status badge configuration
 */
export interface StatusBadge {
  status: PaymentStatus | PayoutStatus | RoundStatus;
  label: string;
  color: 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'purple';
  icon: string;
}

/**
 * Helper to get status badge configuration
 */
export function getPaymentStatusBadge(status: PaymentStatus): StatusBadge {
  const badges: Record<PaymentStatus, StatusBadge> = {
    pending: { status: 'pending', label: 'Pending', color: 'gray', icon: 'clock' },
    member_confirmed: { status: 'member_confirmed', label: 'Awaiting Verification', color: 'yellow', icon: 'hourglass' },
    admin_verified: { status: 'admin_verified', label: 'Verified', color: 'green', icon: 'check' },
    late: { status: 'late', label: 'Late', color: 'red', icon: 'alert' },
    missed: { status: 'missed', label: 'Missed', color: 'red', icon: 'x' },
    excused: { status: 'excused', label: 'Excused', color: 'blue', icon: 'info' },
  };
  return badges[status];
}

export function getPayoutStatusBadge(status: PayoutStatus): StatusBadge {
  const badges: Record<PayoutStatus, StatusBadge> = {
    pending_collection: { status: 'pending_collection', label: 'Collecting', color: 'gray', icon: 'collection' },
    ready_to_pay: { status: 'ready_to_pay', label: 'Ready to Pay', color: 'blue', icon: 'wallet' },
    paid: { status: 'paid', label: 'Paid', color: 'green', icon: 'check' },
    completed: { status: 'completed', label: 'Completed', color: 'purple', icon: 'flag' },
  };
  return badges[status];
}

export function getRoundStatusBadge(status: RoundStatus): StatusBadge {
  const badges: Record<RoundStatus, StatusBadge> = {
    scheduled: { status: 'scheduled', label: 'Scheduled', color: 'gray', icon: 'calendar' },
    active: { status: 'active', label: 'Active', color: 'blue', icon: 'play' },
    collecting: { status: 'collecting', label: 'Collecting', color: 'yellow', icon: 'coins' },
    ready_for_payout: { status: 'ready_for_payout', label: 'Ready for Payout', color: 'green', icon: 'dollar' },
    paid: { status: 'paid', label: 'Paid Out', color: 'green', icon: 'check' },
    completed: { status: 'completed', label: 'Completed', color: 'purple', icon: 'flag' },
  };
  return badges[status];
}

/**
 * Get payment method display info
 */
export function getPaymentMethodDisplay(
  type: 'venmo' | 'cashapp' | 'paypal' | 'zelle',
  handle: string,
  link: string | null
): PaymentMethodDisplay {
  const configs: Record<typeof type, Omit<PaymentMethodDisplay, 'handle' | 'displayHandle' | 'link'>> = {
    venmo: {
      type: 'venmo',
      supportsDeepLink: true,
      label: 'Venmo',
      color: 'bg-blue-500',
      icon: 'venmo',
    },
    cashapp: {
      type: 'cashapp',
      supportsDeepLink: true,
      label: 'Cash App',
      color: 'bg-green-500',
      icon: 'cashapp',
    },
    paypal: {
      type: 'paypal',
      supportsDeepLink: true,
      label: 'PayPal',
      color: 'bg-blue-600',
      icon: 'paypal',
    },
    zelle: {
      type: 'zelle',
      supportsDeepLink: false,
      label: 'Zelle',
      color: 'bg-purple-600',
      icon: 'zelle',
    },
  };

  const config = configs[type];

  // Format display handle based on type
  let displayHandle = handle;
  switch (type) {
    case 'venmo':
      displayHandle = handle.startsWith('@') ? handle : `@${handle}`;
      break;
    case 'cashapp':
      displayHandle = handle.startsWith('$') ? handle : `$${handle}`;
      break;
    case 'paypal':
      displayHandle = `paypal.me/${handle}`;
      break;
    case 'zelle':
      // Keep as-is for email/phone
      displayHandle = handle;
      break;
  }

  return {
    ...config,
    handle,
    displayHandle,
    link,
  };
}
