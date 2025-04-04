import mongoose, { Schema, Document, Model } from 'mongoose';
import { Pool, PoolStatus, PoolMemberStatus, PoolMemberRole, TransactionType } from '@/types/pool';

// Member schema
const PoolMemberSchema = new Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  joinDate: { type: String, required: true },
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
    default: PoolMemberStatus.UPCOMING
  },
  paymentsOnTime: { type: Number, default: 0 },
  paymentsMissed: { type: Number, default: 0 },
  totalContributed: { type: Number, default: 0 },
  payoutReceived: { type: Boolean, default: false },
  payoutDate: { type: String, required: true },
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
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  createdAt: { type: String, required: true },
  status: { 
    type: String, 
    enum: Object.values(PoolStatus), 
    required: true,
    default: PoolStatus.ACTIVE
  },
  totalAmount: { type: Number, default: 0 },
  contributionAmount: { type: Number, required: true },
  frequency: { type: String, required: true },
  currentRound: { type: Number, default: 0 },
  totalRounds: { type: Number, required: true },
  nextPayoutDate: { type: String, required: true },
  memberCount: { type: Number, required: true },
  members: [PoolMemberSchema],
  transactions: [PoolTransactionSchema],
  messages: [PoolMessageSchema],
});

// Function to initialize the model with checking for existing models
export function getPoolModel(): Model<any> {
  const modelName = 'Pool';
  return mongoose.models[modelName] || mongoose.model(modelName, PoolSchema);
}

export default getPoolModel;