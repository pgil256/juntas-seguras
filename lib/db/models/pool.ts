import mongoose, { Schema, Document, Model } from 'mongoose';
import { Pool as PoolType, PoolStatus, PoolMemberStatus, PoolMemberRole, TransactionType } from '../../../types/pool';

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