// components/Navbar.tsx
'use client';

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Menu, X } from "lucide-react";
import { NotificationBell } from "./notifications/NotificationBell";
import { SearchInput } from "./search/SearchInput";
import { UserProfileButton } from "./auth/UserProfileButton";
import { useSession } from "next-auth/react";
import { Button } from "./ui/button";

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

  const toggleSearch = () => {
    setSearchExpanded(!searchExpanded);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
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

      {/* Mobile menu, show/hide based on menu state */}
      <div
        className={`sm:hidden transition-all duration-200 ease-in-out ${
          mobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
        id="mobile-menu"
      >
        <div className="py-2 shadow-lg bg-white border-t border-gray-100">
          {/* Search for authenticated users */}
          {isAuthenticated && (
            <div className="px-4 py-3 border-b border-gray-100">
              <SearchInput
                onSearch={() => setMobileMenuOpen(false)}
                className="w-full"
              />
            </div>
          )}

          {/* Auth buttons for non-authenticated users */}
          {!isAuthenticated && (
            <div className="flex gap-3 px-4 py-3 border-b border-gray-100">
              <Link href="/auth/signin" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full h-11 text-base font-medium">Log in</Button>
              </Link>
              <Link href="/auth/signup" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full h-11 text-base font-medium">Sign up</Button>
              </Link>
            </div>
          )}

          {/* Navigation links */}
          <div className="py-1">
            {navItems
              .filter(item => !item.requiresAuth || isAuthenticated)
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${
                    pathname === item.href
                      ? "bg-blue-50 border-blue-500 text-blue-700 font-semibold"
                      : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                  } block pl-4 pr-4 py-3 border-l-4 text-base font-medium transition-colors duration-200 active:bg-gray-100`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
          </div>

          {/* Profile and notifications for authenticated users */}
          {isAuthenticated && (
            <div className="border-t border-gray-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                    {session?.user?.name?.charAt(0).toUpperCase() || session?.user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-medium">{session?.user?.name || 'Profile'}</p>
                    <p className="text-sm text-gray-500">View profile</p>
                  </div>
                </Link>
                <NotificationBell />
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}