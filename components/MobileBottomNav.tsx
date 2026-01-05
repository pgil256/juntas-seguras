// components/MobileBottomNav.tsx
// Mobile bottom navigation bar for quick access to main sections
'use client';

import React from 'react';
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

  // Don't show on auth pages
  if (pathname?.startsWith('/auth')) {
    return null;
  }

  // Filter items based on auth status
  const visibleItems = navItems.filter(item => !item.requiresAuth || isAuthenticated);

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 px-2">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname?.startsWith(item.href));
          const Icon = item.icon;
          const isCreate = item.href === '/create-pool';

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center flex-1 py-2 px-1 min-h-[56px]
                transition-colors duration-150 relative
                ${isCreate
                  ? 'text-white'
                  : isActive
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              {isCreate ? (
                <span className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 shadow-lg -mt-4 hover:bg-blue-700 transition-colors">
                  <Icon className="h-6 w-6" />
                </span>
              ) : (
                <>
                  <Icon className={`h-5 w-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                  <span className={`text-xs mt-1 ${isActive ? 'font-medium' : ''}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
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
