/**
 * Types for payment-related features
 * Updated for PayPal integration
 */

// Payment method types
export type PaymentMethodType = 'paypal' | 'card' | 'bank';

export interface PaymentMethod {
  id: number;
  type: PaymentMethodType;
  name: string;
  last4: string;
  isDefault: boolean;
  // PayPal-specific fields
  paypalEmail?: string;
  // Card-specific fields
  cardholderName?: string;
  expiryMonth?: string;
  expiryYear?: string;
  // Bank-specific fields
  accountHolderName?: string;
  accountType?: 'checking' | 'savings';
}

// Payment transaction types
export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  REFUND = 'refund',
  FEE = 'fee',
  ESCROW = 'escrow',
  ESCROW_RELEASE = 'escrow_release',
  CONTRIBUTION = 'contribution',
  PAYOUT = 'payout',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SCHEDULED = 'scheduled',
  CANCELLED = 'cancelled',
  ESCROWED = 'escrowed',
  RELEASED = 'released',
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  fee?: number;
  date: string;
  status: TransactionStatus;
  description: string;
  member: string;
  poolId?: string;
  paymentMethodId?: number;
  scheduledDate?: string;
  processedAt?: string;
  failureReason?: string;
  escrowId?: string;
  releaseDate?: string;
  // PayPal-specific fields
  paypalOrderId?: string;
  paypalAuthorizationId?: string;
  paypalCaptureId?: string;
  paypalPayoutBatchId?: string;
}

// Payment processing types
export interface PaymentDetails {
  poolName: string;
  amount: number;
  dueDate: string;
  paymentMethods: PaymentMethod[];
}

export interface PaymentProcessRequest {
  userId: string;
  poolId: string;
  amount: number;
  paymentMethodId: number;
  scheduleForLater: boolean;
  scheduledDate?: string;
  useEscrow: boolean;
  escrowReleaseDate?: string;
}

export interface PaymentProcessResponse {
  success: boolean;
  payment?: Transaction;
  paypalOrderId?: string;
  approvalUrl?: string;
  message?: string;
  error?: string;
}

// Payment method form types
export interface PaymentMethodFormValues {
  type: PaymentMethodType;
  // PayPal fields
  paypalEmail?: string;
  // Card fields
  cardholderName?: string;
  cardNumber?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cvv?: string;
  // Bank fields
  accountHolderName?: string;
  accountNumber?: string;
  routingNumber?: string;
  accountType?: 'checking' | 'savings';
  isDefault: boolean;
}

export interface PaymentMethodRequest {
  userId: string;
  type: PaymentMethodType;
  isDefault: boolean;
  // PayPal fields
  paypalEmail?: string;
  // Card fields
  cardholderName?: string;
  cardNumber?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cvv?: string;
  // Bank fields
  accountHolderName?: string;
  accountNumber?: string;
  routingNumber?: string;
  accountType?: 'checking' | 'savings';
}

export interface PaymentMethodResponse {
  success: boolean;
  method?: PaymentMethod;
  error?: string;
}

// PayPal-specific types
export interface PayPalOrderResponse {
  success: boolean;
  orderId?: string;
  approvalUrl?: string;
  status?: string;
  error?: string;
}

export interface PayPalAuthorizationResponse {
  success: boolean;
  orderId?: string;
  authorizationId?: string;
  status?: string;
  error?: string;
}

export interface PayPalCaptureResponse {
  success: boolean;
  captureId?: string;
  status?: string;
  error?: string;
}

export interface PayPalPayoutResponse {
  success: boolean;
  payoutBatchId?: string;
  batchStatus?: string;
  error?: string;
}
