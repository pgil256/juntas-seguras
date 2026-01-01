/**
 * Environment variable validation
 * This module validates required environment variables on application startup
 */

/**
 * Required environment variables for the application
 */
const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
];

/**
 * Production-only required environment variables
 */
const PRODUCTION_REQUIRED_ENV_VARS = [
  'EMAIL_SERVER',
  'EMAIL_FROM',
];

/**
 * Validates that all required environment variables are set
 * Throws an error if any required variable is missing
 */
export function validateEnvVars() {
  const missingVars: string[] = [];

  // Check required vars for all environments
  REQUIRED_ENV_VARS.forEach(envVar => {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  });

  // Check production-only vars
  if (process.env.NODE_ENV === 'production') {
    PRODUCTION_REQUIRED_ENV_VARS.forEach(envVar => {
      if (!process.env[envVar]) {
        missingVars.push(envVar);
      }
    });
  }

  // Throw error if any required vars are missing
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}. Please check your .env file.`
    );
  }

  // Validate MongoDB URI format
  const mongoUri = process.env.MONGODB_URI || '';
  if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    throw new Error('MONGODB_URI must be a valid MongoDB connection string');
  }

  // In production, validate that we're not using test keys for Stripe
  if (process.env.NODE_ENV === 'production') {
    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    if (stripeKey.startsWith('sk_test_')) {
      throw new Error('Production environment is using Stripe test keys. Please use production keys.');
    }
  }

  return true;
}

/**
 * Validates environment variables specific to a feature
 * @param feature The feature to validate environment variables for
 */
export function validateFeatureEnvVars(feature: 'email' | 'stripe') {
  switch (feature) {
    case 'email':
      if (!process.env.EMAIL_SERVER || !process.env.EMAIL_FROM) {
        throw new Error('Email feature requires EMAIL_SERVER and EMAIL_FROM environment variables');
      }
      break;
    case 'stripe':
      if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PUBLISHABLE_KEY) {
        throw new Error('Stripe feature requires STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY environment variables');
      }
      break;
    default:
      throw new Error(`Unknown feature: ${feature}`);
  }

  return true;
}