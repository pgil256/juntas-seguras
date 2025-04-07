import mongoose, { Schema, Document, Model } from 'mongoose';
import { TwoFactorMethod } from '../../../types/security';
import { VerificationStatus, VerificationType, VerificationMethod } from '../../../types/identity';

// Two-factor authentication schema
const TwoFactorSchema = new Schema({
  enabled: { type: Boolean, default: false },
  method: { type: String, enum: ['app', 'sms', 'email'] },
  secret: { type: String },
  backupCodes: [{ type: String }],
  phone: { type: String },
  email: { type: String },
  lastUpdated: { type: String },
  verified: { type: Boolean, default: false },
  temporaryCode: { type: String },
  codeGeneratedAt: { type: String }
});

// Identity verification schema
const IdentityVerificationSchema = new Schema({
  status: { 
    type: String, 
    enum: Object.values(VerificationStatus), 
    default: VerificationStatus.PENDING 
  },
  type: { 
    type: String, 
    enum: Object.values(VerificationType)
  },
  method: { 
    type: String, 
    enum: Object.values(VerificationMethod), 
    default: VerificationMethod.STRIPE_IDENTITY 
  },
  documentFrontId: { type: String },
  documentBackId: { type: String },
  selfieId: { type: String },
  stripeVerificationId: { type: String },
  stripeVerificationUrl: { type: String },
  submittedAt: { type: String },
  verifiedAt: { type: String },
  rejectedAt: { type: String },
  rejectionReason: { type: String },
  expiresAt: { type: String },
  lastUpdated: { type: String, required: true }
});

// User schema for basic authentication and user management
const UserSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  createdAt: { type: String, required: true },
  lastLogin: { type: String },
  avatar: { type: String },
  // Simple password hash - in a production app, use a proper password hashing library
  hashedPassword: { type: String },
  pools: [{ type: String }], // Array of pool IDs the user belongs to
  twoFactorAuth: { type: TwoFactorSchema, default: () => ({
    enabled: true, // MFA is required for all users
    method: 'email', // Default to email method
    verified: false, // Will be set to true after setup
    lastUpdated: new Date().toISOString(),
  }) },
  // For MFA session management during login flow
  pendingMfaVerification: { type: Boolean, default: false },
  // Track if user has completed MFA setup
  mfaSetupComplete: { type: Boolean, default: false },
  // Track actions requiring additional MFA verification
  mfaRequiredFor: {
    paymentMethods: { type: Boolean, default: true },
    profileChanges: { type: Boolean, default: true }
  },
  // Identity verification
  identityVerification: { type: IdentityVerificationSchema },
  // Track if user's identity has been verified
  identityVerified: { type: Boolean, default: false },
  // Stripe customer ID for payment processing
  stripeCustomerId: { type: String },
  // Stripe Connect account ID for receiving payouts
  stripeConnectAccountId: { type: String },
  // Address for KYC verification
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String }
  },
  // Date of birth for KYC verification
  dateOfBirth: { type: String },
  // Additional user metadata for KYC
  metadata: { type: Map, of: String }
});

// Function to initialize the model with checking for existing models
export function getUserModel(): Model<any> {
  const modelName = 'User';
  return mongoose.models[modelName] || mongoose.model(modelName, UserSchema);
}

export default getUserModel;