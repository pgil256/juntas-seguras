import mongoose, { Schema, Document, Model } from 'mongoose';
import { TwoFactorMethod } from '../../../types/security';
import { VerificationStatus, VerificationType, VerificationMethod } from '../../../types/identity';

// Two-factor authentication schema (Email-only MFA)
const TwoFactorSchema = new Schema({
  enabled: { type: Boolean, default: false },
  method: { type: String, enum: ['app', 'email', 'totp'], default: 'email' },
  secret: { type: String },
  totpSecret: { type: String }, // For TOTP authenticator apps
  pendingTotpSecret: { type: String }, // Temporary secret during TOTP setup
  backupCodes: [{ type: String }],
  email: { type: String },
  lastUpdated: { type: String },
  verified: { type: Boolean, default: false },
  temporaryCode: { type: String }, // Used for verification during signup
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
  // Note: MongoDB automatically creates _id field, we don't use custom 'id' field anymore
  // Removed custom id field to avoid conflicts with MongoDB's _id
  // Use _id.toString() when you need the ID as a string
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  createdAt: { type: Date, required: true, default: Date.now },
  lastLogin: { type: Date },
  avatar: { type: String },
  hashedPassword: { type: String },
  // OAuth provider fields
  provider: { type: String, enum: ['credentials', 'google', 'azure-ad'], default: 'credentials' },
  providerId: { type: String }, // Provider's user ID
  emailVerified: { type: Boolean, default: false },
  pools: [{ type: String }], // Array of pool IDs the user belongs to
  // Verification fields
  verificationCode: { type: String },
  verificationExpiry: { type: Date },
  verificationMethod: { type: String, enum: ['email', 'app'], required: true },
  isVerified: { type: Boolean, default: false },
  isTemporary: { type: Boolean, default: false },
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
  // Stripe Connect account ID for receiving payouts (legacy - keeping for backwards compatibility)
  stripeConnectAccountId: { type: String },
  // Stripe Connect account status (legacy)
  stripePayoutsEnabled: { type: Boolean, default: false },
  stripeDetailsSubmitted: { type: Boolean, default: false },
  // Payout method preferences (simple alternative to Stripe Connect)
  // Single preferred payout method (for backwards compatibility)
  payoutMethod: {
    type: {
      type: String,
      enum: ['venmo', 'paypal', 'zelle', 'cashapp', 'bank'],
      default: null
    },
    // The handle/username/email/phone for the payout service
    handle: { type: String },
    // Display name for confirmation (e.g., "John's Venmo")
    displayName: { type: String },
    // When this was last updated
    updatedAt: { type: Date }
  },
  // Multiple payout methods - allows user to save all their payment accounts
  payoutMethods: {
    // Venmo handle (username, email, or phone)
    venmo: { type: String },
    // Cash App $cashtag (without the $ prefix)
    cashapp: { type: String },
    // PayPal.me username
    paypal: { type: String },
    // Zelle identifier (email or phone - display only, no deep link)
    zelle: { type: String },
    // Zelle QR code data (for scannable QR codes)
    zelleQR: {
      // Token extracted from the Zelle QR code
      token: { type: String },
      // Raw QR code content
      rawContent: { type: String },
      // Base64-encoded QR code image for display
      imageDataUrl: { type: String },
      // When the QR code was uploaded
      uploadedAt: { type: Date }
    },
    // Preferred payout method type
    preferred: {
      type: String,
      enum: ['venmo', 'paypal', 'zelle', 'cashapp', 'bank', null],
      default: null
    },
    // When this was last updated
    updatedAt: { type: Date }
  },
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
  metadata: { type: Map, of: String },
  resetToken: String,
  resetTokenExpiry: Date
}, {
  timestamps: true, // This will automatically manage createdAt and updatedAt
  versionKey: false // Disable the __v field
});

// Define the User document type
export interface UserDocument extends Document {
  // id is inherited from Document (_id.toString())
  name: string;
  email: string;
  phone?: string;
  createdAt: Date;
  lastLogin?: Date;
  avatar?: string;
  hashedPassword?: string;
  // OAuth provider fields
  provider?: 'credentials' | 'google' | 'azure-ad';
  providerId?: string;
  emailVerified?: boolean;
  pools: string[];
  verificationCode?: string;
  verificationExpiry?: Date;
  verificationMethod: 'email' | 'app';
  isVerified: boolean;
  isTemporary: boolean;
  twoFactorAuth: {
    enabled: boolean;
    method: TwoFactorMethod;
    secret?: string;
    totpSecret?: string;
    pendingTotpSecret?: string;
    backupCodes?: string[];
    email?: string;
    lastUpdated?: string;
    verified: boolean;
    temporaryCode?: string;
    codeGeneratedAt?: string;
  };
  pendingMfaVerification: boolean;
  mfaSetupComplete: boolean;
  mfaRequiredFor: {
    paymentMethods: boolean;
    profileChanges: boolean;
  };
  identityVerification?: {
    status: VerificationStatus;
    type?: VerificationType;
    method?: VerificationMethod;
    documentFrontId?: string;
    documentBackId?: string;
    selfieId?: string;
    stripeVerificationId?: string;
    stripeVerificationUrl?: string;
    submittedAt?: string;
    verifiedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    expiresAt?: string;
    lastUpdated: string;
  };
  identityVerified: boolean;
  stripeCustomerId?: string;
  stripeConnectAccountId?: string;
  stripePayoutsEnabled?: boolean;
  stripeDetailsSubmitted?: boolean;
  payoutMethod?: {
    type?: 'venmo' | 'paypal' | 'zelle' | 'cashapp' | 'bank' | null;
    handle?: string;
    displayName?: string;
    updatedAt?: Date;
  };
  payoutMethods?: {
    venmo?: string;
    cashapp?: string;
    paypal?: string;
    zelle?: string;
    zelleQR?: {
      token?: string;
      rawContent?: string;
      imageDataUrl?: string;
      uploadedAt?: Date;
    };
    preferred?: 'venmo' | 'paypal' | 'zelle' | 'cashapp' | 'bank' | null;
    updatedAt?: Date;
  };
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  dateOfBirth?: string;
  metadata?: Map<string, string>;
  resetToken?: string;
  resetTokenExpiry?: Date;
}

// Create and export the User model
export const User = mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);

// Also export the getUserModel function for backward compatibility
export function getUserModel(): Model<UserDocument> {
  return User;
}

export default User;