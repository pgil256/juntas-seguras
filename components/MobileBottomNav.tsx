// components/MobileBottomNav.tsx
// Mobile bottom navigation bar for quick access to main sections
'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  HelpCircle,
  Plus
} from 'lucide-react';
import { cn } from '../lib/utils';

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  requiresAuth?: boolean;
};

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, requiresAuth: true },
  { label: 'My Pool', href: '/my-pool', icon: Users, requiresAuth: true },
  { label: 'Create', href: '/create-pool', icon: Plus, requiresAuth: true },
  { label: 'Payments', href: '/payments', icon: CreditCard, requiresAuth: true },
  { label: 'Help', href: '/help', icon: HelpCircle },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  // Haptic feedback for touch interactions
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  // Don't show on auth pages or when not logged in
  if (pathname?.startsWith('/auth') || !isAuthenticated) {
    return null;
  }

  // Filter items based on auth status
  const visibleItems = navItems.filter(item => !item.requiresAuth || isAuthenticated);

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200/80 z-50 safe-area-bottom"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex justify-around items-center h-16 px-1 max-w-lg mx-auto">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname?.startsWith(item.href));
          const Icon = item.icon;
          const isCreate = item.href === '/create-pool';

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={triggerHaptic}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-2 px-1 min-h-[56px] relative",
                "transition-all duration-200 ease-out",
                "active:scale-95 touch-action-manipulation",
                isCreate
                  ? 'text-white'
                  : isActive
                    ? 'text-blue-600'
                    : 'text-gray-400 active:text-gray-600'
              )}
            >
              {isCreate ? (
                <span
                  className={cn(
                    "flex items-center justify-center w-14 h-14 rounded-2xl -mt-6",
                    "bg-gradient-to-br from-blue-500 to-blue-600",
                    "shadow-lg shadow-blue-500/30",
                    "transition-all duration-200",
                    "active:scale-95 active:shadow-md",
                    "ring-4 ring-white"
                  )}
                >
                  <Icon className="h-7 w-7" strokeWidth={2.5} />
                </span>
              ) : (
                <>
                  <div className={cn(
                    "relative p-1.5 rounded-xl transition-all duration-200",
                    isActive && "bg-blue-50"
                  )}>
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-all duration-200",
                        isActive && "scale-110"
                      )}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>
                  <span className={cn(
                    "text-[10px] mt-0.5 transition-all duration-200",
                    isActive ? 'font-semibold text-blue-600' : 'font-medium'
                  )}>
                    {item.label}
                  </span>
                  {/* Active indicator dot */}
                  {isActive && (
                    <span
                      className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"
                      aria-hidden="true"
                    />
                  )}
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
