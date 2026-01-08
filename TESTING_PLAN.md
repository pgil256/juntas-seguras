# Comprehensive Testing Plan

## My Juntas App - Rotating Savings Pool Platform

**Version:** 2.0
**Last Updated:** January 2026
**Status:** Planning Phase

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Testing Strategy Overview](#2-testing-strategy-overview)
3. [Test Environment Setup](#3-test-environment-setup)
4. [Unit Testing](#4-unit-testing)
5. [Integration Testing](#5-integration-testing)
6. [End-to-End Testing](#6-end-to-end-testing)
7. [API Testing](#7-api-testing)
8. [Security Testing](#8-security-testing)
9. [Performance Testing](#9-performance-testing)
10. [Accessibility Testing](#10-accessibility-testing)
11. [Test Data Management](#11-test-data-management)
12. [CI/CD Integration](#12-cicd-integration)
13. [Test Coverage Goals](#13-test-coverage-goals)
14. [Risk-Based Test Prioritization](#14-risk-based-test-prioritization)

---

## 1. Executive Summary

### Purpose
This document outlines the comprehensive testing strategy for the My Juntas App, a Next.js 14 application for managing rotating savings pools (juntas/tandas). The application handles financial transactions, requires mandatory MFA for all users, and manages sensitive user data.

### Scope
- 60+ API endpoints across 12 feature areas
- 12 MongoDB database models
- 91 React components
- 22 custom hooks
- Authentication with OAuth (Google, Azure AD) and credentials
- Mandatory MFA (email and TOTP)
- Manual payment tracking (Venmo, PayPal, Cash App, Zelle, Bank)

### Current State
No automated tests currently exist in the codebase. This plan establishes testing from the ground up.

### Critical Areas
| Priority | Area | Risk Level |
|----------|------|------------|
| P0 | Authentication & MFA | Critical |
| P0 | Payout Processing | Critical |
| P0 | Contribution Tracking | Critical |
| P1 | Pool Management | High |
| P1 | Payment Methods | High |
| P2 | Discussions & Messaging | Medium |
| P2 | Notifications & Reminders | Medium |
| P3 | Search & Analytics | Low |

---

## 2. Testing Strategy Overview

### Testing Pyramid

```
                    ┌─────────────┐
                    │    E2E      │  ~10% - Critical user journeys
                    │   Tests     │
                    ├─────────────┤
                    │ Integration │  ~30% - API, DB, Services
                    │   Tests     │
                    ├─────────────┤
                    │    Unit     │  ~60% - Components, Hooks, Utils
                    │   Tests     │
                    └─────────────┘
```

### Recommended Test Stack

| Category | Tool | Purpose |
|----------|------|---------|
| Unit Tests | Jest + React Testing Library | Components, hooks, utilities |
| API Tests | Jest + Supertest | API endpoint testing |
| E2E Tests | Playwright | User journey testing |
| Database | mongodb-memory-server | In-memory MongoDB for tests |
| Mocking | MSW (Mock Service Worker) | API mocking |
| Coverage | Istanbul/nyc | Code coverage reporting |

### Testing Principles
1. **Test behavior, not implementation** - Focus on what code does, not how
2. **Isolate tests** - Each test should be independent
3. **Use realistic data** - Test with production-like data
4. **Prioritize critical paths** - Financial operations first
5. **Automate everything** - No manual regression testing

---

## 3. Test Environment Setup

### 3.1 Dependencies to Install

```json
{
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^14.2.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/jest": "^29.5.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "ts-jest": "^29.1.0",
    "mongodb-memory-server": "^9.1.0",
    "supertest": "^6.3.0",
    "@types/supertest": "^6.0.0",
    "msw": "^2.2.0",
    "@playwright/test": "^1.41.0",
    "dotenv-flow": "^4.1.0",
    "@faker-js/faker": "^8.4.0"
  }
}
```

### 3.2 Jest Configuration

**jest.config.js**
```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/', '<rootDir>/e2e/'],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
```

**jest.setup.js**
```javascript
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 3.3 Playwright Configuration

**playwright.config.ts**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 3.4 Directory Structure

```
my-juntas-app/
├── __tests__/
│   ├── unit/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── payments/
│   │   │   ├── pools/
│   │   │   ├── auth/
│   │   │   └── security/
│   │   ├── hooks/
│   │   │   ├── usePool.test.ts
│   │   │   ├── usePoolContributions.test.ts
│   │   │   └── ...
│   │   └── lib/
│   │       ├── services/
│   │       │   ├── mfa.test.ts
│   │       │   └── notifications.test.ts
│   │       ├── payments/
│   │       │   ├── qr-code.test.ts
│   │       │   ├── qr-decode.test.ts
│   │       │   └── deep-links.test.ts
│   │       ├── auth.test.ts
│   │       ├── utils.test.ts
│   │       └── validation.test.ts
│   ├── integration/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── register.test.ts
│   │   │   │   ├── verify-mfa.test.ts
│   │   │   │   └── totp-setup.test.ts
│   │   │   ├── pools/
│   │   │   │   ├── crud.test.ts
│   │   │   │   ├── contributions.test.ts
│   │   │   │   ├── payouts.test.ts
│   │   │   │   └── invitations.test.ts
│   │   │   ├── payments/
│   │   │   └── users/
│   │   └── db/
│   │       ├── models/
│   │       │   ├── user.test.ts
│   │       │   ├── pool.test.ts
│   │       │   └── discussion.test.ts
│   │       └── transactions/
│   │           └── payout.test.ts
│   ├── security/
│   │   ├── auth.test.ts
│   │   ├── authorization.test.ts
│   │   ├── input-validation.test.ts
│   │   ├── csrf.test.ts
│   │   └── headers.test.ts
│   └── fixtures/
│       ├── users.ts
│       ├── pools.ts
│       └── payments.ts
├── e2e/
│   ├── auth/
│   │   ├── registration.spec.ts
│   │   ├── login.spec.ts
│   │   ├── mfa.spec.ts
│   │   └── oauth.spec.ts
│   ├── pools/
│   │   ├── create-pool.spec.ts
│   │   ├── join-pool.spec.ts
│   │   ├── contributions.spec.ts
│   │   └── payouts.spec.ts
│   ├── payments/
│   │   └── payment-methods.spec.ts
│   ├── discussions/
│   │   └── threads.spec.ts
│   ├── mobile/
│   │   └── responsive.spec.ts
│   └── helpers/
│       ├── auth.helpers.ts
│       ├── pool.helpers.ts
│       └── db.helpers.ts
├── mocks/
│   ├── handlers.ts
│   ├── server.ts
│   └── browser.ts
├── performance/
│   ├── load-test.js
│   └── lighthouserc.js
├── jest.config.js
├── jest.setup.js
└── playwright.config.ts
```

### 3.5 Environment Variables for Testing

**.env.test**
```bash
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/juntas_test
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=test-secret-key-for-testing-only
NEXT_PUBLIC_APP_URL=http://localhost:3000
EMAIL_USER=test@example.com
EMAIL_PASSWORD=test-password
EMAIL_FROM=test@example.com

# Mock OAuth
GOOGLE_CLIENT_ID=test-google-client-id
GOOGLE_CLIENT_SECRET=test-google-client-secret
AZURE_AD_CLIENT_ID=test-azure-client-id
AZURE_AD_CLIENT_SECRET=test-azure-client-secret
AZURE_AD_TENANT_ID=test-azure-tenant-id

# Feature Flags
ENABLE_STRIPE=false
ENABLE_KYC=false
```

---

## 4. Unit Testing

### 4.1 MFA Service Tests (lib/services/mfa.ts) - CRITICAL

**File:** `__tests__/unit/lib/services/mfa.test.ts`

```typescript
import { generateMfaCode, verifyMfaCode, generateTotpSecret, verifyTotp } from '@/lib/services/mfa';

describe('MFA Service', () => {
  describe('generateMfaCode', () => {
    it('generates a 6-digit code', () => {
      const code = generateMfaCode();
      expect(code).toMatch(/^\d{6}$/);
    });

    it('generates unique codes', () => {
      const codes = new Set(Array.from({ length: 100 }, () => generateMfaCode()));
      expect(codes.size).toBeGreaterThan(90); // Allow some collision
    });
  });

  describe('verifyMfaCode', () => {
    it('returns true for valid code within expiry', () => {
      const code = '123456';
      const createdAt = new Date();
      const result = verifyMfaCode(code, code, createdAt);
      expect(result).toBe(true);
    });

    it('returns false for invalid code', () => {
      const result = verifyMfaCode('123456', '654321', new Date());
      expect(result).toBe(false);
    });

    it('returns false for expired code (>10 minutes)', () => {
      const code = '123456';
      const createdAt = new Date(Date.now() - 11 * 60 * 1000);
      const result = verifyMfaCode(code, code, createdAt);
      expect(result).toBe(false);
    });

    it('allows code reuse within 2-minute regeneration window', () => {
      // Test the 2-minute grace period for regenerated codes
    });

    it('increments failed attempt counter on wrong code', () => {
      // Test rate limiting logic
    });

    it('rejects after 5 failed attempts (rate limiting)', () => {
      // Test lockout behavior
    });
  });

  describe('TOTP Operations', () => {
    it('generates base32 encoded secret', () => {
      const secret = generateTotpSecret();
      expect(secret).toMatch(/^[A-Z2-7]+=*$/);
    });

    it('generates QR code URL for authenticator apps', () => {
      // Test QR URL generation with speakeasy
    });

    it('verifies valid TOTP code', () => {
      const secret = generateTotpSecret();
      const speakeasy = require('speakeasy');
      const code = speakeasy.totp({ secret, encoding: 'base32' });
      const result = verifyTotp(secret, code);
      expect(result).toBe(true);
    });

    it('rejects invalid TOTP code', () => {
      const secret = generateTotpSecret();
      const result = verifyTotp(secret, '000000');
      expect(result).toBe(false);
    });

    it('allows 1-step time window tolerance (30-second drift)', () => {
      // Test window parameter
    });

    it('generates 8 backup codes with 8 digits each', () => {
      // Test backup code generation
    });

    it('verifies and consumes backup code (single use)', () => {
      // Test backup code consumption
    });
  });
});
```

### 4.2 Payment Utilities Tests

**File:** `__tests__/unit/lib/payments/qr-code.test.ts`

```typescript
import { generatePaymentQRCode } from '@/lib/payments/qr-code';

describe('QR Code Generation', () => {
  it('generates valid QR code for Venmo username', async () => {
    const qr = await generatePaymentQRCode('venmo', { username: '@testuser', amount: 10 });
    expect(qr).toMatch(/^data:image\/png;base64,/);
  });

  it('generates valid QR code for PayPal email', async () => {
    const qr = await generatePaymentQRCode('paypal', { email: 'test@example.com', amount: 10 });
    expect(qr).toBeDefined();
  });

  it('generates valid QR code for Cash App cashtag', async () => {
    const qr = await generatePaymentQRCode('cashapp', { cashtag: '$testuser', amount: 10 });
    expect(qr).toBeDefined();
  });

  it('generates valid QR code for Zelle phone number', async () => {
    const qr = await generatePaymentQRCode('zelle', { phone: '555-123-4567' });
    expect(qr).toBeDefined();
  });

  it('includes payment amount in QR data', async () => {
    // Verify QR content includes amount
  });

  it('returns base64 data URL', async () => {
    const qr = await generatePaymentQRCode('venmo', { username: '@test', amount: 5 });
    expect(qr).toMatch(/^data:image\/png;base64,/);
  });

  it('respects custom color options', async () => {
    const qr = await generatePaymentQRCode('venmo',
      { username: '@test', amount: 5 },
      { dark: '#000000', light: '#ffffff' }
    );
    expect(qr).toBeDefined();
  });
});
```

**File:** `__tests__/unit/lib/payments/deep-links.test.ts`

```typescript
import { generatePaymentDeepLink } from '@/lib/payments/deep-links';

describe('Payment Deep Links', () => {
  it('generates Venmo deep link with amount', () => {
    const link = generatePaymentDeepLink('venmo', {
      username: 'testuser',
      amount: 100,
      note: 'Pool contribution',
    });
    expect(link).toContain('venmo://paycharge');
    expect(link).toContain('testuser');
    expect(link).toContain('100');
  });

  it('generates PayPal.me link', () => {
    const link = generatePaymentDeepLink('paypal', {
      email: 'test@example.com',
      amount: 50,
    });
    expect(link).toContain('paypal.me');
  });

  it('generates Cash App link with cashtag', () => {
    const link = generatePaymentDeepLink('cashapp', {
      cashtag: '$testuser',
      amount: 75,
    });
    expect(link).toContain('cash.app');
    expect(link).toContain('testuser');
  });

  it('returns null for Zelle (no deep link support)', () => {
    const link = generatePaymentDeepLink('zelle', {
      email: 'test@example.com',
    });
    expect(link).toBeNull();
  });

  it('URL-encodes special characters in notes', () => {
    const link = generatePaymentDeepLink('venmo', {
      username: 'testuser',
      amount: 10,
      note: 'Pool #1 - Round 3',
    });
    expect(link).toContain('%23'); // URL encoded #
  });
});
```

### 4.3 Validation Utilities Tests

**File:** `__tests__/unit/lib/validation.test.ts`

```typescript
import { validateEmail, validatePassword, validatePoolAmount } from '@/lib/validation';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('accepts valid email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    it('rejects invalid email addresses', () => {
      expect(validateEmail('not-an-email')).toBe(false);
      expect(validateEmail('missing@domain')).toBe(false);
      expect(validateEmail('@nodomain.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('accepts valid passwords', () => {
      expect(validatePassword('SecurePass123!')).toBe(true);
    });

    it('rejects passwords too short (<8 characters)', () => {
      expect(validatePassword('Short1!')).toBe(false);
    });

    it('requires at least one uppercase letter', () => {
      expect(validatePassword('lowercase123!')).toBe(false);
    });

    it('requires at least one number', () => {
      expect(validatePassword('NoNumbers!')).toBe(false);
    });

    it('requires at least one special character', () => {
      expect(validatePassword('NoSpecial123')).toBe(false);
    });
  });

  describe('validatePoolAmount', () => {
    it('accepts amounts between $1 and $20', () => {
      expect(validatePoolAmount(1)).toBe(true);
      expect(validatePoolAmount(10)).toBe(true);
      expect(validatePoolAmount(20)).toBe(true);
    });

    it('rejects amounts outside range', () => {
      expect(validatePoolAmount(0)).toBe(false);
      expect(validatePoolAmount(0.5)).toBe(false);
      expect(validatePoolAmount(21)).toBe(false);
      expect(validatePoolAmount(-5)).toBe(false);
    });

    it('rejects non-numeric values', () => {
      expect(validatePoolAmount('ten' as any)).toBe(false);
      expect(validatePoolAmount(null as any)).toBe(false);
    });
  });
});
```

### 4.4 Custom Hooks Tests

**File:** `__tests__/unit/hooks/usePoolContributions.test.ts`

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { usePoolContributions } from '@/lib/hooks/usePoolContributions';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';

describe('usePoolContributions Hook', () => {
  const poolId = 'pool-123';

  it('returns loading state initially', () => {
    const { result } = renderHook(() => usePoolContributions(poolId));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.contributions).toBeUndefined();
  });

  it('fetches contributions successfully', async () => {
    server.use(
      http.get(`/api/pools/${poolId}/contributions`, () => {
        return HttpResponse.json({
          contributions: [
            { memberId: 'member-1', status: 'verified', amount: 100 },
            { memberId: 'member-2', status: 'pending', amount: 100 },
          ],
          currentRound: 1,
        });
      })
    );

    const { result } = renderHook(() => usePoolContributions(poolId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.contributions).toHaveLength(2);
    expect(result.current.currentRound).toBe(1);
  });

  it('correctly identifies pending contributions', async () => {
    // Test filtering by status
  });

  it('calculates total collected amount', async () => {
    // Test amount aggregation
  });

  it('determines if round is complete (all verified)', async () => {
    // Test completion logic
  });

  it('handles contribution confirmation', async () => {
    server.use(
      http.post(`/api/pools/${poolId}/contributions`, async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
          success: true,
          contribution: { memberId: body.memberId, status: 'member_confirmed' },
        });
      })
    );

    const { result } = renderHook(() => usePoolContributions(poolId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.confirmContribution({
      memberId: 'member-1',
      paymentMethod: 'venmo',
    });

    expect(result.current.error).toBeNull();
  });

  it('handles API errors gracefully', async () => {
    server.use(
      http.get(`/api/pools/${poolId}/contributions`, () => {
        return HttpResponse.json({ error: 'Pool not found' }, { status: 404 });
      })
    );

    const { result } = renderHook(() => usePoolContributions(poolId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Pool not found');
  });
});
```

### 4.5 Component Unit Tests

**File:** `__tests__/unit/components/ui/button.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders disabled state correctly', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button')).toHaveClass('border');
  });

  it('shows loading spinner when loading prop is true', () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders as child element when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    expect(screen.getByRole('link')).toBeInTheDocument();
  });
});
```

**File:** `__tests__/unit/components/auth/ProtectedPage.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ProtectedPage from '@/components/auth/ProtectedPage';

jest.mock('next-auth/react');
jest.mock('next/navigation');

describe('ProtectedPage Component', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  it('shows loading state while checking session', () => {
    (useSession as jest.Mock).mockReturnValue({ status: 'loading' });
    render(<ProtectedPage><div>Protected Content</div></ProtectedPage>);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('redirects to signin when unauthenticated', async () => {
    (useSession as jest.Mock).mockReturnValue({ status: 'unauthenticated' });
    render(<ProtectedPage><div>Protected Content</div></ProtectedPage>);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/signin');
    });
  });

  it('renders children when authenticated', () => {
    (useSession as jest.Mock).mockReturnValue({
      status: 'authenticated',
      data: { user: { id: '123', email: 'test@example.com' } },
    });
    render(<ProtectedPage><div>Protected Content</div></ProtectedPage>);
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to MFA verification when MFA is required', async () => {
    (useSession as jest.Mock).mockReturnValue({
      status: 'authenticated',
      data: { user: { id: '123' }, requiresMfa: true },
    });
    render(<ProtectedPage><div>Protected Content</div></ProtectedPage>);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/mfa/verify');
    });
  });
});
```

**File:** `__tests__/unit/components/payments/ContributionStatusCard.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import ContributionStatusCard from '@/components/pools/ContributionStatusCard';

describe('ContributionStatusCard Component', () => {
  const baseProps = {
    member: {
      name: 'John Doe',
      avatar: '/avatars/john.png',
      position: 1,
    },
    contribution: {
      amount: 10,
      status: 'pending',
      confirmedAt: null,
    },
  };

  it('shows pending status with correct styling', () => {
    render(<ContributionStatusCard {...baseProps} />);
    expect(screen.getByText('Pending')).toHaveClass('text-yellow-600');
  });

  it('shows confirmed status with correct styling', () => {
    const props = {
      ...baseProps,
      contribution: { ...baseProps.contribution, status: 'member_confirmed' },
    };
    render(<ContributionStatusCard {...props} />);
    expect(screen.getByText('Confirmed')).toHaveClass('text-blue-600');
  });

  it('shows verified status with correct styling', () => {
    const props = {
      ...baseProps,
      contribution: { ...baseProps.contribution, status: 'verified' },
    };
    render(<ContributionStatusCard {...props} />);
    expect(screen.getByText('Verified')).toHaveClass('text-green-600');
  });

  it('displays member name and avatar', () => {
    render(<ContributionStatusCard {...baseProps} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('john.png'));
  });

  it('shows contribution amount', () => {
    render(<ContributionStatusCard {...baseProps} />);
    expect(screen.getByText('$10.00')).toBeInTheDocument();
  });

  it('displays timestamp of last update', () => {
    const props = {
      ...baseProps,
      contribution: {
        ...baseProps.contribution,
        status: 'member_confirmed',
        confirmedAt: new Date('2026-01-01T12:00:00Z'),
      },
    };
    render(<ContributionStatusCard {...props} />);
    expect(screen.getByText(/Jan 1/)).toBeInTheDocument();
  });
});
```

---

## 5. Integration Testing

### 5.1 Database Model Tests

**File:** `__tests__/integration/db/models/user.test.ts`

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '@/lib/db/models/user';

describe('User Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('User Creation', () => {
    it('creates user with valid data', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedPassword123',
        name: 'Test User',
      });

      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
    });

    it('hashes password before saving', async () => {
      // Should verify bcrypt hash format
    });

    it('rejects duplicate email', async () => {
      await User.create({
        email: 'existing@example.com',
        password: 'hashedPassword',
      });

      await expect(
        User.create({
          email: 'existing@example.com',
          password: 'anotherPassword',
        })
      ).rejects.toThrow();
    });

    it('sets default mfaMethod to "email"', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedPassword123',
      });

      expect(user.mfaMethod).toBe('email');
      expect(user.mfaSetupComplete).toBe(false);
    });

    it('initializes empty pools array', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedPassword123',
      });

      expect(user.pools).toEqual([]);
    });
  });

  describe('MFA Fields', () => {
    it('stores mfaCode and mfaCodeExpiry', async () => {
      const user = await User.create({
        email: 'mfa@example.com',
        password: 'hashedPassword123',
        pendingMfaCode: '123456',
        pendingMfaCodeCreatedAt: new Date(),
        pendingMfaVerification: true,
      });

      expect(user.pendingMfaCode).toBe('123456');
      expect(user.pendingMfaVerification).toBe(true);
    });

    it('stores totpSecret when TOTP enabled', async () => {
      const user = await User.create({
        email: 'totp@example.com',
        password: 'hashedPassword123',
        mfaMethod: 'totp',
        totpSecret: 'BASE32SECRET',
      });

      expect(user.totpSecret).toBe('BASE32SECRET');
      expect(user.mfaMethod).toBe('totp');
    });

    it('stores backup codes array', async () => {
      const backupCodes = ['12345678', '87654321', '11223344'];
      const user = await User.create({
        email: 'backup@example.com',
        password: 'hashedPassword123',
        backupCodes,
      });

      expect(user.backupCodes).toEqual(backupCodes);
    });
  });

  describe('Payment Methods', () => {
    it('stores multiple payout methods', async () => {
      const user = await User.create({
        email: 'payout@example.com',
        password: 'hashedPassword123',
        payoutMethods: [
          { type: 'venmo', username: '@testuser', isDefault: true },
          { type: 'zelle', email: 'test@example.com', isDefault: false },
        ],
      });

      expect(user.payoutMethods).toHaveLength(2);
      expect(user.payoutMethods[0].type).toBe('venmo');
    });

    it('validates payment method types', async () => {
      await expect(
        User.create({
          email: 'invalid@example.com',
          password: 'hashedPassword123',
          payoutMethods: [{ type: 'invalid_type', username: 'test' }],
        })
      ).rejects.toThrow();
    });

    it('stores Zelle QR code data', async () => {
      const user = await User.create({
        email: 'zelle@example.com',
        password: 'hashedPassword123',
        zelleQr: {
          token: 'abc123',
          rawContent: 'zelle-data',
          base64Image: 'data:image/png;base64,...',
        },
      });

      expect(user.zelleQr.token).toBe('abc123');
    });
  });
});
```

**File:** `__tests__/integration/db/models/pool.test.ts`

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Pool from '@/lib/db/models/pool';
import User from '@/lib/db/models/user';

describe('Pool Model', () => {
  let mongoServer: MongoMemoryServer;
  let adminUser: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    adminUser = await User.create({
      email: 'admin@example.com',
      password: 'hashedPassword123',
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Pool.deleteMany({});
  });

  describe('Pool Creation', () => {
    it('creates pool with valid configuration', async () => {
      const pool = await Pool.create({
        name: 'Test Pool',
        admin: adminUser._id,
        contributionAmount: 10,
        totalMembers: 5,
        frequency: 'weekly',
        members: [
          { user: adminUser._id, role: 'ADMIN', position: 1 },
        ],
      });

      expect(pool.name).toBe('Test Pool');
      expect(pool.contributionAmount).toBe(10);
      expect(pool.currentRound).toBe(1);
      expect(pool.status).toBe('ACTIVE');
    });

    it('sets creator as ADMIN member with position 1', async () => {
      const pool = await Pool.create({
        name: 'Admin Test Pool',
        admin: adminUser._id,
        contributionAmount: 10,
        totalMembers: 5,
        frequency: 'weekly',
        members: [
          { user: adminUser._id, role: 'ADMIN', position: 1 },
        ],
      });

      expect(pool.members[0].role).toBe('ADMIN');
      expect(pool.members[0].position).toBe(1);
    });

    it('validates contribution amount range ($1-$20)', async () => {
      await expect(
        Pool.create({
          name: 'Invalid Pool',
          admin: adminUser._id,
          contributionAmount: 25, // Over limit
          totalMembers: 5,
          frequency: 'weekly',
        })
      ).rejects.toThrow();

      await expect(
        Pool.create({
          name: 'Invalid Pool',
          admin: adminUser._id,
          contributionAmount: 0, // Under limit
          totalMembers: 5,
          frequency: 'weekly',
        })
      ).rejects.toThrow();
    });
  });

  describe('Member Management', () => {
    it('adds member with correct position', async () => {
      const member = await User.create({
        email: 'member@example.com',
        password: 'hashedPassword123',
      });

      const pool = await Pool.create({
        name: 'Member Test Pool',
        admin: adminUser._id,
        contributionAmount: 10,
        totalMembers: 5,
        frequency: 'weekly',
        members: [
          { user: adminUser._id, role: 'ADMIN', position: 1 },
        ],
      });

      pool.members.push({
        user: member._id,
        role: 'MEMBER',
        position: 2,
        contributionStatus: 'pending',
      });
      await pool.save();

      expect(pool.members).toHaveLength(2);
      expect(pool.members[1].position).toBe(2);
    });

    it('prevents duplicate member additions', async () => {
      // Test unique constraint on member userId per pool
    });
  });

  describe('Contribution Tracking', () => {
    it('tracks contribution status per member per round', async () => {
      const pool = await Pool.create({
        name: 'Contribution Pool',
        admin: adminUser._id,
        contributionAmount: 10,
        totalMembers: 3,
        frequency: 'weekly',
        members: [
          { user: adminUser._id, role: 'ADMIN', position: 1, contributionStatus: 'pending' },
        ],
        currentRound: 1,
      });

      pool.members[0].contributionStatus = 'member_confirmed';
      await pool.save();

      expect(pool.members[0].contributionStatus).toBe('member_confirmed');
    });

    it('stores payment method used for contribution', async () => {
      // Test payment method tracking
    });
  });

  describe('Round Management', () => {
    it('determines payout recipient by position (position = currentRound)', async () => {
      const pool = await Pool.create({
        name: 'Payout Pool',
        admin: adminUser._id,
        contributionAmount: 10,
        totalMembers: 3,
        frequency: 'weekly',
        members: [
          { user: adminUser._id, role: 'ADMIN', position: 1 },
        ],
        currentRound: 1,
      });

      // Round 1 -> position 1 receives payout
      const recipient = pool.members.find(m => m.position === pool.currentRound);
      expect(recipient.position).toBe(1);
    });
  });

  describe('Transactions', () => {
    it('records contribution transactions', async () => {
      const pool = await Pool.create({
        name: 'Transaction Pool',
        admin: adminUser._id,
        contributionAmount: 10,
        totalMembers: 3,
        frequency: 'weekly',
        members: [
          { user: adminUser._id, role: 'ADMIN', position: 1 },
        ],
      });

      pool.transactions.push({
        type: 'contribution',
        amount: 10,
        from: adminUser._id,
        round: 1,
        status: 'verified',
      });

      await pool.save();
      expect(pool.transactions).toHaveLength(1);
      expect(pool.transactions[0].type).toBe('contribution');
    });

    it('records payout transactions', async () => {
      // Test payout transaction recording
    });
  });
});
```

