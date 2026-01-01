/**
 * Types for security-related features including 2FA and account activity logging
 * Note: SMS-based MFA has been removed. Only email and authenticator app methods are supported.
 */

// Two-factor authentication types (Email-only MFA - SMS removed)
export type TwoFactorMethod = 'app' | 'email';

export interface TwoFactorSetup {
  enabled: boolean;
  method: TwoFactorMethod;
  email?: string;
  secret?: string;
  backupCodes?: string[];
  lastUpdated: string;
}

// Activity logging types
export enum ActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  EMAIL_CHANGE = 'email_change',
  PHONE_CHANGE = 'phone_change',
  PROFILE_UPDATE = 'profile_update',
  SETTINGS_CHANGE = 'settings_change',
  TWO_FACTOR_SETUP = 'two_factor_setup',
  TWO_FACTOR_DISABLE = 'two_factor_disable',
  PAYMENT_METHOD_ADD = 'payment_method_add',
  PAYMENT_METHOD_REMOVE = 'payment_method_remove',
  POOL_JOIN = 'pool_join',
  POOL_CREATE = 'pool_create',
  PAYMENT_SENT = 'payment_sent',
  PAYMENT_RECEIVED = 'payment_received',
  ACCOUNT_RECOVERY = 'account_recovery',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

export interface ActivityLog {
  id: string;
  userId: string;
  type: ActivityType;
  timestamp: string;
  ipAddress?: string;
  deviceInfo?: {
    browser?: string;
    os?: string;
    device?: string;
  };
  location?: {
    city?: string;
    country?: string;
  };
  metadata?: Record<string, any>;
}

export interface ActivityLogResponse {
  logs: ActivityLog[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}