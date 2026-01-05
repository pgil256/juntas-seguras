# React Component Patterns

## Component File Structure

```tsx
// 1. 'use client' directive (if needed)
'use client';

// 2. Imports - grouped and ordered
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// External libraries
import { format } from 'date-fns';

// Internal UI components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Internal utilities
import { cn } from '@/lib/utils';

// Types
import type { Pool } from '@/types/pool';

// 3. Interface/Type definitions
interface ComponentProps {
  pool: Pool;
  className?: string;
  onAction?: () => void;
}

// 4. Component definition (named export preferred)
export function ComponentName({ pool, className, onAction }: ComponentProps) {
  // 5. Hooks at the top
  const [state, setState] = useState(false);
  const router = useRouter();

  // 6. Event handlers
  const handleClick = () => {
    onAction?.();
  };

  // 7. Render
  return (
    <div className={cn('base-styles', className)}>
      {/* Component content */}
    </div>
  );
}
```

## Server vs Client Components

### Server Components (Default in App Router)

```tsx
// app/pools/page.tsx - Server Component (no 'use client')
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connect';
import Pool from '@/lib/db/models/Pool';

export default async function PoolsPage() {
  const session = await getServerSession(authOptions);

  await connectDB();
  const pools = await Pool.find({
    'members.userId': session?.user?.id
  }).lean();

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">My Pools</h1>
      {pools.map(pool => (
        <PoolCard key={pool._id.toString()} pool={pool} />
      ))}
    </div>
  );
}
```

### Client Components

```tsx
// components/pools/PoolActions.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

// Use 'use client' when:
// - Using hooks (useState, useEffect, etc.)
// - Using browser APIs
// - Adding event listeners
// - Using context

export function PoolActions({ poolId }: { poolId: string }) {
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setLoading(true);
    // Handle join logic
    setLoading(false);
  };

  return (
    <Button onClick={handleJoin} disabled={loading}>
      {loading ? 'Joining...' : 'Join Pool'}
    </Button>
  );
}
```

## Component Composition

### Compound Components Pattern

```tsx
// components/ui/card.tsx (shadcn/ui pattern)
import { cn } from '@/lib/utils';

const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'rounded-lg border bg-card text-card-foreground shadow-sm',
      className
    )}
    {...props}
  />
);

const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
);

const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
    {...props}
  />
);

const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-6 pt-0', className)} {...props} />
);

export { Card, CardHeader, CardTitle, CardContent };
```

### Usage

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

function PoolSummary({ pool }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{pool.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Members: {pool.members.length}</p>
      </CardContent>
    </Card>
  );
}
```

## Render Props & Children

```tsx
interface ContainerProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

function Container({ children, header, footer }: ContainerProps) {
  return (
    <div className="flex flex-col min-h-screen">
      {header && <header className="border-b">{header}</header>}
      <main className="flex-1">{children}</main>
      {footer && <footer className="border-t">{footer}</footer>}
    </div>
  );
}
```

## Forwarding Refs

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2',
          'text-sm ring-offset-background file:border-0 file:bg-transparent',
          'placeholder:text-muted-foreground focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
```

## Conditional Rendering

```tsx
function PoolStatus({ status }: { status: string }) {
  // Early return for invalid state
  if (!status) return null;

  // Conditional rendering
  return (
    <div>
      {status === 'active' && (
        <Badge variant="success">Active</Badge>
      )}
      {status === 'pending' && (
        <Badge variant="warning">Pending</Badge>
      )}
      {status === 'completed' && (
        <Badge variant="default">Completed</Badge>
      )}
    </div>
  );
}

// Or with a map
const statusConfig = {
  active: { variant: 'success', label: 'Active' },
  pending: { variant: 'warning', label: 'Pending' },
  completed: { variant: 'default', label: 'Completed' },
};

function PoolStatus({ status }: { status: keyof typeof statusConfig }) {
  const config = statusConfig[status];
  if (!config) return null;

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
```

## Lists and Keys

```tsx
function MemberList({ members }: { members: Member[] }) {
  return (
    <ul className="space-y-2">
      {members.map((member) => (
        // Use stable, unique ID as key - NEVER use array index
        <li key={member.id} className="flex items-center gap-2">
          <Avatar src={member.avatar} alt={member.name} />
          <span>{member.name}</span>
        </li>
      ))}
    </ul>
  );
}
```

## Loading States

```tsx
import { Skeleton } from '@/components/ui/skeleton';

function PoolCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-10 w-full mt-4" />
      </CardContent>
    </Card>
  );
}

function PoolList() {
  const { pools, isLoading } = usePools();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <PoolCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {pools.map(pool => (
        <PoolCard key={pool.id} pool={pool} />
      ))}
    </div>
  );
}
```