### 5.2 MongoDB Transaction Tests - CRITICAL

**File:** `__tests__/integration/db/transactions/payout.test.ts`

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Pool from '@/lib/db/models/pool';
import User from '@/lib/db/models/user';

describe('Payout Transactions', () => {
  let mongoServer: MongoMemoryServer;
  let adminUser: any;
  let memberUsers: any[];
  let testPool: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create({
      instance: { storageEngine: 'wiredTiger' }, // Required for transactions
    });
    await mongoose.connect(mongoServer.getUri(), { replicaSet: 'testset' });

    adminUser = await User.create({
      email: 'admin@example.com',
      password: 'hashedPassword123',
    });

    memberUsers = await Promise.all([
      User.create({ email: 'member1@example.com', password: 'hashedPassword123' }),
      User.create({ email: 'member2@example.com', password: 'hashedPassword123' }),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    testPool = await Pool.create({
      name: 'Payout Test Pool',
      admin: adminUser._id,
      contributionAmount: 10,
      totalMembers: 3,
      frequency: 'weekly',
      members: [
        { user: adminUser._id, role: 'ADMIN', position: 1, contributionStatus: 'verified' },
        { user: memberUsers[0]._id, role: 'MEMBER', position: 2, contributionStatus: 'verified' },
        { user: memberUsers[1]._id, role: 'MEMBER', position: 3, contributionStatus: 'verified' },
      ],
      currentRound: 1,
    });
  });

  afterEach(async () => {
    await Pool.deleteMany({});
  });

  describe('Transaction Safety', () => {
    it('uses MongoDB transaction for payout processing', async () => {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Process payout within transaction
        const pool = await Pool.findById(testPool._id).session(session);
        pool.transactions.push({
          type: 'payout',
          amount: 30, // 3 members × $10
          to: pool.members[0].user,
          round: 1,
          status: 'completed',
        });
        pool.currentRound = 2;
        await pool.save({ session });

        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }

      const updatedPool = await Pool.findById(testPool._id);
      expect(updatedPool.currentRound).toBe(2);
      expect(updatedPool.transactions).toHaveLength(1);
    });

    it('rolls back on partial failure', async () => {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const pool = await Pool.findById(testPool._id).session(session);
        pool.transactions.push({
          type: 'payout',
          amount: 30,
          to: pool.members[0].user,
          round: 1,
          status: 'completed',
        });
        pool.currentRound = 2;
        await pool.save({ session });

        // Simulate failure
        throw new Error('Simulated failure');
      } catch (error) {
        await session.abortTransaction();
      } finally {
        session.endSession();
      }

      // Verify rollback
      const unchangedPool = await Pool.findById(testPool._id);
      expect(unchangedPool.currentRound).toBe(1);
      expect(unchangedPool.transactions).toHaveLength(0);
    });

    it('prevents double payout for same round', async () => {
      // First payout succeeds
      testPool.transactions.push({
        type: 'payout',
        amount: 30,
        to: testPool.members[0].user,
        round: 1,
        status: 'completed',
      });
      testPool.currentRound = 2;
      await testPool.save();

      // Second attempt for same round should fail
      const existingPayout = testPool.transactions.find(
        t => t.type === 'payout' && t.round === 1
      );
      expect(existingPayout).toBeDefined();

      // Logic should prevent processing round 1 payout again
    });

    it('handles concurrent payout requests safely', async () => {
      // Simulate two concurrent payout requests
      const request1 = Pool.findOneAndUpdate(
        { _id: testPool._id, currentRound: 1 },
        { $set: { currentRound: 2 } },
        { new: true }
      );

      const request2 = Pool.findOneAndUpdate(
        { _id: testPool._id, currentRound: 1 },
        { $set: { currentRound: 2 } },
        { new: true }
      );

      const [result1, result2] = await Promise.all([request1, request2]);

      // Only one should succeed (one returns null)
      const successCount = [result1, result2].filter(r => r !== null).length;
      expect(successCount).toBe(1);
    });
  });

  describe('Payout Calculation', () => {
    it('calculates payout as contribution × total_members', async () => {
      const payoutAmount = testPool.contributionAmount * testPool.totalMembers;
      expect(payoutAmount).toBe(30); // $10 × 3 members = $30
    });

    it('includes recipient contribution in total (Universal Contribution Model)', async () => {
      // ALL members contribute, including the payout recipient
      const allContributed = testPool.members.every(
        m => m.contributionStatus === 'verified'
      );
      expect(allContributed).toBe(true);

      // Payout recipient (position 1) also contributes
      const recipient = testPool.members.find(m => m.position === testPool.currentRound);
      expect(recipient.contributionStatus).toBe('verified');
    });
  });

  describe('Round Advancement', () => {
    it('increments currentRound after successful payout', async () => {
      expect(testPool.currentRound).toBe(1);

      testPool.currentRound = 2;
      await testPool.save();

      const updatedPool = await Pool.findById(testPool._id);
      expect(updatedPool.currentRound).toBe(2);
    });

    it('resets all member contribution statuses for new round', async () => {
      // After payout, reset contributions for next round
      testPool.members.forEach(m => {
        m.contributionStatus = 'pending';
      });
      testPool.currentRound = 2;
      await testPool.save();

      const updatedPool = await Pool.findById(testPool._id);
      updatedPool.members.forEach(m => {
        expect(m.contributionStatus).toBe('pending');
      });
    });

    it('sets next payout recipient correctly (position = new currentRound)', async () => {
      testPool.currentRound = 2;
      await testPool.save();

      const updatedPool = await Pool.findById(testPool._id);
      const nextRecipient = updatedPool.members.find(
        m => m.position === updatedPool.currentRound
      );
      expect(nextRecipient.position).toBe(2);
    });
  });
});
```

---

## 6. End-to-End Testing

### 6.1 Authentication Flows

**File:** `e2e/auth/registration.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Registration', () => {
  test('completes full registration flow', async ({ page }) => {
    await page.goto('/auth/signup');

    // Fill registration form
    await page.fill('[name="name"]', 'Test User');
    await page.fill('[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="confirmPassword"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    // Should show verification message
    await expect(page.locator('text=Check your email')).toBeVisible();
  });

  test('shows validation errors for invalid input', async ({ page }) => {
    await page.goto('/auth/signup');

    // Test email format validation
    await page.fill('[name="email"]', 'invalid-email');
    await page.fill('[name="password"]', 'weak');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid email')).toBeVisible();
    await expect(page.locator('text=Password must')).toBeVisible();
  });

  test('prevents duplicate email registration', async ({ page }) => {
    await page.goto('/auth/signup');

    // Use known existing email
    await page.fill('[name="name"]', 'Duplicate User');
    await page.fill('[name="email"]', 'existing@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="confirmPassword"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=already registered')).toBeVisible();
  });

  test('allows resending verification email', async ({ page }) => {
    // After registration
    await page.goto('/auth/verify-email');
    await page.click('text=Resend verification email');

    await expect(page.locator('text=Email sent')).toBeVisible();
  });
});
```

**File:** `e2e/auth/mfa.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('MFA Verification', () => {
  test('requires MFA code after login', async ({ page }) => {
    await page.goto('/auth/signin');

    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Should redirect to MFA page
    await expect(page).toHaveURL('/mfa/verify');
    await expect(page.locator('text=Enter verification code')).toBeVisible();
  });

  test('accepts valid 6-digit MFA code', async ({ page }) => {
    await page.goto('/auth/signin');

    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Enter valid MFA code (mocked in test environment)
    await page.fill('[name="code"]', '123456');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('rejects invalid MFA code', async ({ page }) => {
    await page.goto('/mfa/verify');

    await page.fill('[name="code"]', '000000');
    await page.click('button[type="submit"]');

    await expect(page.locator('[role="alert"]')).toContainText('Invalid code');
    await expect(page).toHaveURL('/mfa/verify');
  });

  test('allows resending MFA code', async ({ page }) => {
    await page.goto('/mfa/verify');

    await page.click('text=Resend code');

    await expect(page.locator('text=Code sent')).toBeVisible();
  });

  test('locks account after 5 failed attempts', async ({ page }) => {
    await page.goto('/mfa/verify');

    // Enter wrong code 5 times
    for (let i = 0; i < 5; i++) {
      await page.fill('[name="code"]', '000000');
      await page.click('button[type="submit"]');
    }

    // Should show rate limit error
    await expect(page.locator('text=Too many attempts')).toBeVisible();
  });

  test('allows TOTP app verification', async ({ page }) => {
    // Login user with TOTP enabled
    await page.goto('/auth/signin');
    await page.fill('[name="email"]', 'totp-user@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Should show authenticator app input
    await expect(page.locator('text=Enter code from your authenticator app')).toBeVisible();
  });
});
```

### 6.2 Pool Management Flows

**File:** `e2e/pools/create-pool.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth.helpers';

test.describe('Pool Creation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('creates pool with valid configuration', async ({ page }) => {
    await page.goto('/create-pool');

    // Fill pool details
    await page.fill('[name="name"]', 'Family Savings Pool');
    await page.fill('[name="description"]', 'Monthly savings for family');
    await page.fill('[name="contributionAmount"]', '10');
    await page.selectOption('[name="totalMembers"]', '5');
    await page.selectOption('[name="frequency"]', 'weekly');

    // Configure payment methods
    await page.click('text=Add Payment Method');
    await page.click('text=Venmo');
    await page.fill('[name="venmoUsername"]', '@familypool');
    await page.click('button:has-text("Save")');

    // Acknowledge rules
    await page.click('[name="acknowledgeRules"]');

    // Submit
    await page.click('button:has-text("Create Pool")');

    // Should redirect to pool page
    await expect(page).toHaveURL(/\/pools\/[a-z0-9]+/);
    await expect(page.locator('h1')).toContainText('Family Savings Pool');
  });

  test('validates contribution amount limits', async ({ page }) => {
    await page.goto('/create-pool');

    await page.fill('[name="name"]', 'Test Pool');
    await page.fill('[name="contributionAmount"]', '25'); // Over limit

    await page.click('button:has-text("Create Pool")');

    await expect(page.locator('[role="alert"]')).toContainText('must be between $1 and $20');
  });

  test('requires at least one payment method', async ({ page }) => {
    await page.goto('/create-pool');

    await page.fill('[name="name"]', 'No Payment Pool');
    await page.fill('[name="contributionAmount"]', '10');
    await page.selectOption('[name="totalMembers"]', '5');
    await page.selectOption('[name="frequency"]', 'weekly');
    await page.click('[name="acknowledgeRules"]');

    await page.click('button:has-text("Create Pool")');

    await expect(page.locator('[role="alert"]')).toContainText('payment method required');
  });

  test('shows rules acknowledgment dialog', async ({ page }) => {
    await page.goto('/create-pool');

    await page.fill('[name="name"]', 'Rules Test Pool');
    await page.fill('[name="contributionAmount"]', '10');

    // Verify rules dialog appears when checkbox is clicked
    await page.click('[name="acknowledgeRules"]');
    // Rules content should be visible in modal or expanded section
  });
});
```

**File:** `e2e/pools/contributions.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { loginAsTestUser, loginAsAdmin, createTestPool } from '../helpers';

