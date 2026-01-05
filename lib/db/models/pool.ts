import mongoose, { Schema, Document, Model } from 'mongoose';
import { Pool as PoolType, PoolStatus, PoolMemberStatus, PoolMemberRole, TransactionType } from '../../../types/pool';

// Zelle QR code data schema
const ZelleQRSchema = new Schema({
  // Token extracted from the Zelle QR code
  token: { type: String },
  // Raw QR code content
  rawContent: { type: String },
  // Base64-encoded QR code image for display
  imageDataUrl: { type: String },
  // When the QR code was uploaded
  uploadedAt: { type: Date }
}, { _id: false });

// Member payout methods schema (for when they win)
const MemberPayoutMethodsSchema = new Schema({
  venmo: { type: String },
  cashapp: { type: String },
  paypal: { type: String },
  zelle: { type: String },
  zelleQR: { type: ZelleQRSchema },
  preferred: {
    type: String,
    enum: ['venmo', 'cashapp', 'paypal', 'zelle', null],
    default: null
  },
}, { _id: false });

// Member schema
const PoolMemberSchema = new Schema({
  id: { type: Number },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  phone: { type: String },
  joinDate: { type: String },
  joinedDate: { type: Date, default: Date.now },
  role: {
    type: String,
    enum: Object.values(PoolMemberRole),
    required: true,
    default: PoolMemberRole.MEMBER
  },
  position: { type: Number, required: true },
  status: {
    type: String,
    enum: Object.values(PoolMemberStatus),
    required: true,
    default: PoolMemberStatus.ACTIVE
  },
  paymentsOnTime: { type: Number, default: 0 },
  paymentsMissed: { type: Number, default: 0 },
  missedPayments: { type: Number, default: 0 },
  totalContributed: { type: Number, default: 0 },
  payoutReceived: { type: Boolean, default: false },
  hasReceivedPayout: { type: Boolean, default: false },
  payoutDate: { type: String },
  contributionAmount: { type: Number },
  avatar: { type: String },
  // Member's payout methods (for when they win the pot)
  payoutMethods: { type: MemberPayoutMethodsSchema },
});

// Transaction schema
const PoolTransactionSchema = new Schema({
  id: { type: Number, required: true },
  type: {
    type: String,
    enum: Object.values(TransactionType),
    required: true
  },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  member: { type: String, required: true },
  status: { type: String, required: true },
  round: { type: Number }, // Track which round this transaction belongs to
  stripePaymentIntentId: { type: String },
  stripeTransferId: { type: String },
  // Early payout tracking fields
  scheduledPayoutDate: { type: String }, // Original scheduled date
  actualPayoutDate: { type: String }, // When payout actually occurred
  wasEarlyPayout: { type: Boolean, default: false },
  earlyPayoutInitiatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  earlyPayoutReason: { type: String },
});

// Message schema
const PoolMessageSchema = new Schema({
  id: { type: Number, required: true },
  author: { type: String, required: true },
  content: { type: String, required: true },
  date: { type: String, required: true },
});

// Main Pool schema
const PoolSchema = new Schema({
  id: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  createdAt: { type: String },
  creatorId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User'
  },
  status: { 
    type: String, 
    enum: Object.values(PoolStatus), 
    required: true,
    default: PoolStatus.ACTIVE
  },
  totalAmount: { type: Number, default: 0 },
  contributionAmount: { type: Number, required: true, min: 1, max: 20 },
  frequency: { type: String, required: true },
  startDate: { type: Date },
  currentRound: { type: Number, default: 0 },
  currentCycle: { type: Number, default: 0 },
  totalRounds: { type: Number },
  totalCycles: { type: Number },
  nextPayoutDate: { type: String },
  memberCount: { type: Number },
  maxMembers: { type: Number, default: 10 },
  members: [PoolMemberSchema],
  transactions: [PoolTransactionSchema],
  messages: [PoolMessageSchema],

  // Auto-collection settings
  autoCollectionEnabled: { type: Boolean, default: true },
  gracePeriodHours: { type: Number, default: 24 }, // Hours after due date before auto-collection
  collectionReminderHours: { type: Number, default: 48 }, // Hours before due date to send reminder

  // Allowed payment methods for this pool (selected by admin during creation)
  // All methods allowed by default if not specified
  allowedPaymentMethods: {
    type: [String],
    enum: ['venmo', 'cashapp', 'paypal', 'zelle'],
    default: ['venmo', 'cashapp', 'paypal', 'zelle']
  },

  // Admin's collection payment methods (where contributors send money to)
  adminPaymentMethods: {
    venmo: { type: String },
    cashapp: { type: String },
    paypal: { type: String },
    zelle: { type: String },
    zelleQR: { type: ZelleQRSchema },
    preferred: {
      type: String,
      enum: ['venmo', 'cashapp', 'paypal', 'zelle', null],
      default: null
    },
    updatedAt: { type: Date }
  },

  // Manual payment tracking for current round
  currentRoundPayments: [{
    memberId: { type: Number, required: true },
    memberName: { type: String },
    memberEmail: { type: String },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'member_confirmed', 'admin_verified', 'late', 'missed', 'excused'],
      default: 'pending'
    },
    memberConfirmedAt: { type: Date },
    memberConfirmedVia: {
      type: String,
      enum: ['venmo', 'cashapp', 'paypal', 'zelle', 'cash', 'other']
    },
    adminVerifiedAt: { type: Date },
    adminVerifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    adminNotes: { type: String },
    reminderSentAt: { type: Date },
    reminderCount: { type: Number, default: 0 },
    dueDate: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }],

  // Current round payout status
  currentRoundPayoutStatus: {
    type: String,
    enum: ['pending_collection', 'ready_to_pay', 'paid', 'completed'],
    default: 'pending_collection'
  },
  currentRoundPayoutCompletedAt: { type: Date },
  currentRoundPayoutMethod: {
    type: String,
    enum: ['venmo', 'cashapp', 'paypal', 'zelle', 'cash', 'other']
  },
  currentRoundPayoutNotes: { type: String },
  currentRoundPayoutConfirmedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Indexes
PoolSchema.index({ creatorId: 1, status: 1 });
PoolSchema.index({ 'members.email': 1 });

// Virtual for active member count
PoolSchema.virtual('activeMemberCount').get(function() {
  return this.members.filter(
    (m: any) => m.status === PoolMemberStatus.ACTIVE
  ).length;
});

// Function to initialize the model with checking for existing models
export function getPoolModel(): Model<any> {
  const modelName = 'Pool';
  return mongoose.models[modelName] || mongoose.model(modelName, PoolSchema);
}

export const Pool = getPoolModel();

export default getPoolModel;