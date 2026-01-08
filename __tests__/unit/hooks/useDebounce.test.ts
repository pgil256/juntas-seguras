/**
 * Unit tests for lib/hooks/useDebounce.ts
 * Tests the debounce hook that delays value updates
 */

import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/lib/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));

    expect(result.current).toBe('initial');
  });

  it('should update value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    expect(result.current).toBe('initial');

    // Change the value
    rerender({ value: 'updated', delay: 500 });

    // Value should still be initial before delay
    expect(result.current).toBe('initial');

    // Fast-forward timer
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Value should now be updated
    expect(result.current).toBe('updated');
  });

  it('should cancel update on unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    // Change the value
    rerender({ value: 'updated', delay: 500 });

    // Value should still be initial
    expect(result.current).toBe('initial');

    // Unmount before the timer fires
    unmount();

    // Advance timers - this should not cause any issues since component is unmounted
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // No assertion here since component is unmounted
    // The test passes if no error is thrown
  });

  it('should reset timer on value change before delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    expect(result.current).toBe('initial');

    // Change the value
    rerender({ value: 'first', delay: 500 });

    // Advance timer partially
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Value should still be initial
    expect(result.current).toBe('initial');

    // Change the value again before delay completes
    rerender({ value: 'second', delay: 500 });

    // Advance timer another 300ms (600ms total, but timer was reset)
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Value should still be initial because timer was reset
    expect(result.current).toBe('initial');

    // Advance remaining 200ms to complete the new delay
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Now value should be 'second' (the latest value)
    expect(result.current).toBe('second');
  });

  it('should work with different value types', () => {
    // Test with number
    const { result: numberResult, rerender: rerenderNumber } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 42, delay: 500 },
      }
    );

    expect(numberResult.current).toBe(42);

    rerenderNumber({ value: 100, delay: 500 });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(numberResult.current).toBe(100);
  });

  it('should work with object values', () => {
    const initialObj = { name: 'test' };
    const updatedObj = { name: 'updated' };

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: initialObj, delay: 500 },
      }
    );

    expect(result.current).toEqual(initialObj);

    rerender({ value: updatedObj, delay: 500 });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toEqual(updatedObj);
  });

  it('should handle zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 0 },
      }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 0 });

    // Even with zero delay, need to advance timer
    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current).toBe('updated');
  });

  it('should handle delay changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    // Change both value and delay
    rerender({ value: 'updated', delay: 1000 });

    // Advance by original delay - should not update yet
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe('initial');

    // Advance by remaining time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });
});