test.describe('Contribution Flow', () => {
  let poolId: string;

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    poolId = await createTestPool(page);
  });

  test('member confirms contribution payment', async ({ page }) => {
    await page.goto(`/pools/${poolId}`);

    // Click contribute button
    await page.click('button:has-text("Mark as Paid")');

    // Select payment method
    await page.click('text=Venmo');

    // Confirm payment
    await page.click('button:has-text("I\'ve Sent the Payment")');

    // Should show pending verification
    await expect(page.locator('[data-testid="contribution-status"]')).toContainText('Pending Verification');
  });

  test('shows all members must contribute including recipient', async ({ page }) => {
    // View pool as current round recipient
    await page.goto(`/pools/${poolId}`);

    // Verify contribution is still required for recipient
    await expect(page.locator('text=You also contribute this round')).toBeVisible();
  });

  test('displays QR code for admin payment', async ({ page }) => {
    await page.goto(`/pools/${poolId}`);

    await page.click('button:has-text("Mark as Paid")');
    await page.click('text=Zelle');

    // Verify QR code displayed
    await expect(page.locator('[data-testid="payment-qr-code"]')).toBeVisible();
    await expect(page.locator('text=Scan to pay')).toBeVisible();
  });

  test('admin verifies contributions', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/pools/${poolId}`);

    // Go to admin panel
    await page.click('text=Admin Panel');

    // Find pending contribution
    await page.click('[data-testid="pending-contribution-0"]');

    // Verify payment
    await page.click('button:has-text("Verify Payment")');
    await page.click('button:has-text("Confirm")');

    // Should show verified status
    await expect(page.locator('[data-testid="contribution-status-0"]')).toContainText('Verified');
  });
});
```

**File:** `e2e/pools/payouts.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { loginAsAdmin, setupPoolWithVerifiedContributions } from '../helpers';

test.describe('Payout Flow', () => {
  test('admin processes payout when all contributions verified', async ({ page }) => {
    const poolId = await setupPoolWithVerifiedContributions();
    await loginAsAdmin(page);
    await page.goto(`/pools/${poolId}`);

    // Click process payout
    await page.click('button:has-text("Process Payout")');

    // Verify payout details
    await expect(page.locator('[data-testid="payout-recipient"]')).toBeVisible();
    await expect(page.locator('[data-testid="payout-amount"]')).toContainText('$50');

    // Confirm payout
    await page.click('button:has-text("Confirm Payout")');

    // Should show success
    await expect(page.locator('text=Payout processed successfully')).toBeVisible();

    // Should advance to next round
    await expect(page.locator('[data-testid="current-round"]')).toContainText('Round 2');
  });

  test('prevents payout with unverified contributions', async ({ page }) => {
    // Setup pool with pending contributions
    await page.goto('/pools/pending-pool-id');

    // Payout button should be disabled
    await expect(page.locator('button:has-text("Process Payout")')).toBeDisabled();
    await expect(page.locator('text=Waiting for all contributions')).toBeVisible();
  });

  test('calculates correct payout amount', async ({ page }) => {
    // Pool: 5 members, $10 contribution
    // Payout should be: 5 × $10 = $50
    await page.goto('/pools/test-pool');
    await page.click('button:has-text("Process Payout")');

    await expect(page.locator('[data-testid="payout-amount"]')).toContainText('$50.00');
  });

  test('prevents double payout for same round', async ({ page, context }) => {
    const poolId = await setupPoolWithVerifiedContributions();
    await loginAsAdmin(page);

    // Open same page in two tabs
    const page2 = await context.newPage();
    await page.goto(`/pools/${poolId}`);
    await page2.goto(`/pools/${poolId}`);

    // Try to process payout from both tabs simultaneously
    const [result1, result2] = await Promise.all([
      page.click('button:has-text("Process Payout")').catch(() => 'failed'),
      page2.click('button:has-text("Process Payout")').catch(() => 'failed'),
    ]);

    // One should succeed, one should fail or be disabled
  });

  test('advances to next round after payout', async ({ page }) => {
    const poolId = await setupPoolWithVerifiedContributions();
    await loginAsAdmin(page);
    await page.goto(`/pools/${poolId}`);

    // Process payout
    await page.click('button:has-text("Process Payout")');
    await page.click('button:has-text("Confirm Payout")');

    // Verify round advanced
    await expect(page.locator('[data-testid="current-round"]')).toContainText('Round 2');

    // Verify contribution statuses reset
    await expect(page.locator('[data-testid="contribution-status-0"]')).toContainText('Pending');
  });
});
```

### 6.3 E2E Test Helpers

**File:** `e2e/helpers/auth.helpers.ts`

```typescript
import { Page } from '@playwright/test';

export async function loginAsTestUser(page: Page) {
  await page.goto('/auth/signin');
  await page.fill('[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
  await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!');
  await page.click('button[type="submit"]');

  // Handle MFA in test environment
  if (page.url().includes('/mfa/verify')) {
    await page.fill('[name="code"]', '123456');
    await page.click('button[type="submit"]');
  }

  await page.waitForURL('/dashboard');
}

export async function loginAsAdmin(page: Page) {
  await page.goto('/auth/signin');
  await page.fill('[name="email"]', process.env.TEST_ADMIN_EMAIL || 'admin@example.com');
  await page.fill('[name="password"]', process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!');
  await page.click('button[type="submit"]');

  // Handle MFA
  if (page.url().includes('/mfa/verify')) {
    await page.fill('[name="code"]', '123456');
    await page.click('button[type="submit"]');
  }

  await page.waitForURL('/dashboard');
}
```

**File:** `e2e/helpers/pool.helpers.ts`

```typescript
import { Page } from '@playwright/test';

export async function createTestPool(page: Page): Promise<string> {
  await page.goto('/create-pool');

  await page.fill('[name="name"]', `Test Pool ${Date.now()}`);
  await page.fill('[name="contributionAmount"]', '10');
  await page.selectOption('[name="totalMembers"]', '5');
  await page.selectOption('[name="frequency"]', 'weekly');

  // Add payment method
  await page.click('text=Add Payment Method');
  await page.click('text=Venmo');
  await page.fill('[name="venmoUsername"]', '@testpool');
  await page.click('button:has-text("Save")');

  // Acknowledge rules
  await page.click('[name="acknowledgeRules"]');

  // Create pool
  await page.click('button:has-text("Create Pool")');

  await page.waitForURL(/\/pools\/[a-z0-9]+/);
  const url = page.url();
  return url.split('/pools/')[1];
}

export async function setupPoolWithVerifiedContributions(): Promise<string> {
  // This would typically call a test API endpoint to create a pool
  // with all contributions already verified
  return 'verified-pool-id';
}
```

---

## 7. API Testing

### 7.1 Authentication API Tests

**File:** `__tests__/integration/api/auth/register.test.ts`

```typescript
import { createMocks } from 'node-mocks-http';
import { POST } from '@/app/api/auth/register/route';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '@/lib/db/models/user';

describe('POST /api/auth/register', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  it('registers new user successfully', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
      },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.user.email).toBe('test@example.com');
    expect(data.user.password).toBeUndefined(); // Password not returned
  });

  it('rejects weak password', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: {
        name: 'Test User',
        email: 'test@example.com',
        password: '123', // Too weak
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('password');
  });

  it('rejects duplicate email', async () => {
    await User.create({
      email: 'existing@example.com',
      password: 'hashedPassword',
    });

    const { req } = createMocks({
      method: 'POST',
      body: {
        name: 'Another User',
        email: 'existing@example.com',
        password: 'SecurePass123!',
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(409);
  });

  it('sends verification email', async () => {
    // Mock email service
    const mockSendEmail = jest.fn().mockResolvedValue({ success: true });
    jest.mock('@/lib/email', () => ({
      sendVerificationEmail: mockSendEmail,
    }));

    const { req } = createMocks({
      method: 'POST',
      body: {
        name: 'Test User',
        email: 'verify@example.com',
        password: 'SecurePass123!',
      },
    });

    await POST(req);
    // Verify email service was called
  });
});
```

**File:** `__tests__/integration/api/auth/verify-mfa.test.ts`

```typescript
import { POST } from '@/app/api/auth/verify-mfa/route';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '@/lib/db/models/user';

describe('POST /api/auth/verify-mfa', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    testUser = await User.create({
      email: 'mfa@example.com',
      password: 'hashedPassword',
      mfaMethod: 'email',
      pendingMfaCode: '123456',
      pendingMfaCodeCreatedAt: new Date(),
      pendingMfaVerification: true,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('verifies valid MFA code', async () => {
    const response = await POST(mockRequest({
      body: {
        email: 'mfa@example.com',
        code: '123456',
      },
    }));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('rejects invalid MFA code', async () => {
    const response = await POST(mockRequest({
      body: {
        email: 'mfa@example.com',
        code: '000000',
      },
    }));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid');
  });

  it('rejects expired MFA code (>10 minutes)', async () => {
    await User.updateOne(
      { email: 'mfa@example.com' },
      { pendingMfaCodeCreatedAt: new Date(Date.now() - 15 * 60 * 1000) }
    );

    const response = await POST(mockRequest({
      body: {
        email: 'mfa@example.com',
        code: '123456',
      },
    }));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('expired');
  });

  it('rate limits after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await POST(mockRequest({
        body: { email: 'mfa@example.com', code: '000000' },
      }));
    }

    const response = await POST(mockRequest({
      body: { email: 'mfa@example.com', code: '000000' },
    }));

    expect(response.status).toBe(429);
  });
});
```

### 7.2 Pool API Tests

**File:** `__tests__/integration/api/pools/payouts.test.ts`

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { POST } from '@/app/api/pools/[id]/payouts/route';
import Pool from '@/lib/db/models/pool';
import User from '@/lib/db/models/user';

describe('POST /api/pools/[id]/payouts', () => {
  let mongoServer: MongoMemoryServer;
  let testPool: any;
  let adminUser: any;
  let memberUsers: any[];

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    adminUser = await User.create({
      email: 'admin@example.com',
      password: 'hashedPassword',
    });

    memberUsers = await Promise.all([
      User.create({ email: 'member1@example.com', password: 'hashedPassword' }),
      User.create({ email: 'member2@example.com', password: 'hashedPassword' }),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    testPool = await Pool.create({
      name: 'Payout Test Pool',
      admin: adminUser._id,
      contributionAmount: 10,
      totalMembers: 3,
      frequency: 'weekly',
      members: [
        { user: adminUser._id, role: 'ADMIN', position: 1, contributionStatus: 'verified' },
        { user: memberUsers[0]._id, role: 'MEMBER', position: 2, contributionStatus: 'verified' },
        { user: memberUsers[1]._id, role: 'MEMBER', position: 3, contributionStatus: 'verified' },
      ],
      currentRound: 1,
    });
  });

  afterEach(async () => {
    await Pool.deleteMany({});
  });

  it('processes payout when all contributions verified', async () => {
    const response = await POST(mockAuthenticatedRequest(adminUser._id, {
      params: { id: testPool._id.toString() },
    }));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.payoutAmount).toBe(30); // 3 × $10

    // Verify round advanced
    const updatedPool = await Pool.findById(testPool._id);
    expect(updatedPool.currentRound).toBe(2);
  });

  it('rejects payout with pending contributions', async () => {
    // Set one member to pending
    await Pool.updateOne(
      { _id: testPool._id, 'members.user': memberUsers[0]._id },
      { $set: { 'members.$.contributionStatus': 'pending' } }
    );

    const response = await POST(mockAuthenticatedRequest(adminUser._id, {
      params: { id: testPool._id.toString() },
    }));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('contributions');
  });

  it('calculates correct payout amount (contribution × members)', async () => {
    const response = await POST(mockAuthenticatedRequest(adminUser._id, {
      params: { id: testPool._id.toString() },
    }));

    const data = await response.json();
    expect(data.payoutAmount).toBe(30); // $10 × 3 members
  });

  it('determines correct recipient by position', async () => {
    // Round 1 -> position 1 (admin) receives
    const response = await POST(mockAuthenticatedRequest(adminUser._id, {
      params: { id: testPool._id.toString() },
    }));

    const data = await response.json();
    expect(data.recipient.userId.toString()).toBe(adminUser._id.toString());
  });

  it('prevents non-admin from processing payout', async () => {
    const response = await POST(mockAuthenticatedRequest(memberUsers[0]._id, {
      params: { id: testPool._id.toString() },
    }));

    expect(response.status).toBe(403);
  });

  it('creates PAYOUT_SENT activity post in discussions', async () => {
    await POST(mockAuthenticatedRequest(adminUser._id, {
      params: { id: testPool._id.toString() },
    }));

    // Check for auto-generated activity post
    const updatedPool = await Pool.findById(testPool._id);
    // Verify discussion activity created
  });
});
```

---

## 8. Security Testing

### 8.1 Authentication Security Tests

**File:** `__tests__/security/auth.test.ts`

```typescript
describe('Authentication Security', () => {
  describe('Password Security', () => {
    it('hashes passwords with bcrypt', async () => {
      const user = await User.create({
        email: 'secure@example.com',
        password: 'PlainTextPassword123!',
      });

      expect(user.password).not.toBe('PlainTextPassword123!');
      expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt format
    });

    it('prevents timing attacks on login', async () => {
      const timings: number[] = [];

      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await POST(mockRequest({
          body: { email: `nonexistent${i}@example.com`, password: 'test' },
        }));
        timings.push(performance.now() - start);
      }

      const avgValid = timings.reduce((a, b) => a + b) / timings.length;
      // All timings should be similar (within 50ms)
      timings.forEach(t => {
        expect(Math.abs(t - avgValid)).toBeLessThan(50);
      });
    });

    it('rejects common passwords', async () => {
      const commonPasswords = ['password123', 'qwerty123', '123456789'];

      for (const password of commonPasswords) {
        const response = await POST(mockRequest({
          body: { email: 'test@example.com', password },
        }));
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Session Security', () => {
    it('JWT tokens expire after 30 days', () => {
      const token = generateJwt({ userId: 'test' });
      const decoded = jwt.decode(token);
      const expiry = new Date(decoded.exp * 1000);
      const expected = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      expect(Math.abs(expiry.getTime() - expected.getTime())).toBeLessThan(1000);
    });

    it('session requires MFA verification for protected routes', async () => {
      // Session with requiresMfa: true
      const response = await GET(mockAuthenticatedRequest('user-id', {
        session: { requiresMfa: true },
      }));

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('/mfa/verify');
    });

    it('does not expose sensitive data in JWT', async () => {
      const token = await generateUserToken(testUser);
      const decoded = jwt.decode(token);

      expect(decoded.password).toBeUndefined();
      expect(decoded.totpSecret).toBeUndefined();
      expect(decoded.backupCodes).toBeUndefined();
    });
  });

  describe('MFA Security', () => {
    it('does not allow MFA bypass', async () => {
      // Attempt to access protected route without completing MFA
      const response = await GET(mockRequest({
        headers: {
          Authorization: `Bearer ${tokenWithPendingMfa}`,
        },
      }));

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('/mfa/verify');
    });

    it('invalidates MFA code after successful use', async () => {
      // First use succeeds
      await POST(mockRequest({
        body: { email: 'mfa@example.com', code: '123456' },
      }));

      // Second use fails
      const response = await POST(mockRequest({
        body: { email: 'mfa@example.com', code: '123456' },
      }));

      expect(response.status).toBe(400);
    });
  });
});
```

### 8.2 Authorization Security Tests

**File:** `__tests__/security/authorization.test.ts`

```typescript
describe('Authorization Security', () => {
  describe('Pool Access Control', () => {
    it('prevents non-members from viewing pool', async () => {
      const response = await GET(mockAuthenticatedRequest('non-member-id', {
        params: { id: testPool._id },
      }));

      expect(response.status).toBe(403);
    });

    it('only admin can process payouts', async () => {
      const response = await POST(mockAuthenticatedRequest('member-id', {
        params: { id: testPool._id },
        path: '/api/pools/[id]/payouts',
      }));

      expect(response.status).toBe(403);
    });

    it('only admin can remove members', async () => {
      const response = await DELETE(mockAuthenticatedRequest('member-id', {
        params: { id: testPool._id, memberId: 'other-member' },
      }));

      expect(response.status).toBe(403);
    });

    it('only admin can verify contributions', async () => {
      const response = await POST(mockAuthenticatedRequest('member-id', {
        params: { id: testPool._id },
        body: { action: 'verify', memberId: 'other-member' },
      }));

      expect(response.status).toBe(403);
    });
  });

  describe('Data Access Control', () => {
    it('users cannot access other users payment methods', async () => {
      const response = await GET(mockAuthenticatedRequest('user-a', {
        path: '/api/users/user-b/payment-methods',
      }));

      expect(response.status).toBe(403);
    });

    it('users can only see their own notifications', async () => {
      const response = await GET(mockAuthenticatedRequest('user-a', {
        path: '/api/notifications',
      }));
      const data = await response.json();

      data.notifications.forEach((n: any) => {
        expect(n.userId.toString()).toBe('user-a');
      });
    });
  });

  describe('API Route Protection', () => {
    it('requires authentication on all protected routes', async () => {
      const protectedRoutes = [
        '/api/pools',
        '/api/pools/123',
        '/api/payments/methods',
        '/api/users/profile',
        '/api/notifications',
      ];

      for (const route of protectedRoutes) {
        const response = await fetch(`http://localhost:3000${route}`);
        expect(response.status).toBe(401);
      }
    });
  });
});
```

### 8.3 Input Validation Security Tests

**File:** `__tests__/security/input-validation.test.ts`

```typescript
describe('Input Validation Security', () => {
  describe('XSS Prevention', () => {
    it('sanitizes HTML in pool names', async () => {
      const response = await POST(mockAuthenticatedRequest('admin', {
        body: {
          name: '<script>alert("xss")</script>Pool',
          contributionAmount: 10,
          totalMembers: 5,
          frequency: 'weekly',
        },
      }));

      const data = await response.json();
      expect(data.pool.name).not.toContain('<script>');
    });

    it('sanitizes HTML in discussion messages', async () => {
      const response = await POST(mockAuthenticatedRequest('member', {
        body: {
          content: '<img src=x onerror=alert(1)>Hello',
          poolId: testPool._id,
        },
      }));

      const data = await response.json();
      expect(data.discussion.content).not.toContain('onerror');
    });

    it('escapes special characters in user-generated content', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '"><img src=x onerror=alert(1)>',
        "javascript:alert('xss')",
        '<svg onload=alert(1)>',
      ];

      for (const payload of xssPayloads) {
        const response = await POST(mockAuthenticatedRequest('user', {
          body: { content: payload },
        }));
        const data = await response.json();
        expect(data.content).not.toMatch(/<script|onerror|javascript:|onload/i);
      }
    });
  });

  describe('NoSQL Injection Prevention', () => {
    it('rejects MongoDB operator injection', async () => {
      const response = await POST(mockRequest({
        body: {
          email: { $gt: '' },
          password: 'test',
        },
      }));

      expect(response.status).toBe(400);
    });

    it('validates ObjectId format', async () => {
      const response = await GET(mockAuthenticatedRequest('user', {
        params: { id: 'invalid-id-format' },
      }));

      expect(response.status).toBe(400);
    });

    it('rejects array injection in query params', async () => {
      const response = await GET(mockRequest({
        query: { email: ['test1@example.com', 'test2@example.com'] },
      }));

      expect(response.status).toBe(400);
    });
  });

  describe('Data Type Validation', () => {
    it('rejects non-numeric contribution amounts', async () => {
      const response = await POST(mockAuthenticatedRequest('admin', {
        body: {
          name: 'Test Pool',
          contributionAmount: 'ten dollars',
          totalMembers: 5,
          frequency: 'weekly',
        },
      }));

      expect(response.status).toBe(400);
    });

    it('rejects invalid email formats', async () => {
      const response = await POST(mockRequest({
        body: {
          email: 'not-an-email',
          password: 'SecurePass123!',
        },
      }));

      expect(response.status).toBe(400);
    });

    it('validates enum values', async () => {
      const response = await POST(mockAuthenticatedRequest('admin', {
        body: {
          name: 'Test Pool',
          contributionAmount: 10,
          totalMembers: 5,
          frequency: 'invalid-frequency',
        },
      }));

      expect(response.status).toBe(400);
    });
  });
});
```

### 8.4 Security Headers Tests

**File:** `__tests__/security/headers.test.ts`

```typescript
describe('Security Headers', () => {
  it('sets Content-Security-Policy header', async () => {
    const response = await fetch('http://localhost:3000/');
    const csp = response.headers.get('Content-Security-Policy');

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
  });

  it('sets X-Frame-Options header', async () => {
    const response = await fetch('http://localhost:3000/');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('sets X-Content-Type-Options header', async () => {
    const response = await fetch('http://localhost:3000/');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('sets Strict-Transport-Security header', async () => {
    const response = await fetch('http://localhost:3000/');
    const hsts = response.headers.get('Strict-Transport-Security');
    expect(hsts).toContain('max-age=');
  });

  it('sets X-XSS-Protection header', async () => {
    const response = await fetch('http://localhost:3000/');
    expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
  });
});
```

---

## 9. Performance Testing

### 9.1 Load Testing with k6

**File:** `performance/load-test.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },  // Ramp up to 50 users
    { duration: '5m', target: 50 },  // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Spike to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% failure rate
  },
};

export default function () {
  // Test pool listing
  const poolsResponse = http.get('http://localhost:3000/api/pools', {
    headers: { Authorization: `Bearer ${__ENV.TEST_TOKEN}` },
  });
  check(poolsResponse, {
    'pools status 200': (r) => r.status === 200,
    'pools response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);

  // Test pool details
  const poolResponse = http.get(`http://localhost:3000/api/pools/${__ENV.TEST_POOL_ID}`, {
    headers: { Authorization: `Bearer ${__ENV.TEST_TOKEN}` },
  });
  check(poolResponse, {
    'pool status 200': (r) => r.status === 200,
    'pool response time < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(1);
}
```

### 9.2 API Response Time Tests

**File:** `__tests__/performance/api-response.test.ts`

```typescript
describe('API Response Times', () => {
  it('returns pools list under 200ms', async () => {
    const start = Date.now();
    await authenticatedRequest.get('/api/pools');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(200);
  });

  it('returns pool details under 100ms', async () => {
    const start = Date.now();
    await authenticatedRequest.get(`/api/pools/${testPoolId}`);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('processes contribution under 300ms', async () => {
    const start = Date.now();
    await authenticatedRequest
      .post(`/api/pools/${testPoolId}/contributions`)
      .send({ paymentMethod: 'venmo' });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(300);
  });

  it('processes payout under 500ms', async () => {
    const start = Date.now();
    await authenticatedRequest.post(`/api/pools/${testPoolId}/payouts`);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });
});
```

### 9.3 Lighthouse Performance Audit

**File:** `performance/lighthouserc.js**

```javascript
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/auth/signin',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/pools/test-pool',
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

---

## 10. Accessibility Testing

### 10.1 Automated Accessibility Tests

**File:** `e2e/accessibility/a11y.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('signin page has no accessibility violations', async ({ page }) => {
    await page.goto('/auth/signin');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('dashboard has no accessibility violations', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/dashboard');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('pool creation form has proper labels', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/create-pool');

    const results = await new AxeBuilder({ page })
      .include('form')
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('modals trap focus correctly', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/pools/test-pool');

    // Open contribution modal
    await page.click('button:has-text("Mark as Paid")');

    // Tab through modal
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }

    // Focus should still be in modal
    const focusedElement = await page.evaluate(() =>
      document.activeElement?.closest('[role="dialog"]')
    );
    expect(focusedElement).not.toBeNull();
  });

  test('can navigate signin form with keyboard only', async ({ page }) => {
    await page.goto('/auth/signin');

    await page.keyboard.press('Tab');
    await expect(page.locator('[name="email"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[name="password"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
  });

  test('can close modal with Escape key', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/pools/test-pool');

    await page.click('button:has-text("Invite Members")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });
});
```

---

## 11. Test Data Management

### 11.1 Test Fixtures

**File:** `__tests__/fixtures/users.ts`

```typescript
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';

export const createTestUser = (overrides = {}) => ({
  _id: new ObjectId(),
  email: faker.internet.email(),
  password: 'SecurePass123!',
  name: faker.person.fullName(),
  mfaMethod: 'email',
  mfaSetupComplete: true,
  pendingMfaVerification: false,
  emailVerified: true,
  ...overrides,
});

export const testUsers = {
  admin: createTestUser({
    _id: new ObjectId('507f1f77bcf86cd799439011'),
    email: 'admin@test.com',
    name: 'Test Admin',
  }),
  member1: createTestUser({
    _id: new ObjectId('507f1f77bcf86cd799439012'),
    email: 'member1@test.com',
    name: 'Test Member 1',
  }),
  member2: createTestUser({
    _id: new ObjectId('507f1f77bcf86cd799439013'),
    email: 'member2@test.com',
    name: 'Test Member 2',
  }),
  unverified: createTestUser({
    _id: new ObjectId('507f1f77bcf86cd799439014'),
    email: 'unverified@test.com',
    emailVerified: false,
    pendingMfaVerification: true,
  }),
};
```

**File:** `__tests__/fixtures/pools.ts`

```typescript
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { testUsers } from './users';

export const createTestPool = (adminId: string | ObjectId, overrides = {}) => ({
  _id: new ObjectId(),
  name: faker.company.name() + ' Pool',
  description: faker.lorem.sentence(),
  contributionAmount: 10,
  totalMembers: 5,
  frequency: 'weekly',
  status: 'ACTIVE',
  currentRound: 1,
  admin: adminId,
  members: [
    {
      user: adminId,
      role: 'ADMIN',
      position: 1,
      contributionStatus: 'pending',
    },
  ],
  paymentMethods: {
    venmo: { enabled: true, username: '@testpool' },
    paypal: { enabled: true },
  },
  transactions: [],
  ...overrides,
});

export const createPoolWithMembers = (adminId: string | ObjectId, memberIds: (string | ObjectId)[]) => {
  const pool = createTestPool(adminId);
  memberIds.forEach((memberId, index) => {
    pool.members.push({
      user: memberId,
      role: 'MEMBER',
      position: index + 2,
      contributionStatus: 'pending',
    });
  });
  pool.totalMembers = pool.members.length;
  return pool;
};

export const testPools = {
  activePool: createTestPool(testUsers.admin._id, {
    _id: new ObjectId('507f1f77bcf86cd799439021'),
    name: 'Active Test Pool',
  }),
  verifiedPool: createPoolWithMembers(
    testUsers.admin._id,
    [testUsers.member1._id, testUsers.member2._id]
  ),
};

// Set all contributions to verified for payout testing
testPools.verifiedPool.members.forEach(m => {
  m.contributionStatus = 'verified';
});
```

### 11.2 Database Seeding

**File:** `__tests__/helpers/db.helpers.ts`

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { testUsers } from '../fixtures/users';
import { testPools } from '../fixtures/pools';
import User from '@/lib/db/models/user';
import Pool from '@/lib/db/models/pool';

let mongoServer: MongoMemoryServer;

export const setupTestDb = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

export const teardownTestDb = async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
};

export const clearTestDb = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

export const seedTestData = async () => {
  // Create users
  await User.insertMany(Object.values(testUsers));

  // Create pools
  await Pool.insertMany(Object.values(testPools));

  return { users: testUsers, pools: testPools };
};
```

### 11.3 Mock Server Handlers

**File:** `mocks/handlers.ts`

```typescript
import { http, HttpResponse } from 'msw';
import { testUsers, testPools } from '@/__tests__/fixtures';

export const handlers = [
  // Auth handlers
  http.post('/api/auth/signin', async ({ request }) => {
    const body = await request.json();
    if (body.email === 'test@example.com' && body.password === 'TestPassword123!') {
      return HttpResponse.json({ success: true, requiresMfa: true });
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),

  http.post('/api/auth/verify-mfa', async ({ request }) => {
    const body = await request.json();
    if (body.code === '123456') {
      return HttpResponse.json({ success: true });
    }
    return HttpResponse.json({ error: 'Invalid code' }, { status: 400 });
  }),

  // Pool handlers
  http.get('/api/pools', () => {
    return HttpResponse.json({
      pools: Object.values(testPools),
    });
  }),

  http.get('/api/pools/:id', ({ params }) => {
    const pool = Object.values(testPools).find(p => p._id.toString() === params.id);
    if (pool) {
      return HttpResponse.json({ pool });
    }
    return HttpResponse.json({ error: 'Pool not found' }, { status: 404 });
  }),

  // Contribution handlers
  http.post('/api/pools/:id/contributions', async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      contribution: {
        ...body,
        poolId: params.id,
        status: 'member_confirmed',
        confirmedAt: new Date().toISOString(),
      },
    });
  }),
];
```

---

## 12. CI/CD Integration

### 12.1 GitHub Actions Workflow

**File:** `.github/workflows/test.yml`

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  MONGODB_URI: mongodb://localhost:27017/juntas_test
  NEXTAUTH_URL: http://localhost:3000
  NEXTAUTH_SECRET: test-secret-key
  NODE_ENV: test

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build

      - name: Seed test data
        run: npm run db:seed:test

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run security tests
        run: npm run test:security

      - name: Run npm audit
        run: npm audit --audit-level=high
```

### 12.2 Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=__tests__/unit",
    "test:integration": "jest --testPathPattern=__tests__/integration --runInBand",
    "test:security": "jest --testPathPattern=__tests__/security",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage --runInBand",
    "db:seed:test": "ts-node scripts/seed-test-data.ts"
  }
}
```

---

## 13. Test Coverage Goals

### Coverage Targets by Module

| Module | Line Coverage | Branch Coverage | Priority |
|--------|--------------|-----------------|----------|
| `lib/services/mfa.ts` | 100% | 100% | P0 |
| `lib/auth.ts` | 95% | 90% | P0 |
| `app/api/auth/*` | 90% | 85% | P0 |
| `app/api/pools/*/payouts` | 95% | 90% | P0 |
| `app/api/pools/*/contributions` | 95% | 90% | P0 |
| `lib/db/models/*` | 85% | 80% | P1 |
| `lib/hooks/*` | 80% | 75% | P1 |
| `components/payments/*` | 80% | 75% | P1 |
| `components/pools/*` | 75% | 70% | P2 |
| `components/ui/*` | 70% | 65% | P3 |

### Critical Paths Requiring 100% Coverage

1. **MFA code generation and verification** - Security-critical
2. **Password hashing and verification** - Security-critical
3. **Payout amount calculation** - Financial accuracy
4. **Double-payout prevention logic** - Financial integrity
5. **Invitation token validation** - Security
6. **Authorization checks** - Access control

### Coverage Enforcement

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './lib/services/mfa.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './app/api/auth/**/*.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './app/api/pools/**/payouts/**/*.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
};
```

---

## 14. Risk-Based Test Prioritization

### P0 - Critical (Must Test First)

| Feature | Risk | Test Type | Key Scenarios |
|---------|------|-----------|---------------|
| MFA Verification | Security breach | Unit, Integration, E2E | Code expiry, rate limiting, code reuse |
| Payout Processing | Financial loss | Unit, Integration, E2E | Double-payout prevention, transactions |
| Contribution Tracking | Data integrity | Unit, Integration | Status transitions, all members contribute |
| Authentication Flow | Security breach | Integration, E2E | All providers, session management |
| Authorization | Unauthorized access | Integration | Admin-only operations, data access |

### P1 - High Priority

| Feature | Risk | Test Type | Key Scenarios |
|---------|------|-----------|---------------|
| Pool Creation | Business logic | Unit, Integration | Validation, member setup |
| Member Invitation | User experience | Integration, E2E | Expiration, acceptance, rejection |
| Payment Methods | User experience | Unit, Integration | CRUD, validation |
| Admin Verification | Data integrity | Integration | Only admin can verify |
| Round Advancement | Business logic | Integration | Status reset, recipient change |

### P2 - Medium Priority

| Feature | Risk | Test Type | Key Scenarios |
|---------|------|-----------|---------------|
| Discussions | User experience | Unit, Integration | Threading, mentions |
| Notifications | User experience | Unit | Creation, display |
| User Profile | User experience | Unit, Integration | Updates, settings |
| Search | User experience | Integration | Query accuracy |
| Reminders | User experience | Integration | Scheduling, delivery |

### P3 - Low Priority

| Feature | Risk | Test Type | Key Scenarios |
|---------|------|-----------|---------------|
| UI Components | Visual regression | Unit | Rendering, variants |
| Help Pages | Documentation | E2E smoke | Navigation |
| Settings | User preference | Unit | Persistence |
| Analytics | Business insight | Unit | Calculations |

---

## Appendix A: Implementation Checklist

### Phase 1: Foundation
- [ ] Install testing dependencies
- [ ] Configure Jest for Next.js
- [ ] Configure Playwright
- [ ] Set up mongodb-memory-server
- [ ] Create test fixtures
- [ ] Set up MSW handlers
- [ ] Configure CI/CD pipeline

### Phase 2: Critical Path Tests (P0)
- [ ] MFA service unit tests (100% coverage)
- [ ] Authentication API tests
- [ ] Payout processing tests with transactions
- [ ] Contribution tracking tests
- [ ] Authorization tests
- [ ] E2E: Registration and login flow
- [ ] E2E: MFA verification flow

### Phase 3: High Priority Tests (P1)
- [ ] Pool CRUD API tests
- [ ] Invitation system tests
- [ ] Payment method tests
- [ ] Database model tests
- [ ] E2E: Pool creation flow
- [ ] E2E: Contribution and payout flow

### Phase 4: Medium Priority Tests (P2)
- [ ] Discussion system tests
- [ ] Notification tests
- [ ] User profile tests
- [ ] Search functionality tests
- [ ] Component tests

### Phase 5: Security & Performance
- [ ] Security tests (XSS, injection, auth)
- [ ] Performance benchmarks
- [ ] Load testing setup
- [ ] Accessibility tests
- [ ] Coverage gap analysis

---

## Appendix B: Common Test Patterns

### Authenticated Request Helper

```typescript
// __tests__/helpers/request.helpers.ts
import { getServerSession } from 'next-auth';

export const mockAuthenticatedRequest = (userId: string, options = {}) => {
  jest.mocked(getServerSession).mockResolvedValue({
    user: {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });

  return createMocks({
    method: 'GET',
    ...options,
  });
};
```

### Pool Test Setup Helper

```typescript
// __tests__/helpers/pool.helpers.ts
export const setupPoolWithContributions = async (
  admin: IUser,
  members: IUser[],
  status: 'pending' | 'member_confirmed' | 'verified' = 'verified'
) => {
  const pool = await Pool.create(createPoolWithMembers(admin._id, members.map(m => m._id)));

  pool.members.forEach(member => {
    member.contributionStatus = status;
    if (status !== 'pending') {
      member.contributionConfirmedAt = new Date();
    }
  });

  await pool.save();
  return pool;
};
```

---

*This testing plan provides a comprehensive roadmap for implementing automated tests across the My Juntas App. Prioritize P0 tests for immediate security and financial integrity, then progressively implement remaining phases.*
