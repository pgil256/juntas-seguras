# State Management Patterns

## Local Component State

```tsx
'use client';

import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(prev => prev + 1)}>Increment</button>
    </div>
  );
}
```

## Complex Local State with useReducer

```tsx
'use client';

import { useReducer } from 'react';

interface State {
  items: Item[];
  isLoading: boolean;
  error: string | null;
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Item[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'ADD_ITEM'; payload: Item }
  | { type: 'REMOVE_ITEM'; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, isLoading: false, items: action.payload };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.payload] };
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
      };
    default:
      return state;
  }
}

function ItemList() {
  const [state, dispatch] = useReducer(reducer, {
    items: [],
    isLoading: false,
    error: null,
  });

  const fetchItems = async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const res = await fetch('/api/items');
      const data = await res.json();
      dispatch({ type: 'FETCH_SUCCESS', payload: data.items });
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', payload: 'Failed to fetch' });
    }
  };

  // ...
}
```

## Context Pattern for Global State

```tsx
// contexts/NotificationContext.tsx
'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (type: Notification['type'], message: string) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (type: Notification['type'], message: string) => {
      const id = Math.random().toString(36).slice(2);
      setNotifications(prev => [...prev, { id, type, message }]);

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        removeNotification(id);
      }, 5000);
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, addNotification, removeNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotifications must be used within NotificationProvider'
    );
  }
  return context;
}
```

### Using Context

```tsx
// In layout or top-level component
import { NotificationProvider } from '@/contexts/NotificationContext';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}

// In any child component
function SomeComponent() {
  const { addNotification } = useNotifications();

  const handleClick = () => {
    addNotification('success', 'Operation completed!');
  };

  return <Button onClick={handleClick}>Do Something</Button>;
}
```

## Auth Context Pattern

```tsx
// contexts/AuthContext.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const value: AuthContextType = {
    user: session?.user as User | null,
    isAuthenticated: !!session?.user,
    isLoading: status === 'loading',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

## Server State with SWR

```tsx
// For server data, prefer SWR over context
import useSWR from 'swr';

// Global configuration
import { SWRConfig } from 'swr';

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: (url: string) => fetch(url).then(res => res.json()),
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 2000,
      }}
    >
      {children}
    </SWRConfig>
  );
}

// In components
function PoolData({ poolId }: { poolId: string }) {
  const { data, error, mutate } = useSWR(`/api/pools/${poolId}`);

  // Optimistic update
  const updatePool = async (updates: Partial<Pool>) => {
    mutate({ ...data, ...updates }, false); // Update cache immediately
    await fetch(`/api/pools/${poolId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    mutate(); // Revalidate
  };

  return <PoolCard pool={data} onUpdate={updatePool} />;
}
```

## URL State

```tsx
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';

function FilteredList() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const status = searchParams.get('status') || 'all';
  const sort = searchParams.get('sort') || 'date';

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div>
      <Select value={status} onValueChange={(v) => updateFilter('status', v)}>
        {/* Options */}
      </Select>

      <Select value={sort} onValueChange={(v) => updateFilter('sort', v)}>
        {/* Options */}
      </Select>

      {/* List filtered by URL params */}
    </div>
  );
}
```

## When to Use What

| Scenario | Solution |
|----------|----------|
| UI-only state (modals, forms) | `useState` |
| Complex state logic | `useReducer` |
| Theme, locale, user prefs | Context |
| Server data | SWR or React Query |
| Shareable/bookmarkable state | URL params |
| Form state | Local state or form library |

## Best Practices

1. **Keep state close to where it's used** - Don't lift state unnecessarily
2. **Derive what you can** - Calculate instead of storing
3. **Use URL for shareable state** - Filters, pagination, tabs
4. **Server state ≠ client state** - Use SWR for server data
5. **Avoid prop drilling** - Use context for deeply nested data
6. **Memoize expensive computations** - `useMemo` for derived data
7. **Batch state updates** - React 18 does this automatically
