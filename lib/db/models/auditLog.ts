import mongoose, { Schema, Model } from 'mongoose';
import { AuditLogType } from '@/types/audit';

// Audit log schema for tracking all system actions
const AuditLogSchema = new Schema({
  id: { type: String, required: true, unique: true },
  timestamp: { type: String, required: true },
  userId: { type: String, required: true },
  userEmail: { type: String },
  type: { 
    type: String, 
    enum: Object.values(AuditLogType), 
    required: true 
  },
  action: { type: String, required: true },
  ip: { type: String },
  userAgent: { type: String },
  metadata: { type: Map, of: Schema.Types.Mixed },
  poolId: { type: String },
  success: { type: Boolean, required: true },
  errorMessage: { type: String },
});

// Add indexes for common queries
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ poolId: 1, timestamp: -1 });
AuditLogSchema.index({ type: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 });

// Function to initialize the model with checking for existing models
export function getAuditLogModel(): Model<any> {
  const modelName = 'AuditLog';
  return mongoose.models[modelName] || mongoose.model(modelName, AuditLogSchema);
}

export default getAuditLogModel;