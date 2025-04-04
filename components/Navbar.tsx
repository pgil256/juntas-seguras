// components/Navbar.tsx
'use client';

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SearchInput } from "@/components/search/SearchInput";
import { UserProfileButton } from "@/components/auth/UserProfileButton";
import { useSession } from "next-auth/react";

type NavItem = {
  label: string;
  href: string;
  requiresAuth?: boolean;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/" },
  { label: "My Pool", href: "/my-pool", requiresAuth: true },
  { label: "Payments", href: "/payments", requiresAuth: true },
];

export default function Navbar() {
  const pathname = usePathname();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const toggleSearch = () => {
    setSearchExpanded(!searchExpanded);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                Juntas Seguras
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
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
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    {item.label}
                  </Link>
                ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Search Input (expanded state) */}
            {searchExpanded ? (
              <div className="relative w-64 lg:w-80">
                <SearchInput
                  autoFocus
                  onSearch={() => setSearchExpanded(false)}
                />
              </div>
            ) : (
              <button
                onClick={toggleSearch}
                className="p-2 text-gray-400 hover:text-gray-500"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
            )}
            
            {/* Only show notification bell when authenticated */}
            {isAuthenticated && <NotificationBell />}

            {/* User profile button with dropdown */}
            <UserProfileButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
