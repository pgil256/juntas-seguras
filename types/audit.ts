/**
 * Types for audit logging
 */

export enum AuditLogType {
  // User-related actions
  USER_REGISTER = 'user_register',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_UPDATE_PROFILE = 'user_update_profile',
  USER_SET_UP_2FA = 'user_setup_2fa',
  USER_VERIFY_2FA = 'user_verify_2fa',
  USER_RESET_PASSWORD = 'user_reset_password',
  USER_IDENTITY_VERIFICATION = 'user_identity_verification',
  USER_PAYMENT_METHOD_ADDED = 'user_payment_method_added',
  USER_PAYMENT_METHOD_DELETED = 'user_payment_method_deleted',
  
  // Pool-related actions
  POOL_CREATE = 'pool_create',
  POOL_UPDATE = 'pool_update',
  POOL_DELETE = 'pool_delete',
  POOL_JOIN = 'pool_join',
  POOL_LEAVE = 'pool_leave',
  POOL_MEMBER_ADD = 'pool_member_add',
  POOL_MEMBER_REMOVE = 'pool_member_remove',
  POOL_MEMBER_UPDATE = 'pool_member_update',
  POOL_INVITATION_SEND = 'pool_invitation_send',
  POOL_INVITATION_ACCEPT = 'pool_invitation_accept',
  POOL_INVITATION_REJECT = 'pool_invitation_reject',
  POOL_MESSAGE_SEND = 'pool_message_send',
  
  // Payment-related actions
  PAYMENT_CONTRIBUTION = 'payment_contribution',
  PAYMENT_PAYOUT = 'payment_payout',
  PAYMENT_ESCROW = 'payment_escrow',
  PAYMENT_ESCROW_RELEASE = 'payment_escrow_release',
  PAYMENT_REFUND = 'payment_refund',
  PAYMENT_SCHEDULED = 'payment_scheduled',
  PAYMENT_CANCELLED = 'payment_cancelled',
  
  // Administrative actions
  ADMIN_ACTION = 'admin_action',
  SYSTEM_ERROR = 'system_error',
  SECURITY_EVENT = 'security_event',

  // Generic types for Stripe integration
  PAYMENT = 'payment',
  ACCOUNT = 'account',
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail?: string;
  type: AuditLogType;
  action: string;
  ip?: string;
  userAgent?: string;
  metadata: Record<string, any>;
  poolId?: string;
  success: boolean;
  errorMessage?: string;
}

export interface AuditLogCreateRequest {
  userId: string;
  type: AuditLogType;
  action: string;
  metadata: Record<string, any>;
  poolId?: string;
  success: boolean;
  errorMessage?: string;
}

export interface AuditLogResponse {
  success: boolean;
  log?: AuditLog;
  error?: string;
}

export interface AuditLogQueryParams {
  userId?: string;
  poolId?: string;
  type?: AuditLogType | AuditLogType[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogQueryResponse {
  success: boolean;
  logs: AuditLog[];
  total: number;
  error?: string;
}