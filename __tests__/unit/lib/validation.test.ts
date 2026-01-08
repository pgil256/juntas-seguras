/**
 * Unit tests for lib/validation.ts
 * Tests environment variable validation utilities
 */

import {
  validateEnvVars,
  validateEnvVarsOrThrow,
  validateFeatureEnvVars,
  ValidationResult,
} from '@/lib/validation';

describe('Environment Variable Validation', () => {
  // Store original environment variables
  const originalEnv = { ...process.env };

  // Store original console methods for spying
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset environment to a clean state for each test
    jest.resetModules();
    process.env = { ...originalEnv };

    // Set up console spies
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };

    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('validateEnvVars', () => {
    /**
     * Helper to set all required environment variables
     */
    const setAllRequiredEnvVars = () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      process.env.NEXTAUTH_URL = 'http://localhost:3000';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32); // Minimum 32 characters
      process.env.EMAIL_USER = 'test@example.com';
      process.env.EMAIL_PASSWORD = 'password123';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
    };

    /**
     * Helper to set production-required env vars
     */
    const setProductionEnvVars = () => {
      process.env.EMAIL_FROM = 'noreply@example.com';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
    };

    describe('when all required env vars are set', () => {
      it('should return valid when all required env vars are set in development', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        // Also set Google OAuth to avoid warnings
        process.env.GOOGLE_CLIENT_ID = 'google-client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';

        const result = validateEnvVars();

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should return valid when all required env vars are set in production', () => {
        process.env.NODE_ENV = 'production';
        setAllRequiredEnvVars();
        setProductionEnvVars();

        const result = validateEnvVars();

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('when required env vars are missing', () => {
      it('should return error for missing MONGODB_URI', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        delete process.env.MONGODB_URI;

        const result = validateEnvVars();

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required environment variable: MONGODB_URI');
      });

      it('should return error for missing NEXTAUTH_URL', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        delete process.env.NEXTAUTH_URL;

        const result = validateEnvVars();

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required environment variable: NEXTAUTH_URL');
      });

      it('should return error for missing NEXTAUTH_SECRET', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        delete process.env.NEXTAUTH_SECRET;

        const result = validateEnvVars();

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required environment variable: NEXTAUTH_SECRET');
      });

      it('should return error for missing EMAIL_USER', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        delete process.env.EMAIL_USER;

        const result = validateEnvVars();

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required environment variable: EMAIL_USER');
      });

      it('should return error for missing EMAIL_PASSWORD', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        delete process.env.EMAIL_PASSWORD;

        const result = validateEnvVars();

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required environment variable: EMAIL_PASSWORD');
      });

      it('should return error for missing STRIPE_SECRET_KEY', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        delete process.env.STRIPE_SECRET_KEY;

        const result = validateEnvVars();

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required environment variable: STRIPE_SECRET_KEY');
      });

      it('should return error for missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

        const result = validateEnvVars();

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required environment variable: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
      });

      it('should return multiple errors when multiple required vars are missing', () => {
        process.env.NODE_ENV = 'development';
        // Set only some required vars
        process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
        delete process.env.NEXTAUTH_URL;
        delete process.env.NEXTAUTH_SECRET;
        delete process.env.EMAIL_USER;
        delete process.env.EMAIL_PASSWORD;
        delete process.env.STRIPE_SECRET_KEY;
        delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

        const result = validateEnvVars();

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });
    });

    describe('production-only required vars', () => {
      it('should not require EMAIL_FROM in development', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        delete process.env.EMAIL_FROM;
        // Set Google OAuth to avoid warnings
        process.env.GOOGLE_CLIENT_ID = 'google-client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';

        const result = validateEnvVars();

        expect(result.valid).toBe(true);
        expect(result.errors).not.toContain('Missing required environment variable: EMAIL_FROM');
      });

      it('should require EMAIL_FROM in production', () => {
        process.env.NODE_ENV = 'production';
        setAllRequiredEnvVars();
        setProductionEnvVars();
        delete process.env.EMAIL_FROM;

        const result = validateEnvVars();

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required environment variable: EMAIL_FROM');
      });

      it('should not require STRIPE_WEBHOOK_SECRET in development', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        delete process.env.STRIPE_WEBHOOK_SECRET;
        // Set Google OAuth to avoid warnings
        process.env.GOOGLE_CLIENT_ID = 'google-client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';

        const result = validateEnvVars();

        expect(result.valid).toBe(true);
        expect(result.errors).not.toContain('Missing required environment variable: STRIPE_WEBHOOK_SECRET');
      });

      it('should require STRIPE_WEBHOOK_SECRET in production', () => {
        process.env.NODE_ENV = 'production';
        setAllRequiredEnvVars();
        setProductionEnvVars();
        delete process.env.STRIPE_WEBHOOK_SECRET;

        const result = validateEnvVars();

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required environment variable: STRIPE_WEBHOOK_SECRET');
      });

      it('should not require NEXT_PUBLIC_APP_URL in development', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        delete process.env.NEXT_PUBLIC_APP_URL;
        // Set Google OAuth to avoid warnings
        process.env.GOOGLE_CLIENT_ID = 'google-client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';

        const result = validateEnvVars();

        expect(result.valid).toBe(true);
        expect(result.errors).not.toContain('Missing required environment variable: NEXT_PUBLIC_APP_URL');
      });

      it('should require NEXT_PUBLIC_APP_URL in production', () => {
        process.env.NODE_ENV = 'production';
        setAllRequiredEnvVars();
        setProductionEnvVars();
        delete process.env.NEXT_PUBLIC_APP_URL;

        const result = validateEnvVars();

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required environment variable: NEXT_PUBLIC_APP_URL');
      });
    });

    describe('custom validate functions', () => {
      describe('MONGODB_URI validation', () => {
        it('should accept mongodb:// URI', () => {
          process.env.NODE_ENV = 'development';
          setAllRequiredEnvVars();
          process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
          process.env.GOOGLE_CLIENT_ID = 'google-client-id';
          process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';

          const result = validateEnvVars();

          expect(result.valid).toBe(true);
          expect(result.errors).not.toContainEqual(expect.stringContaining('MONGODB_URI'));
        });

        it('should accept mongodb+srv:// URI', () => {
          process.env.NODE_ENV = 'development';
          setAllRequiredEnvVars();
          process.env.MONGODB_URI = 'mongodb+srv://user:pass@cluster.mongodb.net/db';
          process.env.GOOGLE_CLIENT_ID = 'google-client-id';
          process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';

          const result = validateEnvVars();

          expect(result.valid).toBe(true);
          expect(result.errors).not.toContainEqual(expect.stringContaining('MONGODB_URI'));
        });

        it('should reject invalid MONGODB_URI format', () => {
          process.env.NODE_ENV = 'development';
          setAllRequiredEnvVars();
          process.env.MONGODB_URI = 'postgresql://localhost:5432/db';

          const result = validateEnvVars();

          expect(result.valid).toBe(false);
          expect(result.errors).toContain('MONGODB_URI must be a valid MongoDB connection string (mongodb:// or mongodb+srv://)');
        });

        it('should reject MONGODB_URI without protocol', () => {
          process.env.NODE_ENV = 'development';
          setAllRequiredEnvVars();
          process.env.MONGODB_URI = 'localhost:27017/testdb';

          const result = validateEnvVars();

          expect(result.valid).toBe(false);
          expect(result.errors).toContain('MONGODB_URI must be a valid MongoDB connection string (mongodb:// or mongodb+srv://)');
        });
      });

      describe('NEXTAUTH_URL validation', () => {
        it('should accept http:// URL', () => {
          process.env.NODE_ENV = 'development';
          setAllRequiredEnvVars();
          process.env.NEXTAUTH_URL = 'http://localhost:3000';
          process.env.GOOGLE_CLIENT_ID = 'google-client-id';
          process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';

          const result = validateEnvVars();

          expect(result.valid).toBe(true);
          expect(result.errors).not.toContainEqual(expect.stringContaining('NEXTAUTH_URL'));
        });

        it('should accept https:// URL', () => {
          process.env.NODE_ENV = 'development';
          setAllRequiredEnvVars();
          process.env.NEXTAUTH_URL = 'https://example.com';
          process.env.GOOGLE_CLIENT_ID = 'google-client-id';
          process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';

          const result = validateEnvVars();

          expect(result.valid).toBe(true);
          expect(result.errors).not.toContainEqual(expect.stringContaining('NEXTAUTH_URL'));
        });

        it('should reject invalid NEXTAUTH_URL format', () => {
          process.env.NODE_ENV = 'development';
          setAllRequiredEnvVars();
          process.env.NEXTAUTH_URL = 'ftp://example.com';

          const result = validateEnvVars();

          expect(result.valid).toBe(false);
          expect(result.errors).toContain('NEXTAUTH_URL must be a valid URL');
        });

        it('should reject NEXTAUTH_URL without protocol', () => {
          process.env.NODE_ENV = 'development';
          setAllRequiredEnvVars();
          process.env.NEXTAUTH_URL = 'localhost:3000';

          const result = validateEnvVars();

          expect(result.valid).toBe(false);
          expect(result.errors).toContain('NEXTAUTH_URL must be a valid URL');
        });
      });

      describe('NEXTAUTH_SECRET validation', () => {
        it('should accept secret with exactly 32 characters', () => {
          process.env.NODE_ENV = 'development';
          setAllRequiredEnvVars();
          process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
          process.env.GOOGLE_CLIENT_ID = 'google-client-id';
          process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';

          const result = validateEnvVars();

          expect(result.valid).toBe(true);
          expect(result.errors).not.toContainEqual(expect.stringContaining('NEXTAUTH_SECRET'));
        });

        it('should accept secret with more than 32 characters', () => {
          process.env.NODE_ENV = 'development';
          setAllRequiredEnvVars();
          process.env.NEXTAUTH_SECRET = 'a'.repeat(64);
          process.env.GOOGLE_CLIENT_ID = 'google-client-id';
          process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';

          const result = validateEnvVars();

          expect(result.valid).toBe(true);
          expect(result.errors).not.toContainEqual(expect.stringContaining('NEXTAUTH_SECRET'));
        });

        it('should reject secret with less than 32 characters', () => {
          process.env.NODE_ENV = 'development';
          setAllRequiredEnvVars();
          process.env.NEXTAUTH_SECRET = 'a'.repeat(31);

          const result = validateEnvVars();

          expect(result.valid).toBe(false);
          expect(result.errors).toContain('NEXTAUTH_SECRET must be at least 32 characters long');
        });

        it('should reject empty NEXTAUTH_SECRET', () => {
          process.env.NODE_ENV = 'development';
          setAllRequiredEnvVars();
          process.env.NEXTAUTH_SECRET = '';

          const result = validateEnvVars();

          expect(result.valid).toBe(false);
          // Empty string means missing required var
          expect(result.errors).toContain('Missing required environment variable: NEXTAUTH_SECRET');
        });
      });

      describe('NEXT_PUBLIC_APP_URL validation', () => {
        it('should accept HTTP URL in development', () => {
          process.env.NODE_ENV = 'development';
          setAllRequiredEnvVars();
          process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
          process.env.GOOGLE_CLIENT_ID = 'google-client-id';
          process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';

          const result = validateEnvVars();

          expect(result.valid).toBe(true);
          expect(result.errors).not.toContainEqual(expect.stringContaining('NEXT_PUBLIC_APP_URL'));
        });

        it('should accept HTTPS URL in development', () => {
          process.env.NODE_ENV = 'development';
          setAllRequiredEnvVars();
          process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
          process.env.GOOGLE_CLIENT_ID = 'google-client-id';
          process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';

          const result = validateEnvVars();

          expect(result.valid).toBe(true);
          expect(result.errors).not.toContainEqual(expect.stringContaining('NEXT_PUBLIC_APP_URL'));
        });

        it('should accept HTTPS URL in production', () => {
          process.env.NODE_ENV = 'production';
          setAllRequiredEnvVars();
          setProductionEnvVars();
          process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';

          const result = validateEnvVars();

          expect(result.valid).toBe(true);
          expect(result.errors).not.toContainEqual(expect.stringContaining('NEXT_PUBLIC_APP_URL'));
        });

        it('should reject HTTP URL in production', () => {
          process.env.NODE_ENV = 'production';
          setAllRequiredEnvVars();
          setProductionEnvVars();
          process.env.NEXT_PUBLIC_APP_URL = 'http://example.com';

          const result = validateEnvVars();

          expect(result.valid).toBe(false);
          expect(result.errors).toContain('NEXT_PUBLIC_APP_URL must use HTTPS in production');
        });
      });
    });

    describe('warnings for optional missing vars in development', () => {
      it('should return warning when GOOGLE_CLIENT_ID is missing in development', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        delete process.env.GOOGLE_CLIENT_ID;
        delete process.env.GOOGLE_CLIENT_SECRET;

        const result = validateEnvVars();

        expect(result.warnings).toContain('Google OAuth not configured (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET missing)');
      });

      it('should return warning when GOOGLE_CLIENT_SECRET is missing in development', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        process.env.GOOGLE_CLIENT_ID = 'google-client-id';
        delete process.env.GOOGLE_CLIENT_SECRET;

        const result = validateEnvVars();

        expect(result.warnings).toContain('Google OAuth not configured (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET missing)');
      });

      it('should not return Google OAuth warning when both vars are set', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        process.env.GOOGLE_CLIENT_ID = 'google-client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';

        const result = validateEnvVars();

        expect(result.warnings).not.toContain('Google OAuth not configured (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET missing)');
      });

      it('should not return Google OAuth warning in production', () => {
        process.env.NODE_ENV = 'production';
        setAllRequiredEnvVars();
        setProductionEnvVars();
        delete process.env.GOOGLE_CLIENT_ID;
        delete process.env.GOOGLE_CLIENT_SECRET;

        const result = validateEnvVars();

        expect(result.warnings).not.toContain('Google OAuth not configured (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET missing)');
      });
    });

    describe('ValidationResult structure', () => {
      it('should return valid boolean property', () => {
        setAllRequiredEnvVars();
        const result = validateEnvVars();
        expect(typeof result.valid).toBe('boolean');
      });

      it('should return errors array', () => {
        setAllRequiredEnvVars();
        const result = validateEnvVars();
        expect(Array.isArray(result.errors)).toBe(true);
      });

      it('should return warnings array', () => {
        setAllRequiredEnvVars();
        const result = validateEnvVars();
        expect(Array.isArray(result.warnings)).toBe(true);
      });
    });
  });

  describe('validateEnvVarsOrThrow', () => {
    /**
     * Helper to set all required environment variables
     */
    const setAllRequiredEnvVars = () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      process.env.NEXTAUTH_URL = 'http://localhost:3000';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.EMAIL_USER = 'test@example.com';
      process.env.EMAIL_PASSWORD = 'password123';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
    };

    describe('when validation fails', () => {
      it('should throw error when required vars are missing', () => {
        process.env.NODE_ENV = 'development';
        delete process.env.MONGODB_URI;
        delete process.env.NEXTAUTH_URL;
        delete process.env.NEXTAUTH_SECRET;
        delete process.env.EMAIL_USER;
        delete process.env.EMAIL_PASSWORD;
        delete process.env.STRIPE_SECRET_KEY;
        delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

        expect(() => validateEnvVarsOrThrow()).toThrow();
      });

      it('should throw error with descriptive message', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        delete process.env.MONGODB_URI;

        expect(() => validateEnvVarsOrThrow()).toThrow('Missing or invalid environment variables');
      });

      it('should include specific error in thrown message', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        delete process.env.MONGODB_URI;

        expect(() => validateEnvVarsOrThrow()).toThrow(/MONGODB_URI/);
      });

      it('should log errors to console.error', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        delete process.env.MONGODB_URI;

        try {
          validateEnvVarsOrThrow();
        } catch {
          // Expected to throw
        }

        expect(consoleErrorSpy).toHaveBeenCalled();
      });
    });

    describe('when validation succeeds with warnings', () => {
      it('should not throw when there are only warnings', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        delete process.env.GOOGLE_CLIENT_ID;
        delete process.env.GOOGLE_CLIENT_SECRET;

        expect(() => validateEnvVarsOrThrow()).not.toThrow();
      });

      it('should log warnings to console.warn', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        delete process.env.GOOGLE_CLIENT_ID;
        delete process.env.GOOGLE_CLIENT_SECRET;

        validateEnvVarsOrThrow();

        expect(consoleWarnSpy).toHaveBeenCalled();
      });

      it('should include warning message in console.warn output', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        delete process.env.GOOGLE_CLIENT_ID;
        delete process.env.GOOGLE_CLIENT_SECRET;

        validateEnvVarsOrThrow();

        // Check that console.warn was called with content containing the warning
        const warnCalls = consoleWarnSpy.mock.calls.flat().join(' ');
        expect(warnCalls).toContain('Google OAuth');
      });
    });

    describe('when validation succeeds without warnings', () => {
      it('should log success message', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        process.env.GOOGLE_CLIENT_ID = 'google-client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';

        validateEnvVarsOrThrow();

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('validated successfully'));
      });

      it('should not throw', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        process.env.GOOGLE_CLIENT_ID = 'google-client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';

        expect(() => validateEnvVarsOrThrow()).not.toThrow();
      });

      it('should not log warnings or errors', () => {
        process.env.NODE_ENV = 'development';
        setAllRequiredEnvVars();
        process.env.GOOGLE_CLIENT_ID = 'google-client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';

        validateEnvVarsOrThrow();

        expect(consoleWarnSpy).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('validateFeatureEnvVars', () => {
    describe('email feature validation', () => {
      it('should throw when EMAIL_SERVER is missing', () => {
        delete process.env.EMAIL_SERVER;
        process.env.EMAIL_FROM = 'test@example.com';

        expect(() => validateFeatureEnvVars('email')).toThrow(
          'Email feature requires EMAIL_SERVER and EMAIL_FROM environment variables'
        );
      });

      it('should throw when EMAIL_FROM is missing', () => {
        process.env.EMAIL_SERVER = 'smtp://localhost:25';
        delete process.env.EMAIL_FROM;

        expect(() => validateFeatureEnvVars('email')).toThrow(
          'Email feature requires EMAIL_SERVER and EMAIL_FROM environment variables'
        );
      });

      it('should throw when both EMAIL_SERVER and EMAIL_FROM are missing', () => {
        delete process.env.EMAIL_SERVER;
        delete process.env.EMAIL_FROM;

        expect(() => validateFeatureEnvVars('email')).toThrow(
          'Email feature requires EMAIL_SERVER and EMAIL_FROM environment variables'
        );
      });

      it('should return true when email env vars are set', () => {
        process.env.EMAIL_SERVER = 'smtp://localhost:25';
        process.env.EMAIL_FROM = 'test@example.com';

        const result = validateFeatureEnvVars('email');

        expect(result).toBe(true);
      });
    });

    describe('stripe feature validation', () => {
      it('should throw when STRIPE_SECRET_KEY is missing', () => {
        delete process.env.STRIPE_SECRET_KEY;
        process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_123';

        expect(() => validateFeatureEnvVars('stripe')).toThrow(
          'Stripe feature requires STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY environment variables'
        );
      });

      it('should throw when STRIPE_PUBLISHABLE_KEY is missing', () => {
        process.env.STRIPE_SECRET_KEY = 'sk_test_123';
        delete process.env.STRIPE_PUBLISHABLE_KEY;

        expect(() => validateFeatureEnvVars('stripe')).toThrow(
          'Stripe feature requires STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY environment variables'
        );
      });

      it('should throw when both Stripe keys are missing', () => {
        delete process.env.STRIPE_SECRET_KEY;
        delete process.env.STRIPE_PUBLISHABLE_KEY;

        expect(() => validateFeatureEnvVars('stripe')).toThrow(
          'Stripe feature requires STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY environment variables'
        );
      });

      it('should return true when stripe env vars are set', () => {
        process.env.STRIPE_SECRET_KEY = 'sk_test_123';
        process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_123';

        const result = validateFeatureEnvVars('stripe');

        expect(result).toBe(true);
      });
    });

    describe('unknown feature handling', () => {
      it('should throw for unknown feature', () => {
        // @ts-expect-error - Testing with invalid feature name
        expect(() => validateFeatureEnvVars('unknown')).toThrow(
          'Unknown feature: unknown'
        );
      });

      it('should throw for null feature', () => {
        // @ts-expect-error - Testing with null
        expect(() => validateFeatureEnvVars(null)).toThrow();
      });

      it('should throw for undefined feature', () => {
        // @ts-expect-error - Testing with undefined
        expect(() => validateFeatureEnvVars(undefined)).toThrow();
      });
    });
  });
});
