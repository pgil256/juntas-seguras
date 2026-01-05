// components/Navbar.tsx
'use client';

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Menu, X, ChevronRight } from "lucide-react";
import { NotificationBell } from "./notifications/NotificationBell";
import { SearchInput } from "./search/SearchInput";
import { UserProfileButton } from "./auth/UserProfileButton";
import { useSession } from "next-auth/react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

type NavItem = {
  label: string;
  href: string;
  requiresAuth?: boolean;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", requiresAuth: true },
  { label: "My Pool", href: "/my-pool", requiresAuth: true },
  { label: "Payments", href: "/payments", requiresAuth: true },
  { label: "Help", href: "/help" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const toggleSearch = useCallback(() => {
    setSearchExpanded(prev => !prev);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <nav className="bg-white/95 backdrop-blur-lg border-b border-gray-200/80 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center min-w-0">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl sm:text-2xl font-bold text-blue-600 whitespace-nowrap">
                Juntas Seguras
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-6 lg:space-x-8">
              {navItems
                .filter(item => !item.requiresAuth || isAuthenticated)
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${
                      pathname === item.href
                        ? "border-blue-500 text-gray-900"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}
                  >
                    {item.label}
                  </Link>
                ))}
            </div>
          </div>
          {/* Desktop right side */}
          <div className="hidden sm:flex items-center space-x-4">
            {isAuthenticated && (
              <>
                {searchExpanded ? (
                  <div className="relative w-64 lg:w-80">
                    <SearchInput
                      autoFocus
                      onSearch={() => setSearchExpanded(false)}
                      className="w-full"
                    />
                  </div>
                ) : (
                  <button
                    onClick={toggleSearch}
                    className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors duration-200"
                    aria-label="Search"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                )}
                <NotificationBell />
              </>
            )}

            {isAuthenticated ? (
              <UserProfileButton />
            ) : (
              <div className="flex space-x-2">
                <Link href="/auth/signin">
                  <Button variant="outline" size="sm">Log in</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">Sign up</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button - only item on right side for mobile */}
          <button
            type="button"
            className="sm:hidden inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors duration-200"
            aria-controls="mobile-menu"
            aria-expanded={mobileMenuOpen}
            onClick={toggleMobileMenu}
          >
            <span className="sr-only">{mobileMenuOpen ? 'Close menu' : 'Open menu'}</span>
            {mobileMenuOpen ? (
              <X className="block h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="block h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      <div
        className={cn(
          "sm:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      {/* Mobile menu panel - slides in from right */}
      <div
        className={cn(
          "sm:hidden fixed inset-y-0 right-0 z-50 w-[80%] max-w-xs",
          "bg-white shadow-2xl",
          "transform transition-transform duration-300 ease-out",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        <div className="flex flex-col h-full bg-white">
          {/* Menu header */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200 bg-white">
            <span className="text-lg font-semibold text-gray-900">Menu</span>
            <button
              onClick={closeMobileMenu}
              className="p-2 -mr-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-contain bg-white">
            {/* Search for authenticated users */}
            {isAuthenticated && (
              <div className="px-4 py-4 border-b border-gray-100 bg-white">
                <SearchInput
                  onSearch={closeMobileMenu}
                  className="w-full"
                />
              </div>
            )}

            {/* Auth buttons for non-authenticated users */}
            {!isAuthenticated && (
              <div className="flex gap-3 px-4 py-4 border-b border-gray-100 bg-white">
                <Link href="/auth/signin" className="flex-1" onClick={closeMobileMenu}>
                  <Button variant="outline" className="w-full h-12 text-base font-medium">Log in</Button>
                </Link>
                <Link href="/auth/signup" className="flex-1" onClick={closeMobileMenu}>
                  <Button className="w-full h-12 text-base font-medium">Sign up</Button>
                </Link>
              </div>
            )}

            {/* Navigation links */}
            <div className="py-2 bg-white">
              {navItems
                .filter(item => !item.requiresAuth || isAuthenticated)
                .map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between px-4 py-3.5 mx-2 rounded-xl",
                        "text-base font-medium transition-all duration-200",
                        isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                      )}
                      onClick={closeMobileMenu}
                    >
                      <span>{item.label}</span>
                      <ChevronRight className={cn(
                        "h-5 w-5 transition-colors",
                        isActive ? "text-blue-500" : "text-gray-400"
                      )} />
                    </Link>
                  );
                })}
            </div>
          </div>

          {/* Profile section at bottom for authenticated users */}
          {isAuthenticated ? (
            <div
              className="border-t border-gray-200 p-4 bg-gray-50"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              <Link
                href="/profile"
                className="flex items-center gap-3 p-3 -m-1 rounded-xl bg-white hover:bg-gray-100 active:bg-gray-200 transition-colors shadow-sm"
                onClick={closeMobileMenu}
              >
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-base shadow-sm">
                  {session?.user?.name?.charAt(0).toUpperCase() || session?.user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm">
                    {session?.user?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    View profile
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
              </Link>
            </div>
          ) : (
            <div
              className="bg-white"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            />
          )}
        </div>
      </div>
    </nav>
  );
}