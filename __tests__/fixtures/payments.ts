import { faker } from '@faker-js/faker';

/**
 * Payment test fixture factory
 * Creates mock payment data for testing purposes
 */

export type PaymentMethodType = 'venmo' | 'paypal' | 'cashapp' | 'zelle';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface TestPaymentMethod {
  type: PaymentMethodType;
  value: string;
  isPrimary: boolean;
  displayName?: string;
  zelleQrData?: string;
}

export interface TestPayment {
  poolId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  status: PaymentStatus;
  paymentMethod: PaymentMethodType;
  round: number;
  confirmedAt?: Date;
  verifiedAt?: Date;
  transactionId?: string;
}

/**
 * Creates a test payment method with optional overrides
 */
export const createPaymentMethod = (
  type: PaymentMethodType,
  overrides: Partial<TestPaymentMethod> = {}
): TestPaymentMethod => {
  const defaults: Record<PaymentMethodType, Partial<TestPaymentMethod>> = {
    venmo: {
      value: `@${faker.internet.username().toLowerCase()}`,
      displayName: 'Venmo',
    },
    paypal: {
      value: faker.internet.email().toLowerCase(),
      displayName: 'PayPal',
    },
    cashapp: {
      value: `$${faker.internet.username().toLowerCase()}`,
      displayName: 'Cash App',
    },
    zelle: {
      value: faker.phone.number('###-###-####'),
      displayName: 'Zelle',
    },
  };

  return {
    type,
    isPrimary: false,
    ...defaults[type],
    ...overrides,
  } as TestPaymentMethod;
};

/**
 * Creates a full set of payment methods
 */
export const createAllPaymentMethods = (): TestPaymentMethod[] => [
  createPaymentMethod('venmo', { isPrimary: true }),
  createPaymentMethod('paypal'),
  createPaymentMethod('cashapp'),
  createPaymentMethod('zelle'),
];

/**
 * Creates a test payment with optional overrides
 */
export const createTestPayment = (
  poolId: string,
  fromUserId: string,
  toUserId: string,
  overrides: Partial<TestPayment> = {}
): TestPayment => ({
  poolId,
  fromUserId,
  toUserId,
  amount: 10,
  status: 'pending',
  paymentMethod: 'venmo',
  round: 1,
  ...overrides,
});

/**
 * Creates a completed payment
 */
export const createCompletedPayment = (
  poolId: string,
  fromUserId: string,
  toUserId: string,
  overrides: Partial<TestPayment> = {}
): TestPayment =>
  createTestPayment(poolId, fromUserId, toUserId, {
    status: 'completed',
    confirmedAt: new Date(),
    verifiedAt: new Date(),
    transactionId: faker.string.uuid(),
    ...overrides,
  });

/**
 * Creates a confirmed but not verified payment
 */
export const createConfirmedPayment = (
  poolId: string,
  fromUserId: string,
  toUserId: string,
  overrides: Partial<TestPayment> = {}
): TestPayment =>
  createTestPayment(poolId, fromUserId, toUserId, {
    status: 'pending',
    confirmedAt: new Date(),
    ...overrides,
  });

/**
 * Pre-defined test payment methods
 */
export const testPaymentMethods = {
  venmo: createPaymentMethod('venmo', {
    value: '@testvenmo',
    isPrimary: true,
  }),
  paypal: createPaymentMethod('paypal', {
    value: 'test@paypal.com',
    isPrimary: false,
  }),
  cashapp: createPaymentMethod('cashapp', {
    value: '$testcashapp',
    isPrimary: false,
  }),
  zelle: createPaymentMethod('zelle', {
    value: '555-123-4567',
    isPrimary: false,
  }),
  zelleWithQr: createPaymentMethod('zelle', {
    value: '555-123-4567',
    isPrimary: false,
    zelleQrData: 'base64encodedqrdata',
  }),
};

/**
 * Generate payment history for a pool
 */
export const generatePaymentHistory = (
  poolId: string,
  memberIds: string[],
  adminId: string,
  rounds: number
): TestPayment[] => {
  const payments: TestPayment[] = [];

  for (let round = 1; round <= rounds; round++) {
    const recipientId = round === 1 ? adminId : memberIds[round - 2];

    // All members (including recipient) make contributions
    const allMembers = [adminId, ...memberIds];
    allMembers.forEach((memberId) => {
      payments.push(
        createCompletedPayment(poolId, memberId, recipientId, {
          round,
          amount: 10,
        })
      );
    });
  }

  return payments;
};

/**
 * Validates payment method format
 */
export const isValidPaymentMethodValue = (
  type: PaymentMethodType,
  value: string
): boolean => {
  switch (type) {
    case 'venmo':
      return /^@[\w.]+$/.test(value);
    case 'paypal':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    case 'cashapp':
      return /^\$[\w]+$/.test(value);
    case 'zelle':
      // Phone or email
      return (
        /^\d{3}-\d{3}-\d{4}$/.test(value) ||
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      );
    default:
      return false;
  }
};
