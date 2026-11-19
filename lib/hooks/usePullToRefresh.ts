// lib/hooks/usePullToRefresh.ts
// Custom hook for pull-to-refresh functionality on mobile
import { useState, useEffect, useCallback, useRef } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
  disabled?: boolean;
  enableHaptics?: boolean;
  showSuccessDuration?: number;
}

interface PullToRefreshState {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
  canRefresh: boolean;
  showSuccess: boolean;
}

const idleState: PullToRefreshState = {
  isPulling: false,
  pullDistance: 0,
  isRefreshing: false,
  canRefresh: false,
  showSuccess: false,
};

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  disabled = false,
  enableHaptics = true,
  showSuccessDuration = 1000,
}: PullToRefreshOptions) {
  const [state, setState] = useState<PullToRefreshState>(idleState);
  const startY = useRef<number | null>(null);
  const reachedThreshold = useRef(false);
  const refreshing = useRef(false);
  const mounted = useRef(true);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTriggeredHaptic = useRef(false);

  // Haptic feedback function
  const triggerHaptic = useCallback(() => {
    if (enableHaptics && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [enableHaptics]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || refreshing.current) return;

    // Only trigger if at top of scroll
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 0) return;

    if (successTimer.current !== null) clearTimeout(successTimer.current);
    reachedThreshold.current = false;
    startY.current = e.touches[0].clientY;
    hasTriggeredHaptic.current = false;
    setState({ ...idleState, isPulling: true });
  }, [disabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startY.current === null || disabled || refreshing.current) return;

    const diff = e.touches[0].clientY - startY.current;

    // Only allow pulling down
    if (diff < 0) {
      reachedThreshold.current = false;
      setState(prev => ({ ...prev, pullDistance: 0, canRefresh: false }));
      hasTriggeredHaptic.current = false;
      return;
    }

    // Apply resistance to make it feel natural
    const distance = Math.min(diff / resistance, threshold * 1.5);
    const canRefresh = distance >= threshold;
    reachedThreshold.current = canRefresh;

    // Trigger haptic feedback when threshold is reached
    if (canRefresh && !hasTriggeredHaptic.current) {
      triggerHaptic();
      hasTriggeredHaptic.current = true;
    } else if (!canRefresh) {
      hasTriggeredHaptic.current = false;
    }

    setState(prev => ({
      ...prev,
      pullDistance: distance,
      canRefresh,
    }));

    // Prevent default scroll when pulling
    if (distance > 0) {
      e.preventDefault();
    }
  }, [disabled, resistance, threshold, triggerHaptic]);

  const cancelPull = useCallback(() => {
    if (startY.current === null) return;
    startY.current = null;
    reachedThreshold.current = false;
    setState(idleState);
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (startY.current === null) return;
    if (disabled || !reachedThreshold.current) {
      cancelPull();
      return;
    }
    startY.current = null;
    reachedThreshold.current = false;
    refreshing.current = true;
    setState({ ...idleState, isRefreshing: true, pullDistance: threshold / 2 });
    try {
      await onRefresh();
      if (!mounted.current) return;
      setState({ ...idleState, showSuccess: true, pullDistance: threshold / 2 });
      successTimer.current = setTimeout(() => setState(idleState), showSuccessDuration);
    } catch (error) {
      console.error('Refresh failed:', error);
      if (mounted.current) setState(idleState);
    } finally {
      refreshing.current = false;
    }
  }, [cancelPull, disabled, onRefresh, showSuccessDuration, threshold]);

  useEffect(() => {
    if (disabled) cancelPull();
  }, [disabled, cancelPull]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (successTimer.current !== null) clearTimeout(successTimer.current);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current || document;

    container.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    container.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
    container.addEventListener('touchcancel', cancelPull, { passive: true });
    container.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart as EventListener);
      container.removeEventListener('touchmove', handleTouchMove as EventListener);
      container.removeEventListener('touchcancel', cancelPull);
      container.removeEventListener('touchend', handleTouchEnd as EventListener);
    };
  }, [cancelPull, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    ...state,
    pullProgress: Math.min(state.pullDistance / threshold, 1),
  };
}
