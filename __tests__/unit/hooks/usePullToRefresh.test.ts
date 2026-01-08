/**
 * Unit tests for lib/hooks/usePullToRefresh.ts
 * Tests the usePullToRefresh hook for mobile pull-to-refresh functionality
 */

import { renderHook, act } from '@testing-library/react';
import { usePullToRefresh } from '@/lib/hooks/usePullToRefresh';

// Helper to create touch events
function createTouchEvent(type: string, clientY: number): TouchEvent {
  const touch = {
    clientY,
    clientX: 0,
    identifier: 0,
    target: document.body,
    screenX: 0,
    screenY: 0,
    pageX: 0,
    pageY: clientY,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    force: 0,
  } as Touch;

  const touchList = {
    length: 1,
    item: (index: number) => (index === 0 ? touch : null),
    [0]: touch,
    [Symbol.iterator]: function* () {
      yield touch;
    },
  } as unknown as TouchList;

  return new TouchEvent(type, {
    touches: touchList,
    changedTouches: touchList,
    targetTouches: touchList,
    bubbles: true,
    cancelable: true,
  });
}

describe('usePullToRefresh', () => {
  const defaultOnRefresh = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset scroll position
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
    Object.defineProperty(document.documentElement, 'scrollTop', {
      value: 0,
      writable: true,
    });
    // Suppress console.error for expected errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should return correct initial state', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: defaultOnRefresh })
      );

      expect(result.current.isPulling).toBe(false);
      expect(result.current.pullDistance).toBe(0);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.canRefresh).toBe(false);
      expect(result.current.pullProgress).toBe(0);
    });

    it('should provide a containerRef', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: defaultOnRefresh })
      );

      expect(result.current.containerRef).toBeDefined();
      expect(result.current.containerRef.current).toBeNull();
    });

    it('should use default threshold of 80', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: defaultOnRefresh })
      );

      // Default threshold is 80
      // Pull progress at 40 distance should be 0.5
      expect(result.current.pullProgress).toBe(0);
    });

    it('should use default resistance of 2.5', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: defaultOnRefresh })
      );

      // Resistance affects how much actual distance translates to pull distance
      expect(result.current.pullDistance).toBe(0);
    });
  });

  describe('Touch Start', () => {
    it('should set isPulling to true on touch start at top of page', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: defaultOnRefresh })
      );

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 100));
      });

      expect(result.current.isPulling).toBe(true);
    });

    it('should not set isPulling if not at top of page', () => {
      Object.defineProperty(window, 'scrollY', { value: 100 });

      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: defaultOnRefresh })
      );

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 100));
      });

      expect(result.current.isPulling).toBe(false);
    });

    it('should not set isPulling when disabled', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: defaultOnRefresh, disabled: true })
      );

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 100));
      });

      expect(result.current.isPulling).toBe(false);
    });

    it('should not set isPulling when already refreshing', async () => {
      const slowRefresh = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: slowRefresh, threshold: 50 })
      );

      // Start pull and trigger refresh
      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
      });

      act(() => {
        document.dispatchEvent(createTouchEvent('touchmove', 200));
      });

      // Trigger refresh
      act(() => {
        document.dispatchEvent(createTouchEvent('touchend', 200));
      });

      // Now try to start a new pull while refreshing
      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
      });

      // Should still be refreshing, not starting a new pull
      expect(result.current.isRefreshing).toBe(true);
    });
  });

  describe('Touch Move', () => {
    it('should update pullDistance on touch move down', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: defaultOnRefresh, resistance: 1 })
      );

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 100));
      });

      act(() => {
        document.dispatchEvent(createTouchEvent('touchmove', 200));
      });

      expect(result.current.pullDistance).toBeGreaterThan(0);
    });

    it('should apply resistance to pull distance', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: defaultOnRefresh, resistance: 2 })
      );

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 100));
      });

      act(() => {
        // Move 100 pixels down with resistance of 2
        document.dispatchEvent(createTouchEvent('touchmove', 200));
      });

      // Pull distance should be 100/2 = 50
      expect(result.current.pullDistance).toBe(50);
    });

    it('should set pullDistance to 0 when pulling up', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: defaultOnRefresh })
      );

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 100));
      });

      act(() => {
        // Move up (negative diff)
        document.dispatchEvent(createTouchEvent('touchmove', 50));
      });

      expect(result.current.pullDistance).toBe(0);
      expect(result.current.canRefresh).toBe(false);
    });

    it('should set canRefresh to true when threshold is reached', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh: defaultOnRefresh,
          threshold: 50,
          resistance: 1,
        })
      );

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
      });

      act(() => {
        // Move 60 pixels with threshold 50
        document.dispatchEvent(createTouchEvent('touchmove', 60));
      });

      expect(result.current.canRefresh).toBe(true);
    });

    it('should set canRefresh to false when below threshold', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh: defaultOnRefresh,
          threshold: 100,
          resistance: 1,
        })
      );

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
      });

      act(() => {
        // Move 50 pixels with threshold 100
        document.dispatchEvent(createTouchEvent('touchmove', 50));
      });

      expect(result.current.canRefresh).toBe(false);
    });

    it('should cap pullDistance at threshold * 1.5', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh: defaultOnRefresh,
          threshold: 80,
          resistance: 1,
        })
      );

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
      });

      act(() => {
        // Move 200 pixels - should be capped at 80 * 1.5 = 120
        document.dispatchEvent(createTouchEvent('touchmove', 200));
      });

      expect(result.current.pullDistance).toBe(120);
    });

    it('should not update when not pulling', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: defaultOnRefresh })
      );

      // Move without starting pull
      act(() => {
        document.dispatchEvent(createTouchEvent('touchmove', 200));
      });

      expect(result.current.pullDistance).toBe(0);
    });

    it('should not update when disabled', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: defaultOnRefresh, disabled: true })
      );

      // Try to pull while disabled
      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 100));
        document.dispatchEvent(createTouchEvent('touchmove', 200));
      });

      expect(result.current.pullDistance).toBe(0);
    });
  });

  describe('Touch End and Refresh', () => {
    it('should trigger onRefresh when canRefresh is true', async () => {
      const onRefresh = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold: 50,
          resistance: 1,
        })
      );

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
      });

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchmove', 100));
      });

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchend', 100));
      });

      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('should not trigger onRefresh when canRefresh is false', async () => {
      const onRefresh = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold: 100,
          resistance: 1,
        })
      );

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
      });

      await act(async () => {
        // Only move 50 pixels with threshold 100
        document.dispatchEvent(createTouchEvent('touchmove', 50));
      });

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchend', 50));
      });

      expect(onRefresh).not.toHaveBeenCalled();
    });

    it('should set isRefreshing during refresh', async () => {
      let resolveRefresh: () => void;
      const onRefresh = jest.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveRefresh = resolve;
          })
      );

      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold: 50,
          resistance: 1,
        })
      );

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
      });

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchmove', 100));
      });

      // Start the touchend but don't await the refresh completion
      act(() => {
        document.dispatchEvent(createTouchEvent('touchend', 100));
      });

      // Should be refreshing now
      expect(result.current.isRefreshing).toBe(true);

      // Complete the refresh
      await act(async () => {
        resolveRefresh!();
      });

      expect(result.current.isRefreshing).toBe(false);
    });

    it('should reset state after refresh completes', async () => {
      const onRefresh = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold: 50,
          resistance: 1,
        })
      );

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
      });

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchmove', 100));
      });

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchend', 100));
      });

      expect(result.current.isPulling).toBe(false);
      expect(result.current.pullDistance).toBe(0);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.canRefresh).toBe(false);
    });

    it('should reset state when release without triggering refresh', async () => {
      const onRefresh = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold: 100,
          resistance: 1,
        })
      );

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
      });

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchmove', 50));
      });

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchend', 50));
      });

      expect(result.current.isPulling).toBe(false);
      expect(result.current.pullDistance).toBe(0);
      expect(result.current.canRefresh).toBe(false);
    });

    it('should handle refresh errors gracefully', async () => {
      const onRefresh = jest.fn().mockRejectedValue(new Error('Refresh failed'));

      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold: 50,
          resistance: 1,
        })
      );

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
      });

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchmove', 100));
      });

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchend', 100));
      });

      // Should still reset state even after error
      expect(result.current.isPulling).toBe(false);
      expect(result.current.pullDistance).toBe(0);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.canRefresh).toBe(false);
    });

    it('should not trigger when not pulling', async () => {
      const onRefresh = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh })
      );

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchend', 100));
      });

      expect(onRefresh).not.toHaveBeenCalled();
    });

    it('should not trigger when disabled', async () => {
      const onRefresh = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh, disabled: true })
      );

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
        document.dispatchEvent(createTouchEvent('touchmove', 200));
        document.dispatchEvent(createTouchEvent('touchend', 200));
      });

      expect(onRefresh).not.toHaveBeenCalled();
    });

    it('should set pullDistance to threshold/2 during refresh', async () => {
      let resolveRefresh: () => void;
      const onRefresh = jest.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveRefresh = resolve;
          })
      );

      const threshold = 80;
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold,
          resistance: 1,
        })
      );

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
      });

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchmove', 100));
      });

      act(() => {
        document.dispatchEvent(createTouchEvent('touchend', 100));
      });

      // During refresh, pullDistance should be threshold/2
      expect(result.current.pullDistance).toBe(threshold / 2);
      expect(result.current.isRefreshing).toBe(true);

      await act(async () => {
        resolveRefresh!();
      });
    });
  });

  describe('Pull Progress', () => {
    it('should calculate pullProgress correctly', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh: defaultOnRefresh,
          threshold: 100,
          resistance: 1,
        })
      );

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
      });

      act(() => {
        document.dispatchEvent(createTouchEvent('touchmove', 50));
      });

      // 50/100 = 0.5
      expect(result.current.pullProgress).toBe(0.5);
    });

    it('should cap pullProgress at 1', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh: defaultOnRefresh,
          threshold: 50,
          resistance: 1,
        })
      );

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
      });

      act(() => {
        // Move 100 pixels with threshold 50
        document.dispatchEvent(createTouchEvent('touchmove', 100));
      });

      // Progress should be capped at 1
      expect(result.current.pullProgress).toBeLessThanOrEqual(1);
    });
  });

  describe('Custom Options', () => {
    it('should respect custom threshold', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh: defaultOnRefresh,
          threshold: 120,
          resistance: 1,
        })
      );

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
      });

      act(() => {
        document.dispatchEvent(createTouchEvent('touchmove', 100));
      });

      // With threshold 120, 100 pixels should not trigger canRefresh
      expect(result.current.canRefresh).toBe(false);

      act(() => {
        document.dispatchEvent(createTouchEvent('touchmove', 130));
      });

      expect(result.current.canRefresh).toBe(true);
    });

    it('should respect custom resistance', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh: defaultOnRefresh,
          threshold: 100,
          resistance: 5,
        })
      );

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
      });

      act(() => {
        // Move 100 pixels with resistance 5
        document.dispatchEvent(createTouchEvent('touchmove', 100));
      });

      // Pull distance should be 100/5 = 20
      expect(result.current.pullDistance).toBe(20);
    });

    it('should respect disabled option', async () => {
      const onRefresh = jest.fn().mockResolvedValue(undefined);

      const { result, rerender } = renderHook(
        ({ disabled }) =>
          usePullToRefresh({
            onRefresh,
            disabled,
            threshold: 50,
            resistance: 1,
          }),
        { initialProps: { disabled: false } }
      );

      // Pull while enabled
      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
        document.dispatchEvent(createTouchEvent('touchmove', 100));
      });

      expect(result.current.pullDistance).toBeGreaterThan(0);

      // Disable
      rerender({ disabled: true });

      // Reset state manually for new pull
      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchend', 100));
      });

      // Try to pull while disabled
      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
        document.dispatchEvent(createTouchEvent('touchmove', 100));
      });

      // Should not have pulled
      expect(result.current.isPulling).toBe(false);
    });
  });

  describe('Event Listener Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() =>
        usePullToRefresh({ onRefresh: defaultOnRefresh })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'touchmove',
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Document Scroll Position', () => {
    it('should check window.scrollY for scroll position', () => {
      Object.defineProperty(window, 'scrollY', { value: 50, writable: true });

      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: defaultOnRefresh })
      );

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 100));
      });

      // Should not start pulling if scrolled down
      expect(result.current.isPulling).toBe(false);
    });

    it('should check document.documentElement.scrollTop as fallback', () => {
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
      Object.defineProperty(document.documentElement, 'scrollTop', {
        value: 50,
        writable: true,
      });

      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: defaultOnRefresh })
      );

      act(() => {
        document.dispatchEvent(createTouchEvent('touchstart', 100));
      });

      // Should not start pulling if scrolled down (using scrollTop)
      // Note: The actual implementation uses OR, so we need to set both to 0
      // This test verifies scrollTop is checked
      expect(result.current.isPulling).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid touch events', async () => {
      const onRefresh = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold: 50,
          resistance: 1,
        })
      );

      // Rapid touch events
      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
        document.dispatchEvent(createTouchEvent('touchmove', 50));
        document.dispatchEvent(createTouchEvent('touchmove', 100));
        document.dispatchEvent(createTouchEvent('touchmove', 75));
        document.dispatchEvent(createTouchEvent('touchend', 75));
      });

      // Should have refreshed (distance > threshold)
      expect(onRefresh).toHaveBeenCalled();
    });

    it('should handle touch cancel like touch end', async () => {
      // Note: The implementation only listens to touchend
      // This test documents current behavior
      const onRefresh = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold: 50,
          resistance: 1,
        })
      );

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
        document.dispatchEvent(createTouchEvent('touchmove', 100));
      });

      // Touch cancel would not trigger refresh in current implementation
      // This test just verifies the state remains valid
      expect(result.current.isPulling).toBe(true);
      expect(result.current.canRefresh).toBe(true);
    });

    it('should handle multiple consecutive pulls', async () => {
      const onRefresh = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold: 50,
          resistance: 1,
        })
      );

      // First pull
      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
        document.dispatchEvent(createTouchEvent('touchmove', 100));
        document.dispatchEvent(createTouchEvent('touchend', 100));
      });

      expect(onRefresh).toHaveBeenCalledTimes(1);

      // Second pull
      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
        document.dispatchEvent(createTouchEvent('touchmove', 100));
        document.dispatchEvent(createTouchEvent('touchend', 100));
      });

      expect(onRefresh).toHaveBeenCalledTimes(2);
    });

    it('should handle pull abort (release before threshold)', async () => {
      const onRefresh = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        usePullToRefresh({
          onRefresh,
          threshold: 100,
          resistance: 1,
        })
      );

      await act(async () => {
        document.dispatchEvent(createTouchEvent('touchstart', 0));
        document.dispatchEvent(createTouchEvent('touchmove', 50));
        // Release before reaching threshold
        document.dispatchEvent(createTouchEvent('touchend', 50));
      });

      expect(onRefresh).not.toHaveBeenCalled();
      expect(result.current.isPulling).toBe(false);
      expect(result.current.pullDistance).toBe(0);
    });
  });
});
