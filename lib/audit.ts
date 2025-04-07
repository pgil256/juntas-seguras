import { AuditLogType } from '@/types/audit';

/**
 * Creates an audit log entry in the system
 * @param userId The ID of the user performing the action
 * @param type The type of action from AuditLogType enum
 * @param action A descriptive string of the action
 * @param metadata Additional data relevant to the action
 * @param poolId Optional pool ID if the action is related to a specific pool
 * @param success Whether the action was successful
 * @param errorMessage Optional error message if the action failed
 */
export async function createAuditLog(
  userId: string,
  type: AuditLogType,
  action: string,
  metadata: Record<string, any> = {},
  poolId?: string,
  success: boolean = true,
  errorMessage?: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/audit/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        type,
        action,
        metadata,
        poolId,
        success,
        errorMessage,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error creating audit log:', data.error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error creating audit log:', error);
    return false;
  }
}

/**
 * Helper to log user registration
 */
export async function logUserRegistration(
  userId: string,
  email: string,
  success: boolean = true,
  errorMessage?: string
): Promise<boolean> {
  return createAuditLog(
    userId,
    AuditLogType.USER_REGISTER,
    'User registration',
    { email },
    undefined,
    success,
    errorMessage
  );
}

/**
 * Helper to log user login
 */
export async function logUserLogin(
  userId: string,
  email: string,
  success: boolean = true,
  errorMessage?: string
): Promise<boolean> {
  return createAuditLog(
    userId,
    AuditLogType.USER_LOGIN,
    'User login',
    { email },
    undefined,
    success,
    errorMessage
  );
}

/**
 * Helper to log payment contributions
 */
export async function logPaymentContribution(
  userId: string,
  poolId: string,
  amount: number,
  paymentId: string,
  paymentMethodId: number,
  success: boolean = true,
  errorMessage?: string
): Promise<boolean> {
  return createAuditLog(
    userId,
    AuditLogType.PAYMENT_CONTRIBUTION,
    'Payment contribution',
    { 
      amount, 
      paymentId, 
      paymentMethodId 
    },
    poolId,
    success,
    errorMessage
  );
}

/**
 * Helper to log escrow payments
 */
export async function logEscrowPayment(
  userId: string,
  poolId: string,
  amount: number,
  paymentId: string,
  paymentMethodId: number,
  escrowReleaseDate: string,
  success: boolean = true,
  errorMessage?: string
): Promise<boolean> {
  return createAuditLog(
    userId,
    AuditLogType.PAYMENT_ESCROW,
    'Escrow payment',
    { 
      amount, 
      paymentId, 
      paymentMethodId,
      escrowReleaseDate
    },
    poolId,
    success,
    errorMessage
  );
}

/**
 * Helper to log escrow payment releases
 */
export async function logEscrowRelease(
  userId: string,
  poolId: string,
  amount: number,
  paymentId: string,
  releasedById: string,
  success: boolean = true,
  errorMessage?: string
): Promise<boolean> {
  return createAuditLog(
    userId,
    AuditLogType.PAYMENT_ESCROW_RELEASE,
    'Escrow payment release',
    { 
      amount, 
      paymentId,
      releasedById
    },
    poolId,
    success,
    errorMessage
  );
}

/**
 * Helper to log pool payouts
 */
export async function logPoolPayout(
  userId: string,
  poolId: string,
  amount: number,
  paymentId: string,
  recipientId: string,
  round: number,
  success: boolean = true,
  errorMessage?: string
): Promise<boolean> {
  return createAuditLog(
    userId,
    AuditLogType.PAYMENT_PAYOUT,
    'Pool payout',
    { 
      amount, 
      paymentId,
      recipientId,
      round
    },
    poolId,
    success,
    errorMessage
  );
}

/**
 * Helper to log identity verification events
 */
export async function logIdentityVerification(
  userId: string,
  verificationType: string,
  verificationId: string,
  status: string,
  success: boolean = true,
  errorMessage?: string
): Promise<boolean> {
  return createAuditLog(
    userId,
    AuditLogType.USER_IDENTITY_VERIFICATION,
    'Identity verification',
    { 
      verificationType,
      verificationId,
      status
    },
    undefined,
    success,
    errorMessage
  );
}