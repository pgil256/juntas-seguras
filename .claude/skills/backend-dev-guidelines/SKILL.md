# Backend Development Guidelines

## Overview

This skill provides patterns and guidelines for backend development in the my-juntas-app project, a Next.js application with MongoDB/Mongoose for database operations.

## Quick Navigation

| Resource | Description |
|----------|-------------|
| [API Routes](./resources/api-routes.md) | Next.js App Router API patterns |
| [Database](./resources/database.md) | MongoDB/Mongoose models and queries |
| [Authentication](./resources/authentication.md) | NextAuth.js and MFA patterns |
| [Services](./resources/services.md) | Business logic layer patterns |
| [Error Handling](./resources/error-handling.md) | Error handling and validation |

## Architecture Overview

```
app/api/                    # API Routes (Next.js App Router)
├── auth/                   # Authentication endpoints
├── pools/                  # Pool management (CRUD + business logic)
├── payments/               # Payment processing
├── stripe/                 # Stripe integration
├── users/                  # User management
└── ...

lib/
├── db/
│   ├── connect.ts          # MongoDB connection singleton
│   └── models/             # Mongoose schemas (14 models)
├── services/               # Business logic services
├── auth.ts                 # NextAuth configuration
└── validation.ts           # Environment validation
```

## Core Patterns

### API Route Structure

```typescript
// app/api/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connect';

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Connect to database
    await connectDB();

    // 3. Business logic
    // ...

    // 4. Return response
    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Database Connection

Always use the singleton connection pattern:

```typescript
import connectDB from '@/lib/db/connect';

// In your API route or server action
await connectDB();
```

### Authentication

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const session = await getServerSession(authOptions);

// Access user data
const userId = session?.user?.id;
const userEmail = session?.user?.email;
```

### Response Patterns

```typescript
// Success
return NextResponse.json({ data, message: 'Success' });

// Error with status
return NextResponse.json({ error: 'Not found' }, { status: 404 });

// Validation error
return NextResponse.json(
  { error: 'Validation failed', details: errors },
  { status: 400 }
);
```

## Database Models

Key models in this application:

| Model | Purpose |
|-------|---------|
| User | Accounts, auth, MFA, identity verification |
| Pool | Savings pool configuration, members, transactions |
| Payment | Payment records with Stripe integration |
| PoolInvitation | Pool member invitations |
| Discussion | Pool discussion threads |
| AuditLog | Comprehensive audit trail |
| Reminder | Payment reminders |

## Key Conventions

1. **Always authenticate** - Check session at the start of every protected route
2. **Always connect DB** - Call `connectDB()` before any database operation
3. **Use try-catch** - Wrap all async operations in try-catch blocks
4. **Log errors** - Use `console.error` for server-side error logging
5. **Return proper status codes** - 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 500 (Server Error)
6. **Validate input** - Always validate request body and query parameters

## Common Mistakes to Avoid

- Forgetting to call `connectDB()` before database operations
- Not checking authentication in protected routes
- Returning sensitive data (passwords, tokens) in responses
- Not handling async/await properly
- Missing error handling for database operations

## See Also

- [CLAUDE.md](../../../CLAUDE.md) - Project-wide guidelines
- [Frontend Guidelines](../frontend-dev-guidelines/SKILL.md) - Client-side patterns
