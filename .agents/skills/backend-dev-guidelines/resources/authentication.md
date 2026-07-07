# Authentication Patterns (NextAuth.js)

## Overview

This project uses NextAuth.js v4 with JWT strategy and mandatory MFA for all users.

## Configuration Location

```typescript
// lib/auth.ts - Main NextAuth configuration
```

## Authenticating API Routes (Standard)

**`getCurrentUser()` from `lib/auth.ts` is the single standard** for
authenticating API routes in this project (also documented in CLAUDE.md). Do
**not** call `getServerSession(authOptions)` directly in route handlers —
`getCurrentUser()` wraps it and adds the behavior every route needs.

`getCurrentUser()`:
- validates the NextAuth session,
- connects to the database,
- resolves the session to a **full `User` document** (looking up by Mongo
  `ObjectId`, then falling back to email for OAuth users whose session id is a
  provider id), and
- returns `{ user, error }`, where `error` is `{ message, status }` and is
  non-null (status 401) when there is no session **or** the user isn't found.

> Behavior note: because it does a DB lookup, `getCurrentUser()` returns **401**
> for a valid session whose user no longer exists — stricter than a raw
> `getServerSession` check. Routes that previously returned 404 "User not found"
> now return 401 here.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // getCurrentUser() validates the session AND connects to the database.
  const userResult = await getCurrentUser();
  if (userResult.error) {
    return NextResponse.json(
      { error: userResult.error.message },
      { status: userResult.error.status }
    );
  }
  const user = userResult.user; // full Mongoose User document

  // Use the resolved user directly — no extra findOne needed.
  const userId = user._id.toString();
  const userEmail = user.email;
  const userName = user.name;

  // ... business logic ...
  return NextResponse.json({ data: { userId } });
}
```

### `requireCurrentUser()` — throwing variant

For handlers whose body is already wrapped in `try/catch`, use
`requireCurrentUser()`, which returns the `User` document directly and throws an
`Error` with a `.status` property when authentication fails:

```typescript
import { requireCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser(); // throws on auth failure
    // ... business logic ...
    return NextResponse.json({ success: true });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
```

### When raw `getServerSession` is still appropriate

`getServerSession(authOptions)` is used **only** inside `lib/auth.ts` (which
`getCurrentUser` builds on) and in the NextAuth handler/config. For "soft"
identity (endpoints that also allow anonymous access) still call
`getCurrentUser()`, but treat a missing user as optional rather than a hard 401:

```typescript
const { user } = await getCurrentUser(); // user may be null; do not 401
const requesterId = user?._id?.toString();
```

## Session Type Extension

```typescript
// types/next-auth.d.ts
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      mfaVerified?: boolean;
      identityVerified?: boolean;
    };
  }

  interface User {
    id: string;
    mfaEnabled: boolean;
    mfaVerified?: boolean;
  }
}
```

## MFA Verification Check

MFA state lives on the **session token** (`mfaVerified`), so read it from the
session. Authenticate with `getCurrentUser()` as usual, then use `getSession()`
(also from `lib/auth.ts`) for the session-level flag:

```typescript
import { getCurrentUser, getSession } from '@/lib/auth';

// Authenticate (and load the user) the standard way.
const userResult = await getCurrentUser();
if (userResult.error) {
  return NextResponse.json(
    { error: userResult.error.message },
    { status: userResult.error.status }
  );
}

// For sensitive operations, also require MFA (a session-level flag).
const session = await getSession();
if (!session?.user?.mfaVerified) {
  return NextResponse.json(
    { error: 'MFA verification required' },
    { status: 403 }
  );
}
```

## MFA Code Generation

```typescript
// lib/services/mfa.ts
import crypto from 'crypto';

export function generateMFACode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function verifyMFACode(
  storedCode: string,
  inputCode: string,
  expiresAt: Date
): boolean {
  if (new Date() > expiresAt) {
    return false;
  }
  return storedCode === inputCode;
}
```

## TOTP (Authenticator App) Pattern

```typescript
import { authenticator } from 'otplib';

// Generate secret for setup
export function generateTOTPSecret(): string {
  return authenticator.generateSecret();
}

// Generate QR code URL
export function getTOTPUri(secret: string, email: string): string {
  return authenticator.keyuri(email, 'Juntas App', secret);
}

// Verify TOTP code
export function verifyTOTP(token: string, secret: string): boolean {
  return authenticator.verify({ token, secret });
}
```

## Protected Route Pattern

```typescript
import { getCurrentUser } from '@/lib/auth';
import type { UserDocument } from '@/lib/db/models/user';

// Reusable guard that hands the resolved user to your handler.
export async function protectedRouteHandler(
  request: NextRequest,
  handler: (user: UserDocument) => Promise<NextResponse>
) {
  const userResult = await getCurrentUser();
  if (userResult.error) {
    return NextResponse.json(
      { error: userResult.error.message },
      { status: userResult.error.status }
    );
  }

  return handler(userResult.user);
}

// Usage
export async function GET(request: NextRequest) {
  return protectedRouteHandler(request, async (user) => {
    // Your protected logic here
    return NextResponse.json({ userId: user._id.toString() });
  });
}
```

## Role-Based Access

```typescript
// Check user role/permissions
async function checkPoolAdmin(
  poolId: string,
  userId: string
): Promise<boolean> {
  const pool = await Pool.findById(poolId);
  return pool?.creatorId.toString() === userId;
}

// In route handler (user comes from getCurrentUser())
const isAdmin = await checkPoolAdmin(params.id, user._id.toString());
if (!isAdmin) {
  return NextResponse.json(
    { error: 'Admin access required' },
    { status: 403 }
  );
}
```

## OAuth Providers

The app supports Google and Microsoft Azure AD:

```typescript
// In lib/auth.ts providers array
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';

providers: [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!
  }),
  AzureADProvider({
    clientId: process.env.AZURE_AD_CLIENT_ID!,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
    tenantId: process.env.AZURE_AD_TENANT_ID!
  })
]
```

## JWT Callbacks

```typescript
// Customize JWT token
callbacks: {
  async jwt({ token, user, trigger, session }) {
    if (user) {
      token.id = user.id;
      token.mfaEnabled = user.mfaEnabled;
    }

    // Handle session updates
    if (trigger === 'update' && session) {
      token.mfaVerified = session.mfaVerified;
    }

    return token;
  },

  async session({ session, token }) {
    session.user.id = token.id as string;
    session.user.mfaVerified = token.mfaVerified as boolean;
    return session;
  }
}
```

## Password Hashing

```typescript
import bcrypt from 'bcryptjs';

// Hash password before storing
const hashedPassword = await bcrypt.hash(password, 12);

// Verify password
const isValid = await bcrypt.compare(inputPassword, storedHash);
```

## Security Best Practices

1. **Always authenticate** protected routes with `getCurrentUser()` / `requireCurrentUser()`
2. **Verify MFA** for sensitive operations (payments, settings changes)
3. **Use HTTPS** in production
4. **Set secure cookies** via NextAuth configuration
5. **Implement rate limiting** for auth endpoints
6. **Log authentication events** for audit trail
7. **Never expose** password hashes or tokens in responses
