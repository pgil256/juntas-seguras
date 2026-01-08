// components/ui/bottom-sheet.tsx
// Bottom sheet modal component with drag-to-dismiss and snap points
'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

type SnapPoint = number | 'content';

interface BottomSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  snapPoints?: SnapPoint[];
  defaultSnapPoint?: number;
  dismissible?: boolean;
  modal?: boolean;
}

interface BottomSheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  showHandle?: boolean;
  showCloseButton?: boolean;
}

const BottomSheetContext = React.createContext<{
  snapPoints: SnapPoint[];
  currentSnap: number;
  setCurrentSnap: (snap: number) => void;
  dismiss: () => void;
}>({
  snapPoints: [0.9],
  currentSnap: 0,
  setCurrentSnap: () => {},
  dismiss: () => {},
});

/**
 * BottomSheet Component
 *
 * A mobile-optimized modal that slides up from the bottom with drag-to-dismiss.
 *
 * @example
 * <BottomSheet open={open} onOpenChange={setOpen} snapPoints={[0.5, 0.9]}>
 *   <BottomSheetTrigger>Open</BottomSheetTrigger>
 *   <BottomSheetContent>
 *     <BottomSheetHeader>
 *       <BottomSheetTitle>Title</BottomSheetTitle>
 *     </BottomSheetHeader>
 *     Content here
 *   </BottomSheetContent>
 * </BottomSheet>
 */
const BottomSheet = ({
  children,
  open,
  onOpenChange,
  snapPoints = [0.9],
  defaultSnapPoint = 0,
  dismissible = true,
  modal = true,
}: BottomSheetProps) => {
  const [currentSnap, setCurrentSnap] = React.useState(defaultSnapPoint);

  const dismiss = React.useCallback(() => {
    if (dismissible) {
      onOpenChange?.(false);
    }
  }, [dismissible, onOpenChange]);

  return (
    <BottomSheetContext.Provider
      value={{ snapPoints, currentSnap, setCurrentSnap, dismiss }}
    >
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={modal}>
        {children}
      </DialogPrimitive.Root>
    </BottomSheetContext.Provider>
  );
};

const BottomSheetTrigger = DialogPrimitive.Trigger;
const BottomSheetClose = DialogPrimitive.Close;
const BottomSheetPortal = DialogPrimitive.Portal;

const BottomSheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
BottomSheetOverlay.displayName = 'BottomSheetOverlay';

const BottomSheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  BottomSheetContentProps
>(({ className, children, showHandle = true, showCloseButton = true, ...props }, ref) => {
  const { snapPoints, currentSnap, setCurrentSnap, dismiss } =
    React.useContext(BottomSheetContext);

  const contentRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [translateY, setTranslateY] = React.useState(0);

  const startY = React.useRef(0);
  const startTranslateY = React.useRef(0);
  const velocity = React.useRef(0);
  const lastMoveTime = React.useRef(0);
  const lastMoveY = React.useRef(0);

  const currentSnapHeight = React.useMemo(() => {
    const snap = snapPoints[currentSnap];
    if (typeof snap === 'number') {
      return snap * (typeof window !== 'undefined' ? window.innerHeight : 0);
    }
    return contentRef.current?.scrollHeight || 0;
  }, [snapPoints, currentSnap]);

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    // Only drag from handle area or when not scrollable
    const target = e.target as HTMLElement;
    const isHandle = target.closest('[data-sheet-handle]');
    const content = contentRef.current;

    if (!isHandle && content) {
      // Check if content is scrollable and at top
      if (content.scrollTop > 0) return;
    }

    startY.current = e.touches[0].clientY;
    startTranslateY.current = translateY;
    lastMoveTime.current = Date.now();
    lastMoveY.current = e.touches[0].clientY;
    velocity.current = 0;
    setIsDragging(true);
  }, [translateY]);

  const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - startY.current;

    // Calculate velocity
    const now = Date.now();
    const timeDelta = now - lastMoveTime.current;
    if (timeDelta > 0) {
      velocity.current = (touch.clientY - lastMoveY.current) / timeDelta;
    }
    lastMoveTime.current = now;
    lastMoveY.current = touch.clientY;

    // Only allow dragging down (positive deltaY) when pulling
    let newTranslateY = startTranslateY.current + deltaY;

    // Resistance when dragging up past current snap
    if (newTranslateY < 0) {
      newTranslateY = newTranslateY * 0.2;
    }

    setTranslateY(newTranslateY);
  }, [isDragging]);

  const handleTouchEnd = React.useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const velocityThreshold = 0.5;
    const dismissThreshold = currentSnapHeight * 0.3;

    // Fast swipe down = dismiss
    if (velocity.current > velocityThreshold) {
      dismiss();
      setTranslateY(0);
      return;
    }

    // Dragged past threshold = dismiss or snap
    if (translateY > dismissThreshold) {
      dismiss();
      setTranslateY(0);
      return;
    }

    // Snap back
    setTranslateY(0);
  }, [isDragging, translateY, currentSnapHeight, dismiss]);

  // Haptic feedback
  const triggerHaptic = React.useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  return (
    <BottomSheetPortal>
      <BottomSheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 bg-white shadow-xl',
          'rounded-t-2xl',
          'max-h-[90vh]',
          'flex flex-col',
          isDragging ? '' : 'transition-transform duration-200 ease-out',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          className
        )}
        style={{
          transform: `translateY(${translateY}px)`,
          height: currentSnapHeight || 'auto',
        }}
        {...props}
      >
        {/* Handle */}
        {showHandle && (
          <div
            data-sheet-handle
            className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          >
            <div className="w-10 h-1 rounded-full bg-gray-300" aria-hidden="true" />
          </div>
        )}

        {/* Close button */}
        {showCloseButton && (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors z-10">
            <X className="h-5 w-5 text-gray-500" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}

        {/* Content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto overscroll-contain px-4 pb-safe"
        >
          {children}
        </div>
      </DialogPrimitive.Content>
    </BottomSheetPortal>
  );
});
BottomSheetContent.displayName = 'BottomSheetContent';

const BottomSheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-1.5 pb-4', className)}
    {...props}
  />
);
BottomSheetHeader.displayName = 'BottomSheetHeader';

const BottomSheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 pb-4',
      className
    )}
    {...props}
  />
);
BottomSheetFooter.displayName = 'BottomSheetFooter';

const BottomSheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold text-gray-900', className)}
    {...props}
  />
));
BottomSheetTitle.displayName = 'BottomSheetTitle';

const BottomSheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-gray-500', className)}
    {...props}
  />
));
BottomSheetDescription.displayName = 'BottomSheetDescription';

export {
  BottomSheet,
  BottomSheetTrigger,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetFooter,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetOverlay,
  BottomSheetPortal,
};
