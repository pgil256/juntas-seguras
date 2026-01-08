// components/ui/responsive-table.tsx
// Responsive table that switches to card layout on mobile
'use client';

import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
  tableClassName?: string;
  cardClassName?: string;
  showScrollHint?: boolean;
}

/**
 * ResponsiveTable Component
 *
 * Displays data as a table on desktop and cards on mobile.
 *
 * @example
 * <ResponsiveTable
 *   data={transactions}
 *   columns={[
 *     { key: 'date', header: 'Date' },
 *     { key: 'amount', header: 'Amount', render: (t) => `$${t.amount}` },
 *   ]}
 *   keyExtractor={(t) => t.id}
 *   renderCard={(t) => <TransactionCard transaction={t} />}
 * />
 */
export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  renderCard,
  emptyState,
  className,
  tableClassName,
  cardClassName,
  showScrollHint = false,
}: ResponsiveTableProps<T>) {
  const [showLeftHint, setShowLeftHint] = React.useState(false);
  const [showRightHint, setShowRightHint] = React.useState(false);
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  // Check scroll position for hints
  const checkScrollHints = React.useCallback(() => {
    const container = tableContainerRef.current;
    if (!container || !showScrollHint) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftHint(scrollLeft > 10);
    setShowRightHint(scrollLeft < scrollWidth - clientWidth - 10);
  }, [showScrollHint]);

  React.useEffect(() => {
    const container = tableContainerRef.current;
    if (!container || !showScrollHint) return;

    checkScrollHints();
    container.addEventListener('scroll', checkScrollHints);
    window.addEventListener('resize', checkScrollHints);

    return () => {
      container.removeEventListener('scroll', checkScrollHints);
      window.removeEventListener('resize', checkScrollHints);
    };
  }, [checkScrollHints, showScrollHint]);

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const getValue = (item: T, key: keyof T | string): React.ReactNode => {
    if (typeof key === 'string' && key.includes('.')) {
      const keys = key.split('.');
      let value: unknown = item;
      for (const k of keys) {
        value = (value as Record<string, unknown>)?.[k];
      }
      return value as React.ReactNode;
    }
    return item[key as keyof T] as React.ReactNode;
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Mobile Card View */}
      <div className={cn('block md:hidden space-y-3', cardClassName)}>
        {data.map((item) => (
          <div key={keyExtractor(item)}>{renderCard(item)}</div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block relative">
        {/* Scroll hints */}
        {showScrollHint && showLeftHint && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 flex items-center justify-start pointer-events-none">
            <ChevronLeft className="h-5 w-5 text-gray-400" />
          </div>
        )}
        {showScrollHint && showRightHint && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 flex items-center justify-end pointer-events-none">
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        )}

        <div
          ref={tableContainerRef}
          className={cn('overflow-x-auto', showScrollHint && 'scroll-smooth')}
        >
          <table className={cn('w-full', tableClassName)}>
            <thead>
              <tr className="border-b border-gray-200">
                {columns
                  .filter((col) => !col.hideOnMobile)
                  .map((column) => (
                    <th
                      key={String(column.key)}
                      className={cn(
                        'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                        column.className
                      )}
                    >
                      {column.header}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {columns
                    .filter((col) => !col.hideOnMobile)
                    .map((column) => (
                      <td
                        key={String(column.key)}
                        className={cn('px-4 py-4 text-sm', column.className)}
                      >
                        {column.render
                          ? column.render(item)
                          : getValue(item, column.key)}
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * TableScrollHint Component
 *
 * Standalone scroll hint for tables that need horizontal scrolling.
 */
interface TableScrollHintProps {
  children: React.ReactNode;
  className?: string;
}

export function TableScrollHint({ children, className }: TableScrollHintProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = React.useState(false);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const checkScroll = () => {
      setCanScroll(container.scrollWidth > container.clientWidth);
    };

    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  return (
    <div className={cn('relative', className)}>
      {canScroll && (
        <div className="md:hidden text-xs text-gray-500 text-center py-2 flex items-center justify-center gap-1">
          <ChevronLeft className="h-3 w-3" />
          <span>Swipe to see more</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      )}
      <div ref={containerRef} className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

export default ResponsiveTable;
