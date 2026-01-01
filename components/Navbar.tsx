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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-lg sm:text-2xl font-bold text-blue-600 whitespace-nowrap">
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
          <div className="flex items-center space-x-1 sm:space-x-4">
            {/* Mobile menu button */}
            <button
              type="button"
              className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors duration-200"
              aria-controls="mobile-menu"
              aria-expanded="false"
              onClick={toggleMobileMenu}
            >
              <span className="sr-only">{mobileMenuOpen ? 'Close menu' : 'Open menu'}</span>
              {mobileMenuOpen ? (
                <X className="block h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="block h-5 w-5" aria-hidden="true" />
              )}
            </button>
            
            {/* Only show search and notifications for authenticated users */}
            {isAuthenticated && (
              <>
                {searchExpanded ? (
                  <div className="absolute left-0 right-0 top-0 bg-white p-2 sm:relative sm:p-0 sm:bg-transparent">
                    <div className="relative w-full sm:w-64 lg:w-80">
                      <SearchInput
                        autoFocus
                        onSearch={() => setSearchExpanded(false)}
                        className="w-full"
                      />
                      <button
                        onClick={() => setSearchExpanded(false)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-500 sm:hidden"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={toggleSearch}
                    className="p-2 text-gray-400 hover:text-gray-500 transition-colors duration-200"
                    aria-label="Search"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                )}
                <NotificationBell />
              </>
            )}
            
            {/* Show auth buttons or user profile */}
            {isAuthenticated ? (
              <UserProfileButton />
            ) : (
              <div className="hidden sm:flex space-x-2">
                <Link href="/auth/signin">
                  <Button variant="outline" size="sm" className="text-sm h-8 sm:h-9">Log in</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm" className="text-sm h-8 sm:h-9">Sign up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      <div 
        className={`sm:hidden transition-all duration-200 ease-in-out ${
          mobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
        id="mobile-menu"
      >
        <div className="py-2 space-y-1 shadow-lg bg-white border-t border-gray-100">
          {navItems
            .filter(item => !item.requiresAuth || isAuthenticated)
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${
                  pathname === item.href
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                } block pl-3 pr-4 py-2.5 border-l-4 text-base font-medium transition-colors duration-200`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}

          {/* Only show auth buttons on mobile if not authenticated */}
          {!isAuthenticated && (
            <div className="flex flex-col px-3 pt-3 pb-2 space-y-2 border-t border-gray-200">
              <Link href="/auth/signin" className="w-full">
                <Button variant="outline" className="w-full py-2">Log in</Button>
              </Link>
              <Link href="/auth/signup" className="w-full">
                <Button className="w-full py-2">Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}