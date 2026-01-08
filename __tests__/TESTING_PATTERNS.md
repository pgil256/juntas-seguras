# Testing Patterns Guide

This document describes the testing patterns and best practices used in this codebase.

## Test Directory Structure

```
__tests__/
├── unit/                    # Unit tests (isolated component/function testing)
│   ├── components/          # React component tests
│   ├── hooks/               # Custom hook tests
│   └── lib/                 # Utility and service tests
├── integration/             # Integration tests (API routes, database operations)
│   ├── api/                 # API endpoint tests
│   └── db/                  # Database model tests
├── security/                # Security-focused tests
├── performance/             # Performance tests
├── fixtures/                # Test data fixtures
├── helpers/                 # Test utility functions
└── mocks/                   # Mock implementations
```

## Test Environment Configuration

### Jest Configuration (`jest.config.js`)

The project uses `next/jest` with custom configuration:

- **Test Environment**: `jest-environment-jsdom` for component tests
- **Transform Ignore Patterns**: ESM packages like `bson`, `mongodb`, `lucide-react` are transformed
- **Module Mapping**: `@/` alias maps to project root

### Setup Files

- `jest.setup.js` - Main setup file with:
  - TextEncoder/TextDecoder polyfills
  - Web Streams polyfills
  - Request/Response polyfills
  - Next.js router mocks
  - next-auth mocks
  - Environment variables

- `jest.setup.node.js` - Node environment setup for integration tests

## Writing Unit Tests

### Component Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from '@/components/ComponentName';

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName prop="value" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    const onAction = jest.fn();

    render(<ComponentName onAction={onAction} />);
    await user.click(screen.getByRole('button'));

    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
```

### Hook Tests

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCustomHook } from '@/lib/hooks/useCustomHook';

describe('useCustomHook', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useCustomHook());
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('updates state on action', async () => {
    const { result } = renderHook(() => useCustomHook());

    await act(async () => {
      await result.current.fetchData();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
```

### Service/Utility Tests

```typescript
import { utilityFunction } from '@/lib/utils';

describe('utilityFunction', () => {
  it('handles valid input', () => {
    expect(utilityFunction('valid')).toBe('expected');
  });

  it('handles edge cases', () => {
    expect(utilityFunction('')).toBe('');
    expect(utilityFunction(null)).toBeNull();
  });
});
```

## Writing Integration Tests

### API Route Tests

```typescript
import { createMockRequest, parseResponse } from '../../helpers/test-utils';
import { GET, POST } from '@/app/api/endpoint/route';

// Mock dependencies
jest.mock('@/lib/db/connect');
jest.mock('next-auth');

describe('API /api/endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('returns data for authenticated user', async () => {
      // Setup mocks
      mockAuthenticatedSession({ userId: 'user123' });

      const request = createMockRequest('GET', '/api/endpoint');
      const response = await GET(request);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 401 for unauthenticated user', async () => {
      mockUnauthenticatedSession();

      const request = createMockRequest('GET', '/api/endpoint');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });
});
```

### Database Model Tests

```typescript
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from '@/lib/db/models/model';

describe('Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Model.deleteMany({});
  });

  it('creates document with required fields', async () => {
    const doc = await Model.create({
      requiredField: 'value',
    });

    expect(doc._id).toBeDefined();
    expect(doc.requiredField).toBe('value');
  });
});
```

## Writing Security Tests

### Authentication Tests

```typescript
describe('Authentication Security', () => {
  it('rejects invalid credentials', async () => {
    const result = await authenticateUser('invalid', 'credentials');
    expect(result).toBeNull();
  });

  it('enforces MFA requirement', async () => {
    const user = await createUserWithMFA();
    const session = await attemptLogin(user);
    expect(session.mfaVerified).toBe(false);
  });
});
```

### Input Validation Tests

```typescript
describe('Input Validation', () => {
  const maliciousInputs = [
    '<script>alert("xss")</script>',
    '"; DROP TABLE users; --',
    '../../../etc/passwd',
  ];

  maliciousInputs.forEach(input => {
    it(`sanitizes malicious input: ${input.substring(0, 20)}...`, async () => {
      const result = await processInput(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('DROP TABLE');
    });
  });
});
```

## Test Helpers

### Database Helpers (`__tests__/helpers/db.helpers.ts`)

```typescript
import { setupTestDb, teardownTestDb, clearTestDb } from '../helpers/db.helpers';

describe('Test with database', () => {
  beforeAll(() => setupTestDb());
  afterAll(() => teardownTestDb());
  beforeEach(() => clearTestDb());

  // tests...
});
```

### Mock Utilities (`__tests__/helpers/test-utils.ts`)

```typescript
import {
  createMockRequest,
  parseResponse,
  mockAuthenticatedSession,
  mockUnauthenticatedSession,
  generateMockUuid,
} from '../helpers/test-utils';
```

## Test Fixtures

### User Fixtures (`__tests__/fixtures/users.ts`)

```typescript
export const testUsers = {
  admin: {
    id: 'admin-user-id',
    email: 'admin@example.com',
    role: 'admin',
  },
  member: {
    id: 'member-user-id',
    email: 'member@example.com',
    role: 'member',
  },
};
```

## Mocking Patterns

### Mocking Next.js Features

```typescript
// Router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => '/',
}));

// Auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: mockSession, status: 'authenticated' }),
}));
```

### Mocking External Services

```typescript
// Email
jest.mock('nodemailer', () => ({
  createTransport: () => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
  }),
}));

// Database
jest.mock('@/lib/db/connect', () => ({
  default: jest.fn().mockResolvedValue(undefined),
}));
```

## Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests (run in band for database isolation)
npm run test:integration

# Security tests
npm run test:security

# Performance tests
npm run test:performance

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# CI mode (sequential with coverage)
npm run test:ci
```

## Coverage Targets

| Metric | Target |
|--------|--------|
| Statements | 70% |
| Branches | 70% |
| Functions | 70% |
| Lines | 70% |

## Critical Paths Requiring 100% Coverage

1. **MFA Verification** - `lib/services/mfa.ts`
2. **Password Reset** - `app/api/auth/reset-password/`
3. **Session Management** - `lib/auth.ts`
4. **Payout Processing** - `app/api/pools/[id]/payouts/`
5. **Transaction Recording** - Pool contribution/payout transactions
6. **Invitation Handling** - `app/api/pools/invitations/`

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Clean Up**: Use `beforeEach`/`afterEach` to reset state
3. **Descriptive Names**: Test names should describe the behavior
4. **AAA Pattern**: Arrange, Act, Assert
5. **Test Edge Cases**: Empty inputs, nulls, boundaries
6. **Mock External Dependencies**: Database, email, APIs
7. **Use Fixtures**: Consistent test data across tests
8. **Type Safety**: Use TypeScript for test files
