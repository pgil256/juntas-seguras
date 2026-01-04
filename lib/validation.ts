/**
 * Environment variable validation
 * This module validates required environment variables on application startup
 */

type EnvVarConfig = {
  name: string;
  required: boolean | 'production';
  validate?: (value: string) => boolean;
  errorMessage?: string;
};

/**
 * Environment variable configuration with validation rules
 */
const ENV_VAR_CONFIG: EnvVarConfig[] = [
  // Database
  {
    name: 'MONGODB_URI',
    required: true,
    validate: (v) => v.startsWith('mongodb://') || v.startsWith('mongodb+srv://'),
    errorMessage: 'MONGODB_URI must be a valid MongoDB connection string (mongodb:// or mongodb+srv://)',
  },
  // Authentication
  {
    name: 'NEXTAUTH_URL',
    required: true,
    validate: (v) => v.startsWith('http://') || v.startsWith('https://'),
    errorMessage: 'NEXTAUTH_URL must be a valid URL',
  },
  {
    name: 'NEXTAUTH_SECRET',
    required: true,
    validate: (v) => v.length >= 32,
    errorMessage: 'NEXTAUTH_SECRET must be at least 32 characters long',
  },
  // Email
  {
    name: 'EMAIL_USER',
    required: true,
  },
  {
    name: 'EMAIL_PASSWORD',
    required: true,
  },
  {
    name: 'EMAIL_FROM',
    required: 'production',
  },
  // Stripe (primary payment processor)
  {
    name: 'STRIPE_SECRET_KEY',
    required: true,
  },
  {
    name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    required: true,
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: 'production',
  },
  // App URL
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: 'production',
    validate: (v) => v.startsWith('https://'),
    errorMessage: 'NEXT_PUBLIC_APP_URL must use HTTPS in production',
  },
];

/**
 * Result of environment variable validation
 */
export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

/**
 * Validates that all required environment variables are set
 * Returns validation result with errors and warnings
 */
export function validateEnvVars(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  for (const config of ENV_VAR_CONFIG) {
    const value = process.env[config.name];
    const isRequired = config.required === true || (config.required === 'production' && isProduction);

    // Check if required variable is missing
    if (isRequired && !value) {
      errors.push(`Missing required environment variable: ${config.name}`);
      continue;
    }

    // Skip validation if value is not set (optional var)
    if (!value) {
      continue;
    }

    // Run custom validation if provided
    if (config.validate && !config.validate(value)) {
      errors.push(config.errorMessage || `Invalid value for ${config.name}`);
    }
  }

  // Production-specific validations
  if (isProduction) {
    // Add any production-specific validations here
  }

  // Development-specific warnings
  if (!isProduction) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      warnings.push('Google OAuth not configured (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET missing)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates environment variables and throws if invalid
 * Call this on application startup to prevent running with missing vars
 */
export function validateEnvVarsOrThrow(): void {
  const result = validateEnvVars();

  // Log warnings
  if (result.warnings.length > 0) {
    console.warn('\n⚠️  Environment variable warnings:');
    result.warnings.forEach((warning) => console.warn(`   - ${warning}`));
    console.warn('');
  }

  // Throw on errors
  if (!result.valid) {
    console.error('\n❌ Environment variable validation failed:');
    result.errors.forEach((error) => console.error(`   - ${error}`));
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    console.error('See .env.example for a template.\n');
    throw new Error(`Missing or invalid environment variables: ${result.errors.join('; ')}`);
  }

  console.log('✓ Environment variables validated successfully');
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