/**
 * Types for payment-related features
 */

// Payment method types
export type PaymentMethodType = 'card' | 'bank';

export interface PaymentMethod {
  id: number;
  type: PaymentMethodType;
  name: string;
  last4: string;
  isDefault: boolean;
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
  stripePaymentIntentId?: string;
  stripeTransferId?: string;
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
  message?: string;
  error?: string;
}

// Payment method form types
export interface PaymentMethodFormValues {
  type: PaymentMethodType;
  cardholderName?: string;
  cardNumber?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cvv?: string;
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