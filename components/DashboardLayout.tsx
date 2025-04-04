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

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Use our new Navbar component */}
      <Navbar />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-4 sm:px-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-800">
              Pool Dashboard
            </h2>
            <div className="relative">
              <div className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg">
                Search...
              </div>
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Stats cards */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CreditCard className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Saved
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {poolStats.totalSaved}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Members
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {poolStats.activeMembers}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Next Payout
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {poolStats.nextPayout}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <PieChart className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Completed Cycles
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {poolStats.completedCycles}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Recent Transactions */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Recent Transactions
              </h3>
              <div className="mt-5">
                <div className="flow-root">
                  <ul className="divide-y divide-gray-200">
                    {recentTransactions.map((transaction) => (
                      <li key={transaction.id} className="py-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {transaction.type}
                            </p>
                            <p className="text-sm text-gray-500">
                              {transaction.date}
                            </p>
                          </div>
                          <div className="inline-flex items-center text-sm font-semibold text-gray-900">
                            {transaction.amount}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Payments */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Upcoming Payments
              </h3>
              <div className="mt-5">
                <div className="flow-root">
                  <ul className="divide-y divide-gray-200">
                    {upcomingPayments.map((payment) => (
                      <li key={payment.id} className="py-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {payment.member}
                            </p>
                            <p className="text-sm text-gray-500">
                              {payment.date}
                            </p>
                          </div>
                          <div className="inline-flex items-center text-sm font-semibold text-gray-900">
                            {payment.amount}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex justify-center space-x-6 md:order-2">
              <span className="text-gray-400 hover:text-gray-500">
                <Settings className="h-6 w-6" />
              </span>
              <span className="text-gray-400 hover:text-gray-500">
                <HelpCircle className="h-6 w-6" />
              </span>
              <span className="text-gray-400 hover:text-gray-500">
                <LogOut className="h-6 w-6" />
              </span>
            </div>
            <div className="mt-8 md:mt-0 md:order-1">
              <p className="text-center text-sm text-gray-400">
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
