"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-2xl font-bold text-blue-600">
                  Juntas Seguras
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/help">
                <Button variant="ghost">Help</Button>
              </Link>
              <Link href="/auth/signin">
                <Button variant="outline">Log in</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Sign up</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      {children}
      
      {/* Simple Footer */}
      <footer className="bg-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500">
            &copy; 2025 Juntas Seguras. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}