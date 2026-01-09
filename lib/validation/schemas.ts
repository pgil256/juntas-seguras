/**
 * Zod validation schemas for API input validation
 *
 * These schemas provide type-safe validation at API boundaries,
 * ensuring data integrity before processing.
 */

import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

export const ObjectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId format');

export const EmailSchema = z.string().email('Invalid email format').toLowerCase();

export const PhoneSchema = z.string().regex(
  /^\+?[1-9]\d{1,14}$/,
  'Invalid phone number format'
).optional();

// ============================================================================
// Pool Schemas
// ============================================================================

export const PoolFrequencySchema = z.enum(['weekly', 'biweekly', 'monthly']);

export const PoolStatusSchema = z.enum(['pending', 'active', 'completed', 'cancelled']);

export const PaymentMethodTypeSchema = z.enum(['venmo', 'cashapp', 'paypal', 'zelle']);

export const CreatePoolSchema = z.object({
  name: z.string()
    .min(3, 'Pool name must be at least 3 characters')
    .max(100, 'Pool name must be less than 100 characters')
    .trim(),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .default(''),
  contributionAmount: z.number()
    .int('Contribution must be a whole number')
    .min(1, 'Contribution must be at least $1')
    .max(20, 'Contribution must be at most $20'),
  totalRounds: z.number()
    .int('Total rounds must be a whole number')
    .min(2, 'Pool must have at least 2 rounds')
    .max(20, 'Pool can have at most 20 rounds'),
  frequency: PoolFrequencySchema.optional().default('weekly'),
  startDate: z.string().datetime().optional(),
  allowedPaymentMethods: z.array(PaymentMethodTypeSchema).optional(),
  invitations: z.array(EmailSchema).optional(),
});

export const UpdatePoolSchema = z.object({
  name: z.string()
    .min(3, 'Pool name must be at least 3 characters')
    .max(100, 'Pool name must be less than 100 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  status: PoolStatusSchema.optional(),
  contributionAmount: z.number()
    .min(1, 'Contribution must be at least $1')
    .max(20, 'Contribution must be at most $20')
    .optional(),
  frequency: PoolFrequencySchema.optional(),
  maxMembers: z.number()
    .min(2, 'Pool must have at least 2 members')
    .max(20, 'Pool can have at most 20 members')
    .optional(),
  nextPayoutDate: z.string().datetime().optional(),
});

// ============================================================================
// Member Schemas
// ============================================================================

export const InviteMemberSchema = z.object({
  email: EmailSchema,
  name: z.string().min(1).max(100).optional(),
  phone: PhoneSchema,
});

export const InviteMembersSchema = z.object({
  members: z.array(InviteMemberSchema).min(1).max(20),
});

// ============================================================================
// Payment Schemas
// ============================================================================

export const PaymentMethodSchema = z.enum(['venmo', 'cashapp', 'paypal', 'zelle', 'cash', 'other']);

export const AdminPaymentMethodsSchema = z.object({
  venmo: z.string().max(50).optional().nullable(),
  cashapp: z.string().max(50).optional().nullable(),
  paypal: z.string().max(100).optional().nullable(),
  zelle: z.string().max(100).optional().nullable(),
  preferred: PaymentMethodTypeSchema.optional().nullable(),
});

export const ConfirmPayoutSchema = z.object({
  method: PaymentMethodSchema,
  notes: z.string().max(500).optional(),
});

export const PaymentActionSchema = z.object({
  action: z.enum([
    'member_confirm',
    'admin_verify',
    'dispute',
    'mark_late',
    'excuse',
    'send_reminder'
  ]),
  method: PaymentMethodSchema.optional(),
  notes: z.string().max(500).optional(),
});

// ============================================================================
// MFA Schemas
// ============================================================================

export const MfaCodeSchema = z.object({
  code: z.string()
    .min(6, 'Code must be 6 digits')
    .max(6, 'Code must be 6 digits')
    .regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export const TotpCodeSchema = z.object({
  code: z.string()
    .min(6, 'Code must be at least 6 characters')
    .max(8, 'Code must be at most 8 characters'),
});

// ============================================================================
// User Schemas
// ============================================================================

export const UpdateProfileSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  phone: PhoneSchema,
  avatar: z.string().url().optional().nullable(),
});

export const PayoutMethodsSchema = z.object({
  venmo: z.string().max(50).optional().nullable(),
  cashapp: z.string().max(50).optional().nullable(),
  paypal: z.string().max(100).optional().nullable(),
  zelle: z.string().max(100).optional().nullable(),
  preferred: z.enum(['venmo', 'cashapp', 'paypal', 'zelle', 'bank']).optional().nullable(),
});

// ============================================================================
// Discussion Schemas
// ============================================================================

export const CreateDiscussionSchema = z.object({
  content: z.string()
    .min(1, 'Content is required')
    .max(5000, 'Content must be less than 5000 characters'),
  parentId: ObjectIdSchema.optional(),
});

export const UpdateDiscussionSchema = z.object({
  content: z.string()
    .min(1, 'Content is required')
    .max(5000, 'Content must be less than 5000 characters'),
});

// ============================================================================
// Zelle QR Schema
// ============================================================================

export const ZelleQrUploadSchema = z.object({
  imageDataUrl: z.string()
    .startsWith('data:image/', 'Invalid image format')
    .max(5 * 1024 * 1024, 'Image must be less than 5MB'),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates request body against a schema and returns typed result
 */
export async function validateRequestBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; error: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
      return { success: false, error: errors.join(', ') };
    }

    return { success: true, data: result.data };
  } catch {
    return { success: false, error: 'Invalid JSON body' };
  }
}

/**
 * Type-safe wrapper for validating and extracting request body
 * Throws an error with formatted message if validation fails
 */
export async function parseRequestBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  const result = await validateRequestBody(request, schema);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}
