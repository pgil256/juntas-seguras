// lib/hooks/usePullToRefresh.ts
// Custom hook for pull-to-refresh functionality on mobile
import { useState, useEffect, useCallback, useRef } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
  disabled?: boolean;
}

interface PullToRefreshState {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
  canRefresh: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  disabled = false,
}: PullToRefreshOptions) {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
    canRefresh: false,
  });

  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || state.isRefreshing) return;

    // Only trigger if at top of scroll
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 0) return;

    startY.current = e.touches[0].clientY;
    setState(prev => ({ ...prev, isPulling: true }));
  }, [disabled, state.isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!state.isPulling || disabled || state.isRefreshing) return;

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    // Only allow pulling down
    if (diff < 0) {
      setState(prev => ({ ...prev, pullDistance: 0, canRefresh: false }));
      return;
    }

    // Apply resistance to make it feel natural
    const distance = Math.min(diff / resistance, threshold * 1.5);
    const canRefresh = distance >= threshold;

    setState(prev => ({
      ...prev,
      pullDistance: distance,
      canRefresh,
    }));

    // Prevent default scroll when pulling
    if (distance > 0) {
      e.preventDefault();
    }
  }, [state.isPulling, disabled, state.isRefreshing, resistance, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!state.isPulling || disabled) return;

    if (state.canRefresh && !state.isRefreshing) {
      setState(prev => ({ ...prev, isRefreshing: true, pullDistance: threshold / 2 }));

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setState({
          isPulling: false,
          pullDistance: 0,
          isRefreshing: false,
          canRefresh: false,
        });
      }
    } else {
      setState({
        isPulling: false,
        pullDistance: 0,
        isRefreshing: false,
        canRefresh: false,
      });
    }

    startY.current = 0;
    currentY.current = 0;
  }, [state.isPulling, state.canRefresh, state.isRefreshing, disabled, threshold, onRefresh]);

  useEffect(() => {
    const container = containerRef.current || document;

    container.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    container.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
    container.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart as EventListener);
      container.removeEventListener('touchmove', handleTouchMove as EventListener);
      container.removeEventListener('touchend', handleTouchEnd as EventListener);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    ...state,
    pullProgress: Math.min(state.pullDistance / threshold, 1),
  };
}
