# Frontend Development Guidelines

## Overview

This skill provides patterns and guidelines for frontend development in the my-juntas-app project, a Next.js application using React, Tailwind CSS, and shadcn/ui components.

## Quick Navigation

| Resource | Description |
|----------|-------------|
| [Components](./resources/components.md) | React component patterns |
| [Styling](./resources/styling.md) | Tailwind CSS and shadcn/ui |
| [Hooks](./resources/hooks.md) | Custom React hooks |
| [Forms](./resources/forms.md) | Form handling patterns |
| [State Management](./resources/state.md) | Context and state patterns |

## Architecture Overview

```
components/
├── ui/                     # shadcn/ui base components
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   └── ...
├── pools/                  # Pool-related components
├── payments/               # Payment UI components
├── auth/                   # Authentication components
├── dashboard/              # Dashboard widgets
├── discussions/            # Discussion/messaging
├── notifications/          # Notification components
└── Navbar.tsx              # Main navigation

app/
├── page.tsx                # Home page
├── dashboard/page.tsx      # Dashboard
├── pools/[id]/page.tsx     # Pool detail pages
├── my-pool/page.tsx        # User's pool dashboard
├── settings/page.tsx       # User settings
└── layout.tsx              # Root layout

lib/hooks/                  # Custom hooks (22 total)
```

## Core Patterns

### Component Structure

```tsx
// components/pools/PoolCard.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PoolCardProps {
  pool: {
    id: string;
    name: string;
    memberCount: number;
    contributionAmount: number;
  };
  className?: string;
  onSelect?: (id: string) => void;
}

export function PoolCard({ pool, className, onSelect }: PoolCardProps) {
  return (
    <Card className={cn('hover:shadow-lg transition-shadow', className)}>
      <CardHeader>
        <CardTitle>{pool.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {pool.memberCount} members
        </p>
        <p className="text-lg font-semibold">
          ${pool.contributionAmount}/month
        </p>
        {onSelect && (
          <Button
            onClick={() => onSelect(pool.id)}
            className="mt-4 w-full"
          >
            View Details
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

### Page Structure (App Router)

```tsx
// app/pools/[id]/page.tsx
import { Metadata } from 'next';
import { PoolDetail } from '@/components/pools/PoolDetail';

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `Pool Details | Juntas`,
  };
}

export default function PoolPage({ params }: PageProps) {
  return (
    <main className="container mx-auto py-8 px-4">
      <PoolDetail poolId={params.id} />
    </main>
  );
}
```

### Client Component with Data Fetching

```tsx
'use client';

import { usePool } from '@/lib/hooks/usePool';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function PoolDetail({ poolId }: { poolId: string }) {
  const { pool, isLoading, error } = usePool(poolId);

  if (isLoading) {
    return <PoolSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!pool) {
    return <p>Pool not found</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{pool.name}</h1>
      {/* Pool content */}
    </div>
  );
}

function PoolSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
```

## Key Libraries

| Library | Purpose |
|---------|---------|
| React 18 | UI framework |
| Next.js 14 | Full-stack framework |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Component library |
| Radix UI | Accessible primitives |
| class-variance-authority | Component variants |
| clsx/tailwind-merge | Class composition |

## Conventions

1. **Use 'use client'** for interactive components
2. **Prefer named exports** for components
3. **Use TypeScript interfaces** for props
4. **Use cn() helper** for conditional classes
5. **Keep components focused** - single responsibility
6. **Use shadcn/ui components** as base building blocks
7. **Follow accessibility** - use Radix primitives

## Common Mistakes to Avoid

- Forgetting 'use client' for components with hooks/interactivity
- Not handling loading and error states
- Inline styles instead of Tailwind classes
- Not using the cn() utility for class merging
- Creating new UI primitives instead of using shadcn/ui
- Not typing props with TypeScript interfaces

## See Also

- [CLAUDE.md](../../../CLAUDE.md) - Project-wide guidelines
- [Backend Guidelines](../backend-dev-guidelines/SKILL.md) - API patterns
