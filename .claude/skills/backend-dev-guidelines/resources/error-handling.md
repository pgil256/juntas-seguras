# Error Handling & Validation

## Standard Error Response Format

```typescript
// Success response
{
  data: { ... },
  message: 'Operation successful'
}

// Error response
{
  error: 'Error message',
  details?: { ... }  // Optional validation details
}
```

## HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST creating resource |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation errors, malformed request |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource, state conflict |
| 422 | Unprocessable | Valid format but semantic errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Unexpected errors |

## Try-Catch Pattern

```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse and validate input
    const body = await request.json();
    const validation = validateInput(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // 3. Business logic
    await connectDB();
    const result = await performOperation(body);

    // 4. Success response
    return NextResponse.json(
      { data: result, message: 'Success' },
      { status: 201 }
    );

  } catch (error: any) {
    // 5. Error handling
    console.error('Operation error:', error);

    // Handle known error types
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Duplicate entry' },
        { status: 409 }
      );
    }

    // Generic error
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Input Validation

### Manual Validation

```typescript
interface ValidationResult {
  success: boolean;
  errors?: Record<string, string>;
}

function validatePoolInput(data: any): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name?.trim()) {
    errors.name = 'Pool name is required';
  } else if (data.name.length > 100) {
    errors.name = 'Pool name cannot exceed 100 characters';
  }

  if (!data.contributionAmount) {
    errors.contributionAmount = 'Contribution amount is required';
  } else if (data.contributionAmount < 1) {
    errors.contributionAmount = 'Amount must be at least $1';
  }

  if (!data.maxMembers) {
    errors.maxMembers = 'Maximum members is required';
  } else if (data.maxMembers < 2 || data.maxMembers > 20) {
    errors.maxMembers = 'Members must be between 2 and 20';
  }

  const validFrequencies = ['weekly', 'biweekly', 'monthly'];
  if (data.frequency && !validFrequencies.includes(data.frequency)) {
    errors.frequency = 'Invalid frequency';
  }

  return {
    success: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined
  };
}

// Usage
const validation = validatePoolInput(body);
if (!validation.success) {
  return NextResponse.json(
    { error: 'Validation failed', details: validation.errors },
    { status: 400 }
  );
}
```

### With Zod (Recommended)

```typescript
import { z } from 'zod';

const PoolSchema = z.object({
  name: z.string()
    .min(1, 'Pool name is required')
    .max(100, 'Name cannot exceed 100 characters'),
  description: z.string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  contributionAmount: z.number()
    .min(1, 'Amount must be at least $1'),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  maxMembers: z.number()
    .min(2, 'Pool must have at least 2 members')
    .max(20, 'Pool cannot exceed 20 members')
});

// Usage
try {
  const validatedData = PoolSchema.parse(body);
  // Use validatedData...
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      },
      { status: 400 }
    );
  }
  throw error;
}
```

## Mongoose Error Handling

```typescript
try {
  await document.save();
} catch (error: any) {
  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const details = Object.keys(error.errors).reduce((acc, key) => {
      acc[key] = error.errors[key].message;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json(
      { error: 'Validation failed', details },
      { status: 400 }
    );
  }

  // Duplicate key error (unique constraint)
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return NextResponse.json(
      { error: `${field} already exists` },
      { status: 409 }
    );
  }

  // Cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    return NextResponse.json(
      { error: 'Invalid ID format' },
      { status: 400 }
    );
  }

  throw error;
}
```

## Custom Error Classes

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, string>) {
    super('Validation failed', 400, details);
    this.name = 'ValidationError';
  }
}

// Usage in route
try {
  const pool = await Pool.findById(id);
  if (!pool) throw new NotFoundError('Pool');
  // ...
} catch (error) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.statusCode }
    );
  }
  // Unexpected error
  console.error('Unexpected error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

## Logging Best Practices

```typescript
// Log with context
console.error('Pool creation failed:', {
  userId: session.user.id,
  error: error.message,
  stack: error.stack
});

// Don't log sensitive data
// BAD:
console.log('User login:', { email, password });

// GOOD:
console.log('User login attempt:', { email });
```
