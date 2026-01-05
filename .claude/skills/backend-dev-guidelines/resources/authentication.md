# Authentication Patterns (NextAuth.js)

## Overview

This project uses NextAuth.js v4 with JWT strategy and mandatory MFA for all users.

## Configuration Location

```typescript
// lib/auth.ts - Main NextAuth configuration
```

## Session Access in API Routes

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // User is authenticated
  const userId = session.user.id;
  const userEmail = session.user.email;
  const userName = session.user.name;
}
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

```typescript
// For sensitive operations, verify MFA status
const session = await getServerSession(authOptions);

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
// Middleware protection pattern
export async function protectedRouteHandler(
  request: NextRequest,
  handler: (session: Session) => Promise<NextResponse>
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return handler(session);
}

// Usage
export async function GET(request: NextRequest) {
  return protectedRouteHandler(request, async (session) => {
    // Your protected logic here
    return NextResponse.json({ userId: session.user.id });
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

// In route handler
const isAdmin = await checkPoolAdmin(params.id, session.user.id);
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

1. **Always check session** in protected routes
2. **Verify MFA** for sensitive operations (payments, settings changes)
3. **Use HTTPS** in production
4. **Set secure cookies** via NextAuth configuration
5. **Implement rate limiting** for auth endpoints
6. **Log authentication events** for audit trail
7. **Never expose** password hashes or tokens in responses
