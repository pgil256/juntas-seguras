"use client";

import React from "react";
import Navbar from "../components/Navbar";
import ClientOnly from "./ClientOnly";
import Link from "next/link";

export default function PageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <ClientOnly>
        <Navbar />
      </ClientOnly>
      
      <main className="flex-grow w-full mx-auto px-3 sm:px-6 lg:px-8 max-w-7xl py-4 sm:py-6">
        {children}
      </main>
      
      {/* Enhanced Footer */}
      <footer className="bg-white py-6 sm:py-8 border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col space-y-8 md:space-y-0 md:flex-row md:justify-between">
            <div className="space-y-4 md:max-w-sm">
              <h3 className="text-lg font-medium text-gray-900">Juntas Seguras</h3>
              <p className="text-sm text-gray-500">
                Secure community savings pools to help you save with friends, family, and community members.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">Resources</h3>
                <ul className="space-y-2.5">
                  <li>
                    <Link 
                      href="/help" 
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200"
                    >
                      Help Center
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/help/documentation" 
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200"
                    >
                      Documentation
                    </Link>
                  </li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">Legal</h3>
                <ul className="space-y-2.5">
                  <li>
                    <Link
                      href="/privacy"
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200"
                    >
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/terms"
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200"
                    >
                      Terms
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4 mt-6 sm:mt-8">
            <p className="text-center text-sm text-gray-500">
              &copy; 2025 Juntas Seguras. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}