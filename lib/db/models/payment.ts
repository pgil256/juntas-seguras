import mongoose, { Schema, Document, Model } from 'mongoose';
import { TransactionStatus, TransactionType, PaymentMethodType } from '../../../types/payment';

/**
 * Payment record schema for storing payment transactions with PayPal integration
 */
const PaymentSchema = new Schema({
  // Unique payment ID (internal)
  paymentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // User who made the payment
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Pool this payment belongs to
  poolId: {
    type: String,
    required: true,
    index: true
  },

  // Payment amount
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },

  // Currency code
  currency: {
    type: String,
    default: 'USD'
  },

  // Payment method used
  paymentMethodId: { type: Number },

  // Transaction type and status
  type: {
    type: String,
    enum: Object.values(TransactionType),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(TransactionStatus),
    required: true,
    default: TransactionStatus.PENDING
  },

  // Description
  description: { type: String },

  // Member name (denormalized for display)
  member: { type: String },

  // Round number (for pool contributions)
  round: { type: Number },

  // PayPal-specific fields
  paypalOrderId: {
    type: String,
    sparse: true
  },
  paypalAuthorizationId: {
    type: String,
    sparse: true
  },
  paypalCaptureId: {
    type: String,
    sparse: true
  },
  paypalPayoutBatchId: {
    type: String,
    sparse: true
  },

  // Stripe-specific fields
  stripePaymentIntentId: {
    type: String,
    index: true,
    sparse: true
  },
  stripeCaptureId: {
    type: String,
    sparse: true
  },
  stripeTransferId: {
    type: String,
    sparse: true
  },
  stripeRefundId: {
    type: String,
    sparse: true
  },

  // Escrow fields
  escrowId: { type: String },
  releaseDate: { type: Date },
  releasedAt: { type: Date },
  releasedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  // Related payment (e.g., for escrow release)
  relatedPaymentId: { type: String },

  // Scheduling
  scheduledDate: { type: Date },

  // Processing timestamps
  processedAt: { type: Date },

  // Failure tracking
  failureReason: { type: String },
  failureCount: { type: Number, default: 0 },

}, {
  timestamps: true
});

// Compound indexes for common queries
PaymentSchema.index({ poolId: 1, status: 1 });
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ paypalOrderId: 1 }, { sparse: true });
PaymentSchema.index({ paypalAuthorizationId: 1 }, { sparse: true });

// Document interface
export interface PaymentDocument extends Document {
  paymentId: string;
  userId: mongoose.Types.ObjectId;
  poolId: string;
  amount: number;
  currency: string;
  paymentMethodId?: number;
  type: TransactionType;
  status: TransactionStatus;
  description?: string;
  member?: string;
  round?: number;
  paypalOrderId?: string;
  paypalAuthorizationId?: string;
  paypalCaptureId?: string;
  paypalPayoutBatchId?: string;
  stripePaymentIntentId?: string;
  stripeCaptureId?: string;
  stripeTransferId?: string;
  stripeRefundId?: string;
  escrowId?: string;
  releaseDate?: Date;
  releasedAt?: Date;
  releasedBy?: mongoose.Types.ObjectId;
  relatedPaymentId?: string;
  scheduledDate?: Date;
  processedAt?: Date;
  failureReason?: string;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payment Method schema for storing tokenized payment methods
 * IMPORTANT: Never store raw card numbers, CVV, or bank account numbers
 */
const PaymentMethodSchema = new Schema({
  // User who owns this payment method
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Payment method type
  type: {
    type: String,
    enum: ['paypal', 'card', 'bank'] as PaymentMethodType[],
    required: true
  },

  // Display name
  name: { type: String, required: true },

  // Last 4 digits (for display only)
  last4: { type: String, required: true },

  // Is this the default payment method?
  isDefault: { type: Boolean, default: false },

  // PayPal-specific fields (email is safe to store)
  paypalEmail: { type: String },

  // Card-specific fields (safe to store)
  cardholderName: { type: String },
  expiryMonth: { type: String },
  expiryYear: { type: String },
  cardBrand: { type: String }, // visa, mastercard, etc.

  // PayPal Vault token (for card/bank tokenization)
  paypalVaultId: { type: String },

  // Bank-specific fields (safe to store)
  accountHolderName: { type: String },
  accountType: {
    type: String,
    enum: ['checking', 'savings']
  },
  bankName: { type: String },
  // Only store last 4 of routing number for display
  routingLast4: { type: String },

  // Verification status
  verified: { type: Boolean, default: false },
  verifiedAt: { type: Date },

  // Soft delete
  deletedAt: { type: Date },

}, {
  timestamps: true
});

// Compound index for user's payment methods
PaymentMethodSchema.index({ userId: 1, deletedAt: 1 });

// Document interface
export interface PaymentMethodDocument extends Document {
  userId: mongoose.Types.ObjectId;
  type: PaymentMethodType;
  name: string;
  last4: string;
  isDefault: boolean;
  paypalEmail?: string;
  cardholderName?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cardBrand?: string;
  paypalVaultId?: string;
  accountHolderName?: string;
  accountType?: 'checking' | 'savings';
  bankName?: string;
  routingLast4?: string;
  verified: boolean;
  verifiedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to generate unique payment ID
export function generatePaymentId(): string {
  return `pmt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// Model getters
export function getPaymentModel(): Model<PaymentDocument> {
  const modelName = 'Payment';
  return mongoose.models[modelName] || mongoose.model<PaymentDocument>(modelName, PaymentSchema);
}

export function getPaymentMethodModel(): Model<PaymentMethodDocument> {
  const modelName = 'PaymentMethod';
  return mongoose.models[modelName] || mongoose.model<PaymentMethodDocument>(modelName, PaymentMethodSchema);
}

export const Payment = getPaymentModel();
export const PaymentMethod = getPaymentMethodModel();

const paymentExports = { Payment, PaymentMethod, getPaymentModel, getPaymentMethodModel, generatePaymentId };
export default paymentExports;
