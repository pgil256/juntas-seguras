# API Routes Patterns

## Route File Structure

Next.js App Router uses file-based routing for API endpoints.

```
app/api/
├── auth/
│   ├── register/route.ts       # POST /api/auth/register
│   ├── verify/route.ts         # POST /api/auth/verify
│   └── [...nextauth]/route.ts  # NextAuth handlers
├── pools/
│   ├── route.ts                # GET/POST /api/pools
│   └── [id]/
│       ├── route.ts            # GET/PUT/DELETE /api/pools/[id]
│       ├── members/route.ts    # GET/POST /api/pools/[id]/members
│       └── contributions/route.ts
└── users/
    └── [userId]/route.ts       # GET /api/users/[userId]
```

## HTTP Method Handlers

```typescript
// app/api/pools/route.ts
import { NextRequest, NextResponse } from 'next/server';

// GET /api/pools - List pools
export async function GET(request: NextRequest) {
  // Implementation
}

// POST /api/pools - Create pool
export async function POST(request: NextRequest) {
  // Implementation
}
```

## Dynamic Route Parameters

```typescript
// app/api/pools/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: { id: string };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const poolId = params.id;
  // Use poolId...
}
```

## Query Parameters

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const status = searchParams.get('status');

  // Use parameters...
}
```

## Request Body Parsing

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();

  const { name, amount, frequency } = body;

  // Validate required fields
  if (!name || !amount) {
    return NextResponse.json(
      { error: 'Name and amount are required' },
      { status: 400 }
    );
  }

  // Process...
}
```

## Complete Route Example

```typescript
// app/api/pools/[id]/contributions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connect';
import Pool from '@/lib/db/models/Pool';
import Payment from '@/lib/db/models/Payment';

interface RouteParams {
  params: { id: string };
}

// POST - Record a contribution
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse and validate body
    const body = await request.json();
    const { amount, paymentMethod } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    // 3. Connect to database
    await connectDB();

    // 4. Verify pool exists and user is a member
    const pool = await Pool.findById(params.id);
    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    const isMember = pool.members.some(
      (m: any) => m.userId.toString() === session.user.id
    );
    if (!isMember) {
      return NextResponse.json(
        { error: 'Not a pool member' },
        { status: 403 }
      );
    }

    // 5. Create payment record
    const payment = await Payment.create({
      poolId: params.id,
      userId: session.user.id,
      amount,
      type: 'contribution',
      status: 'pending',
      paymentMethod
    });

    // 6. Return success
    return NextResponse.json(
      { payment, message: 'Contribution recorded' },
      { status: 201 }
    );

  } catch (error) {
    console.error('Contribution error:', error);
    return NextResponse.json(
      { error: 'Failed to process contribution' },
      { status: 500 }
    );
  }
}

// GET - List contributions for pool
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const contributions = await Payment.find({
      poolId: params.id,
      type: 'contribution'
    })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ contributions });

  } catch (error) {
    console.error('Get contributions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contributions' },
      { status: 500 }
    );
  }
}
```

## Response Headers

```typescript
export async function GET(request: NextRequest) {
  const data = await fetchData();

  return NextResponse.json(data, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
      'X-Custom-Header': 'value'
    }
  });
}
```

## Audit Logging Pattern

```typescript
import AuditLog from '@/lib/db/models/AuditLog';

// After important operations
await AuditLog.create({
  userId: session.user.id,
  action: 'POOL_CREATED',
  resourceType: 'pool',
  resourceId: pool._id,
  details: { poolName: pool.name },
  ipAddress: request.headers.get('x-forwarded-for'),
  userAgent: request.headers.get('user-agent')
});
```
