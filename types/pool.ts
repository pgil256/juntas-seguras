/**
 * Types for pool-related features
 */

export enum PoolStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
}

export enum PoolMemberStatus {
  CURRENT = 'current',
  COMPLETED = 'completed',
  UPCOMING = 'upcoming',
}

export enum PoolMemberRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum TransactionType {
  CONTRIBUTION = 'contribution',
  PAYOUT = 'payout',
}

export interface PoolMember {
  id: number;
  name: string;
  email: string;
  phone?: string;
  joinDate: string;
  role: PoolMemberRole;
  position: number;
  status: PoolMemberStatus;
  paymentsOnTime: number;
  paymentsMissed: number;
  totalContributed: number;
  payoutReceived: boolean;
  payoutDate: string;
  avatar?: string;
}

export interface PoolInvitation {
  id: number;
  email: string;
  sentDate: string;
  status: InvitationStatus;
}

export interface PoolTransaction {
  id: number;
  type: TransactionType;
  amount: number;
  date: string;
  member: string;
  status: string;
}

export interface PoolMessage {
  id: number;
  author: string;
  content: string;
  date: string;
}

export interface Pool {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  status: PoolStatus;
  totalAmount: number;
  contributionAmount: number;
  frequency: string;
  currentRound: number;
  totalRounds: number;
  nextPayoutDate: string;
  memberCount: number;
  members: PoolMember[];
  transactions: PoolTransaction[];
  messages: PoolMessage[];
}

// API Request & Response Types
export interface CreatePoolRequest {
  name: string;
  description: string;
  contributionAmount: number;
  frequency: string;
  totalRounds: number;
  startDate?: string;
}

export interface UpdatePoolRequest {
  id: string;
  name?: string;
  description?: string;
  status?: PoolStatus;
}

export interface AddMemberRequest {
  poolId: string;
  memberDetails: {
    name: string;
    email: string;
    phone?: string;
    role?: PoolMemberRole;
    position?: number;
  };
}

export interface UpdateMemberRequest {
  poolId: string;
  memberId: number;
  updates: {
    name?: string;
    email?: string;
    phone?: string;
    role?: PoolMemberRole;
    position?: number;
    paymentsOnTime?: number;
    paymentsMissed?: number;
    payoutReceived?: boolean;
    payoutDate?: string;
  };
}

export interface RemoveMemberRequest {
  poolId: string;
  memberId: number;
}

export interface CreateInvitationRequest {
  poolId: string;
  email: string;
  name?: string;
  phone?: string;
}

export interface ResendInvitationRequest {
  poolId: string;
  invitationId: number;
}

export interface CancelInvitationRequest {
  poolId: string;
  invitationId: number;
}

export interface SendMessageRequest {
  poolId: string;
  content: string;
  recipientId?: number; // If null, send to all members
}

export interface UpdatePositionsRequest {
  poolId: string;
  positions: {
    memberId: number;
    position: number;
  }[];
}