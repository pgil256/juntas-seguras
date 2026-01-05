// components/DashboardLayout.tsx
"use client";

import React from "react";
import {
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";
import Navbar from "./Navbar";
import ClientOnly from "./ClientOnly";

// Move data outside the component
const poolStats = {
  totalSaved: "$450",
  activeMembers: "8",
  nextPayout: "March 15, 2025",
  completedCycles: "3",
};

const recentTransactions = [
  {
    id: 1,
    type: "Deposit",
    amount: "+$5",
    date: "Feb 20, 2025",
    status: "Completed",
  },
  {
    id: 2,
    type: "Withdrawal",
    amount: "-$20",
    date: "Feb 15, 2025",
    status: "Completed",
  },
  {
    id: 3,
    type: "Deposit",
    amount: "+$5",
    date: "Feb 10, 2025",
    status: "Completed",
  },
];

const upcomingPayments = [
  { id: 1, member: "Maria Rodriguez", date: "Feb 25, 2025", amount: "$5" },
  { id: 2, member: "Carlos Mendez", date: "Mar 1, 2025", amount: "$5" },
  { id: 3, member: "Ana Garcia", date: "Mar 5, 2025", amount: "$5" },
];

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <ClientOnly>
        <Navbar />
      </ClientOnly>

      {/* Main Content - extra bottom padding on mobile for bottom nav */}
      <div className="flex-grow px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-6">
        {children}
      </div>

      {/* Footer - hidden on mobile to make room for bottom nav */}
      <footer className="hidden sm:block bg-white border-t border-gray-200 mt-6 sm:mt-8">
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-between space-y-4 space-y-reverse md:space-y-0">
            <div className="flex justify-center space-x-4 sm:space-x-6 order-1 md:order-2">
              <button 
                className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
              <button 
                className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                aria-label="Help"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
              <button 
                className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
            <div className="order-2 md:order-1">
              <p className="text-center md:text-left text-sm text-gray-500">
                &copy; 2025 Juntas Seguras. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DashboardLayout;
