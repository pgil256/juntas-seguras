// components/ui/swipeable-row.tsx
// Swipeable row component for touch-based actions
'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface SwipeAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  color: 'red' | 'blue' | 'green' | 'orange' | 'gray';
  onClick: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  actionWidth?: number;
  threshold?: number;
  disabled?: boolean;
  className?: string;
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
}

const colorConfig = {
  red: 'bg-red-500 text-white',
  blue: 'bg-blue-500 text-white',
  green: 'bg-green-500 text-white',
  orange: 'bg-orange-500 text-white',
  gray: 'bg-gray-500 text-white',
};

/**
 * SwipeableRow Component
 *
 * A row component that reveals actions when swiped left or right.
 *
 * @example
 * <SwipeableRow
 *   rightActions={[
 *     { key: 'remind', label: 'Remind', color: 'blue', onClick: () => {} },
 *     { key: 'delete', label: 'Delete', color: 'red', onClick: () => {} },
 *   ]}
 * >
 *   <MemberCard member={member} />
 * </SwipeableRow>
 */
export function SwipeableRow({
  children,
  leftActions = [],
  rightActions = [],
  actionWidth = 80,
  threshold = 0.3,
  disabled = false,
  className,
  onSwipeStart,
  onSwipeEnd,
}: SwipeableRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState<'left' | 'right' | null>(null);

  const startX = useRef(0);
  const startTranslateX = useRef(0);
  const velocity = useRef(0);
  const lastMoveTime = useRef(0);
  const lastMoveX = useRef(0);

  const leftWidth = leftActions.length * actionWidth;
  const rightWidth = rightActions.length * actionWidth;

  // Haptic feedback (if supported)
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;

      const touch = e.touches[0];
      startX.current = touch.clientX;
      startTranslateX.current = translateX;
      lastMoveTime.current = Date.now();
      lastMoveX.current = touch.clientX;
      velocity.current = 0;
      setIsDragging(true);
      onSwipeStart?.();
    },
    [disabled, translateX, onSwipeStart]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || disabled) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - startX.current;
      let newTranslateX = startTranslateX.current + deltaX;

      // Calculate velocity
      const now = Date.now();
      const timeDelta = now - lastMoveTime.current;
      if (timeDelta > 0) {
        velocity.current = (touch.clientX - lastMoveX.current) / timeDelta;
      }
      lastMoveTime.current = now;
      lastMoveX.current = touch.clientX;

      // Apply bounds with resistance
      if (newTranslateX > 0) {
        // Swiping right (reveal left actions)
        if (leftActions.length === 0) {
          newTranslateX = newTranslateX * 0.2; // Strong resistance
        } else {
          const maxRight = leftWidth;
          if (newTranslateX > maxRight) {
            const overflow = newTranslateX - maxRight;
            newTranslateX = maxRight + overflow * 0.2;
          }
        }
      } else {
        // Swiping left (reveal right actions)
        if (rightActions.length === 0) {
          newTranslateX = newTranslateX * 0.2; // Strong resistance
        } else {
          const maxLeft = -rightWidth;
          if (newTranslateX < maxLeft) {
            const overflow = maxLeft - newTranslateX;
            newTranslateX = maxLeft - overflow * 0.2;
          }
        }
      }

      setTranslateX(newTranslateX);

      // Haptic feedback at threshold
      const thresholdPx = (newTranslateX > 0 ? leftWidth : rightWidth) * threshold;
      if (Math.abs(newTranslateX) >= thresholdPx && Math.abs(startTranslateX.current) < thresholdPx) {
        triggerHaptic();
      }
    },
    [isDragging, disabled, leftActions.length, rightActions.length, leftWidth, rightWidth, threshold, triggerHaptic]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    onSwipeEnd?.();

    // Determine final state based on position and velocity
    const velocityThreshold = 0.5;
    const positionThreshold = threshold;

    let finalState: 'left' | 'right' | null = null;

    if (translateX > 0 && leftActions.length > 0) {
      // Swiping right (left actions)
      if (
        velocity.current > velocityThreshold ||
        translateX > leftWidth * positionThreshold
      ) {
        finalState = 'left';
      }
    } else if (translateX < 0 && rightActions.length > 0) {
      // Swiping left (right actions)
      if (
        velocity.current < -velocityThreshold ||
        translateX < -rightWidth * positionThreshold
      ) {
        finalState = 'right';
      }
    }

    setIsOpen(finalState);
    setTranslateX(
      finalState === 'left' ? leftWidth : finalState === 'right' ? -rightWidth : 0
    );
  }, [isDragging, translateX, leftActions.length, rightActions.length, leftWidth, rightWidth, threshold, onSwipeEnd]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(null);
        setTranslateX(0);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(null);
        setTranslateX(0);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleActionClick = (action: SwipeAction) => {
    action.onClick();
    setIsOpen(null);
    setTranslateX(0);
  };

  const close = () => {
    setIsOpen(null);
    setTranslateX(0);
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
    >
      {/* Left Actions */}
      {leftActions.length > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 flex"
          style={{ width: leftWidth }}
        >
          {leftActions.map((action) => (
            <button
              key={action.key}
              onClick={() => handleActionClick(action)}
              className={cn(
                'flex flex-col items-center justify-center transition-transform',
                colorConfig[action.color]
              )}
              style={{ width: actionWidth }}
            >
              {action.icon && <span className="mb-1">{action.icon}</span>}
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right Actions */}
      {rightActions.length > 0 && (
        <div
          className="absolute right-0 top-0 bottom-0 flex"
          style={{ width: rightWidth }}
        >
          {rightActions.map((action) => (
            <button
              key={action.key}
              onClick={() => handleActionClick(action)}
              className={cn(
                'flex flex-col items-center justify-center transition-transform',
                colorConfig[action.color]
              )}
              style={{ width: actionWidth }}
            >
              {action.icon && <span className="mb-1">{action.icon}</span>}
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={isOpen ? close : undefined}
        className={cn(
          'relative bg-white',
          isDragging ? '' : 'transition-transform duration-200 ease-out'
        )}
        style={{ transform: `translateX(${translateX}px)` }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * useSwipeableList Hook
 *
 * Manages swipeable state for a list (ensures only one row is open at a time).
 */
export function useSwipeableList() {
  const [openId, setOpenId] = useState<string | null>(null);

  const handleSwipeStart = useCallback((id: string) => {
    setOpenId(id);
  }, []);

  const handleSwipeEnd = useCallback(() => {
    // Keep the current open state
  }, []);

  const closeAll = useCallback(() => {
    setOpenId(null);
  }, []);

  return {
    openId,
    handleSwipeStart,
    handleSwipeEnd,
    closeAll,
    isOpen: (id: string) => openId === id,
  };
}

export default SwipeableRow;
