// components/ui/offline-indicator.tsx
// Shows a banner when the user is offline
'use client';

import * as React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface OfflineIndicatorProps {
  className?: string;
}

/**
 * OfflineIndicator Component
 *
 * Displays a banner when the user loses internet connection.
 * Automatically shows/hides based on navigator.onLine status.
 *
 * @example
 * // Add to layout or app root
 * <OfflineIndicator />
 */
export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const [isOffline, setIsOffline] = React.useState(false);
  const [isRetrying, setIsRetrying] = React.useState(false);

  React.useEffect(() => {
    // Check initial state
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);

    try {
      // Try to fetch a small resource to check connectivity
      await fetch('/api/auth/check-token', {
        method: 'HEAD',
        cache: 'no-store'
      });
      setIsOffline(false);
    } catch {
      // Still offline
      setIsOffline(true);
    } finally {
      setIsRetrying(false);
    }
  };

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white py-2 px-4',
        'flex items-center justify-center gap-2 text-sm font-medium',
        'animate-in slide-in-from-top duration-300',
        className
      )}
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>You&apos;re offline. Some features may be unavailable.</span>
      <button
        onClick={handleRetry}
        disabled={isRetrying}
        className={cn(
          'ml-2 inline-flex items-center gap-1 px-2 py-1 rounded',
          'bg-amber-600 hover:bg-amber-700 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-amber-500',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        aria-label="Retry connection"
      >
        <RefreshCw
          className={cn('h-3 w-3', isRetrying && 'animate-spin')}
          aria-hidden="true"
        />
        <span>{isRetrying ? 'Checking...' : 'Retry'}</span>
      </button>
    </div>
  );
}

/**
 * useOnlineStatus Hook
 *
 * Returns the current online/offline status.
 *
 * @example
 * const isOnline = useOnlineStatus();
 * if (!isOnline) {
 *   // Disable submit button, show warning, etc.
 * }
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
