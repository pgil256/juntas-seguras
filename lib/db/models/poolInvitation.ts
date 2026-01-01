import mongoose, { Schema, Document, Model } from 'mongoose';
import { InvitationStatus } from '../../../types/pool';

/**
 * Pool Invitation Schema
 * Stores pending and processed invitations to join pools
 */
const PoolInvitationSchema = new Schema({
  poolId: { 
    type: String, 
    required: true,
    index: true 
  },
  email: { 
    type: String, 
    required: true,
    lowercase: true,
    trim: true 
  },
  name: { 
    type: String,
    trim: true 
  },
  phone: { 
    type: String,
    trim: true 
  },
  invitedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  invitationCode: { 
    type: String, 
    required: true,
    unique: true
  },
  status: { 
    type: String, 
    enum: Object.values(InvitationStatus), 
    default: InvitationStatus.PENDING,
    required: true 
  },
  sentDate: { 
    type: Date, 
    default: Date.now,
    required: true 
  },
  expiresAt: { 
    type: Date,
    required: true,
    index: true 
  },
  acceptedDate: { 
    type: Date 
  },
  rejectedDate: { 
    type: Date 
  },
  acceptedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  },
  message: { 
    type: String,
    maxlength: 500 
  },
  metadata: { 
    type: Map, 
    of: String 
  },
  emailSent: { 
    type: Boolean, 
    default: false 
  },
  emailSentAt: { 
    type: Date 
  },
  reminderSent: { 
    type: Boolean, 
    default: false 
  },
  reminderSentAt: { 
    type: Date 
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for efficient queries
PoolInvitationSchema.index({ poolId: 1, email: 1 }, { unique: true });
PoolInvitationSchema.index({ status: 1, expiresAt: 1 });
PoolInvitationSchema.index({ invitedBy: 1, createdAt: -1 });

// Virtual for checking if invitation is expired
PoolInvitationSchema.virtual('isExpired').get(function() {
  return this.status === InvitationStatus.PENDING && 
         new Date() > this.expiresAt;
});

// Method to accept invitation
PoolInvitationSchema.methods.accept = async function(userId: string) {
  this.status = InvitationStatus.ACCEPTED;
  this.acceptedDate = new Date();
  this.acceptedBy = userId;
  return this.save();
};

// Method to reject invitation
PoolInvitationSchema.methods.reject = async function(reason?: string) {
  this.status = InvitationStatus.REJECTED;
  this.rejectedDate = new Date();
  if (reason) {
    this.message = reason;
  }
  return this.save();
};

// Method to mark as expired
PoolInvitationSchema.methods.expire = async function() {
  this.status = InvitationStatus.EXPIRED;
  return this.save();
};

// Static method to find valid invitation by code
PoolInvitationSchema.statics.findValidByCode = async function(code: string) {
  const invitation = await this.findOne({ 
    invitationCode: code,
    status: InvitationStatus.PENDING
  });
  
  if (!invitation) {
    return null;
  }
  
  // Check if expired
  if (new Date() > invitation.expiresAt) {
    await invitation.expire();
    return null;
  }
  
  return invitation;
};

// Static method to clean up expired invitations
PoolInvitationSchema.statics.cleanupExpired = async function() {
  const now = new Date();
  const result = await this.updateMany(
    {
      status: InvitationStatus.PENDING,
      expiresAt: { $lt: now }
    },
    {
      $set: { status: InvitationStatus.EXPIRED }
    }
  );
  return result.modifiedCount;
};

// Define the PoolInvitation document type
export interface PoolInvitationDocument extends Document {
  poolId: string;
  email: string;
  name?: string;
  phone?: string;
  invitedBy: mongoose.Types.ObjectId;
  invitationCode: string;
  status: InvitationStatus;
  sentDate: Date;
  expiresAt: Date;
  acceptedDate?: Date;
  rejectedDate?: Date;
  acceptedBy?: mongoose.Types.ObjectId;
  message?: string;
  metadata?: Map<string, string>;
  emailSent: boolean;
  emailSentAt?: Date;
  reminderSent: boolean;
  reminderSentAt?: Date;
  isExpired: boolean;
  accept(userId: string): Promise<PoolInvitationDocument>;
  reject(reason?: string): Promise<PoolInvitationDocument>;
  expire(): Promise<PoolInvitationDocument>;
}

// Define static methods interface
export interface PoolInvitationModel extends Model<PoolInvitationDocument> {
  findValidByCode(code: string): Promise<PoolInvitationDocument | null>;
  cleanupExpired(): Promise<number>;
}

// Export the model
export const PoolInvitation = (mongoose.models.PoolInvitation ||
  mongoose.model<PoolInvitationDocument, PoolInvitationModel>('PoolInvitation', PoolInvitationSchema)) as PoolInvitationModel;

// Export getter function for consistency
export function getPoolInvitationModel(): PoolInvitationModel {
  return PoolInvitation;
}

export default PoolInvitation;