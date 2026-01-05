# Custom React Hooks

## Available Hooks (lib/hooks/)

| Hook | Purpose |
|------|---------|
| `usePool` | Fetch single pool data |
| `usePools` | Fetch user's pools |
| `usePoolContributions` | Pool contribution management |
| `usePoolPayouts` | Pool payout management |
| `usePoolMembers` | Pool member management |
| `usePoolAnalytics` | Pool statistics |
| `usePoolInvitations` | Pool invitation handling |
| `useCreatePool` | Pool creation |
| `usePaymentMethods` | User payment methods |
| `usePayments` | Payment history |
| `useIdentityVerification` | KYC verification status |
| `useEarlyPayout` | Early payout requests |
| `useDirectMessages` | Direct messaging |
| `usePoolMessages` | Pool messaging |
| `useUserProfile` | User profile data |
| `useUserSettings` | User settings |
| `useUserId` | Current user ID |
| `useSearch` | Search functionality |
| `useTickets` | Support tickets |
| `useCreateNotification` | Create notifications |
| `useDebounce` | Debounce utility |

## Hook Pattern Structure

```typescript
// lib/hooks/usePool.ts
'use client';

import useSWR from 'swr';

interface Pool {
  id: string;
  name: string;
  // ... other fields
}

interface UsePoolReturn {
  pool: Pool | null;
  isLoading: boolean;
  error: Error | null;
  mutate: () => void;
}

const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  });

export function usePool(poolId: string): UsePoolReturn {
  const { data, error, isLoading, mutate } = useSWR<{ pool: Pool }>(
    poolId ? `/api/pools/${poolId}` : null,
    fetcher
  );

  return {
    pool: data?.pool ?? null,
    isLoading,
    error: error ?? null,
    mutate,
  };
}
```

## Data Fetching Hooks (SWR Pattern)

```typescript
// lib/hooks/usePools.ts
import useSWR from 'swr';

export function usePools() {
  const { data, error, isLoading, mutate } = useSWR('/api/pools', fetcher);

  return {
    pools: data?.pools ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

// Usage in component
function PoolList() {
  const { pools, isLoading, error } = usePools();

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {pools.map(pool => <PoolCard key={pool.id} pool={pool} />)}
    </div>
  );
}
```

## Mutation Hooks

```typescript
// lib/hooks/useCreatePool.ts
import { useState } from 'react';
import { mutate } from 'swr';

interface CreatePoolData {
  name: string;
  contributionAmount: number;
  frequency: string;
  maxMembers: number;
}

export function useCreatePool() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createPool = async (data: CreatePoolData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create pool');
      }

      const result = await response.json();

      // Revalidate pools list
      mutate('/api/pools');

      return result.pool;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { createPool, isLoading, error };
}

// Usage
function CreatePoolForm() {
  const { createPool, isLoading, error } = useCreatePool();

  const handleSubmit = async (data: CreatePoolData) => {
    try {
      const pool = await createPool(data);
      router.push(`/pools/${pool.id}`);
    } catch {
      // Error already set in hook
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert variant="destructive">{error.message}</Alert>}
      {/* Form fields */}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Pool'}
      </Button>
    </form>
  );
}
```

## Utility Hooks

### useDebounce

```typescript
// lib/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage
function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const { results } = useSearch(debouncedQuery);

  return (
    <Input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

### useLocalStorage

```typescript
// lib/hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error('useLocalStorage error:', error);
    }
  };

  return [storedValue, setValue] as const;
}
```

### useMediaQuery

```typescript
// lib/hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// Usage
function ResponsiveComponent() {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return isMobile ? <MobileView /> : <DesktopView />;
}
```

## Hook Rules

1. **Only call at top level** - Never inside loops, conditions, or nested functions
2. **Only call in React functions** - Components or custom hooks
3. **Name with "use" prefix** - usePool, useAuth, etc.
4. **Return consistent shape** - Same properties every render
5. **Handle cleanup** - Return cleanup function from useEffect when needed

## Common Patterns

### Conditional Fetching

```typescript
// Only fetch when poolId is available
const { data } = useSWR(poolId ? `/api/pools/${poolId}` : null, fetcher);
```

### Optimistic Updates

```typescript
const { mutate } = useSWR('/api/pools');

const updatePool = async (id: string, updates: Partial<Pool>) => {
  // Optimistically update the cache
  mutate(
    (current) => ({
      pools: current.pools.map(p =>
        p.id === id ? { ...p, ...updates } : p
      )
    }),
    false // Don't revalidate yet
  );

  // Make the actual request
  await fetch(`/api/pools/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });

  // Revalidate to get server state
  mutate();
};
```
