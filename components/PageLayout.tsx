"use client";

import React from "react";
import Navbar from "../components/Navbar";
import Link from "next/link";

export default function PageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      
      <main className="flex-grow w-full mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {children}
      </main>
      
      {/* Enhanced Footer */}
      <footer className="bg-white py-6 border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:justify-between">
            <div className="mb-6 md:mb-0">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Juntas Seguras</h3>
              <p className="text-sm text-gray-500 max-w-md">
                Secure community savings pools to help you save with friends, family, and community members.
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase mb-4">Resources</h3>
                <ul className="space-y-3">
                  <li><Link href="/help" className="text-sm text-gray-600 hover:text-blue-600">Help Center</Link></li>
                  <li><Link href="/help/documentation" className="text-sm text-gray-600 hover:text-blue-600">Documentation</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase mb-4">Legal</h3>
                <ul className="space-y-3">
                  <li><Link href="#" className="text-sm text-gray-600 hover:text-blue-600">Privacy</Link></li>
                  <li><Link href="#" className="text-sm text-gray-600 hover:text-blue-600">Terms</Link></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4 mt-8">
            <p className="text-center text-sm text-gray-500">
              &copy; 2025 Juntas Seguras. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}