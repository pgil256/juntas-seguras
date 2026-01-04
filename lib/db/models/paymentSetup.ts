import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * PaymentSetup Model - Stores saved payment methods for automatic contributions
 *
 * This model links a user's saved payment method to a specific pool for
 * automatic recurring contribution collection using Stripe off-session payments.
 */

// Collection attempt tracking for retry logic
const CollectionAttemptSchema = new Schema({
  attemptNumber: { type: Number, required: true },
  attemptedAt: { type: Date, required: true },
  success: { type: Boolean, required: true },
  stripePaymentIntentId: { type: String },
  errorCode: { type: String }, // e.g., 'card_declined', 'insufficient_funds'
  errorMessage: { type: String },
  declineCode: { type: String }, // Stripe's specific decline code
});

// Payment setup status enum
export enum PaymentSetupStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  REQUIRES_UPDATE = 'requires_update',
  PAUSED = 'paused',
}

// Main PaymentSetup schema
const PaymentSetupSchema = new Schema({
  // User who owns this payment setup
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Pool this setup is for
  poolId: {
    type: String,
    required: true,
    index: true,
  },

  // Stripe identifiers
  stripeCustomerId: {
    type: String,
    required: true,
    index: true,
  },
  stripePaymentMethodId: {
    type: String,
    required: true,
  },
  setupIntentId: {
    type: String,
    required: true,
    index: true,
  },

  // Payment method display info (for UI)
  paymentMethodType: {
    type: String,
    enum: ['card', 'us_bank_account'],
    default: 'card',
  },
  paymentMethodLast4: { type: String },
  paymentMethodBrand: { type: String }, // visa, mastercard, etc.
  paymentMethodExpMonth: { type: Number },
  paymentMethodExpYear: { type: Number },

  // Status of the payment setup
  status: {
    type: String,
    enum: Object.values(PaymentSetupStatus),
    required: true,
    default: PaymentSetupStatus.ACTIVE,
  },

  // Contribution amount for this pool (stored for reference)
  contributionAmount: {
    type: Number,
    required: true,
  },

  // User consent tracking
  consentGivenAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  consentText: {
    type: String,
    required: true,
  },

  // Usage tracking
  lastUsedAt: { type: Date },
  lastSuccessAt: { type: Date },
  lastFailedAt: { type: Date },

  // Failure tracking for retry logic
  failureCount: { type: Number, default: 0 },
  consecutiveFailures: { type: Number, default: 0 },
  totalSuccessfulCharges: { type: Number, default: 0 },
  totalFailedCharges: { type: Number, default: 0 },

  // Recent collection attempts (keep last 10)
  collectionAttempts: [CollectionAttemptSchema],

  // Admin controls
  pausedAt: { type: Date },
  pausedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  pauseReason: { type: String },

  // Update request tracking
  updateRequestedAt: { type: Date },
  updateRequestedBy: { type: Schema.Types.ObjectId, ref: 'User' },

}, {
  timestamps: true,
});

// Compound indexes for common queries
PaymentSetupSchema.index({ userId: 1, poolId: 1 }, { unique: true });
PaymentSetupSchema.index({ poolId: 1, status: 1 });
PaymentSetupSchema.index({ status: 1, lastFailedAt: 1 });

// Document interface
export interface CollectionAttempt {
  attemptNumber: number;
  attemptedAt: Date;
  success: boolean;
  stripePaymentIntentId?: string;
  errorCode?: string;
  errorMessage?: string;
  declineCode?: string;
}

export interface PaymentSetupDocument extends Document {
  userId: mongoose.Types.ObjectId;
  poolId: string;
  stripeCustomerId: string;
  stripePaymentMethodId: string;
  setupIntentId: string;
  paymentMethodType: 'card' | 'us_bank_account';
  paymentMethodLast4?: string;
  paymentMethodBrand?: string;
  paymentMethodExpMonth?: number;
  paymentMethodExpYear?: number;
  status: PaymentSetupStatus;
  contributionAmount: number;
  consentGivenAt: Date;
  consentText: string;
  lastUsedAt?: Date;
  lastSuccessAt?: Date;
  lastFailedAt?: Date;
  failureCount: number;
  consecutiveFailures: number;
  totalSuccessfulCharges: number;
  totalFailedCharges: number;
  collectionAttempts: CollectionAttempt[];
  pausedAt?: Date;
  pausedBy?: mongoose.Types.ObjectId;
  pauseReason?: string;
  updateRequestedAt?: Date;
  updateRequestedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Model getter
export function getPaymentSetupModel(): Model<PaymentSetupDocument> {
  const modelName = 'PaymentSetup';
  return mongoose.models[modelName] || mongoose.model<PaymentSetupDocument>(modelName, PaymentSetupSchema);
}

export const PaymentSetup = getPaymentSetupModel();

export default PaymentSetup;
