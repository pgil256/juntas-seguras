/**
 * Types for identity verification
 */

export enum VerificationStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum VerificationType {
  GOVERNMENT_ID = 'government_id',
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
  RESIDENCE_PERMIT = 'residence_permit',
}

export enum VerificationMethod {
  DOCUMENT_UPLOAD = 'document_upload',
  STRIPE_IDENTITY = 'stripe_identity',
  MANUAL_REVIEW = 'manual_review',
}

export interface IdentityVerification {
  id: string;
  userId: string;
  status: VerificationStatus;
  type: VerificationType;
  method: VerificationMethod;
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
}

export interface VerificationRequest {
  userId: string;
  type: VerificationType;
  method: VerificationMethod;
}

export interface VerificationResponse {
  success: boolean;
  verification?: IdentityVerification;
  verificationUrl?: string;
  message?: string;
  error?: string;
}

export interface VerificationStatusResponse {
  success: boolean;
  status: VerificationStatus;
  verification?: IdentityVerification;
  error?: string;
}

export interface UserIdentityInfo {
  isVerified: boolean;
  verificationStatus?: VerificationStatus;
  verificationType?: VerificationType;
  verificationMethod?: VerificationMethod;
  lastUpdated?: string;
}