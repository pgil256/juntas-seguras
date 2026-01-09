/**
 * Shared types for CreatePoolModal components
 */

import { PaymentMethodType } from '../../../types/pool';

export interface PoolFormData {
  name: string;
  contributionAmount: string;
  frequency: string;
  totalMembers: string;
  duration: string;
  startDate: string;
  description: string;
  inviteMethod: string;
  emails: string;
  allowedPaymentMethods: PaymentMethodType[];
}

export interface FieldErrors {
  [key: string]: string;
}

export interface TouchedFields {
  [key: string]: boolean;
}

export interface StepProps {
  poolData: PoolFormData;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
  onFieldBlur: (name: string, value: string) => void;
  fieldErrors: FieldErrors;
  touchedFields: TouchedFields;
}

// Available payment methods with labels
export const AVAILABLE_PAYMENT_METHODS: { value: PaymentMethodType; label: string }[] = [
  { value: 'venmo', label: 'Venmo' },
  { value: 'cashapp', label: 'Cash App' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'zelle', label: 'Zelle' },
];
