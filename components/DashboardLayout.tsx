// components/DashboardLayout.tsx
import React from "react";
import {
  CreditCard,
  Users,
  PieChart,
  Calendar,
  Search,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";
import Navbar from "@/components/Navbar";

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
      <Navbar />
      
      {/* Main Content */}
      <div className="flex-grow">
        {children}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex justify-center space-x-6 order-1 md:order-2">
              <button className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <button className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <button className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <LogOut className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
            <div className="mt-6 md:mt-0 order-2 md:order-1">
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
