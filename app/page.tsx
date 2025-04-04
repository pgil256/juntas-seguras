// app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Users,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Sample data for pools
const pools = [
  {
    id: "123",
    name: "Family Savings Pool",
    totalAmount: "$950",
    members: 8,
    nextPayoutDate: "Mar 15, 2025",
    nextPayoutMember: "You",
    yourPosition: 3,
    yourContribution: "$50 weekly",
  },
  {
    id: "456",
    name: "Vacation Fund",
    totalAmount: "$600",
    members: 6,
    nextPayoutDate: "Apr 10, 2025",
    nextPayoutMember: "Maria Rodriguez",
    yourPosition: 4,
    yourContribution: "$25 weekly",
  },
];

// Sample data for transactions
const recentTransactions = [
  {
    id: 1,
    type: "deposit",
    amount: "$50",
    date: "Feb 20, 2025",
    status: "Completed",
    pool: "Family Savings Pool",
  },
  {
    id: 2,
    type: "withdrawal",
    amount: "$400",
    date: "Feb 15, 2025",
    status: "Completed",
    pool: "Vacation Fund",
  },
  {
    id: 3,
    type: "deposit",
    amount: "$50",
    date: "Feb 13, 2025",
    status: "Completed",
    pool: "Family Savings Pool",
  },
  {
    id: 4,
    type: "deposit",
    amount: "$25",
    date: "Feb 10, 2025",
    status: "Completed",
    pool: "Vacation Fund",
  },
];

export default function Home() {
  const router = useRouter();

  const handleViewPool = (poolId: string) => {
    router.push(`/pools/${poolId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <DashboardHeader
          title="My Dashboard"
          subtitle="Welcome to Juntas Seguras"
        />

        {/* Stats Grid */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Wallet className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Total Savings
                  </p>
                  <p className="text-2xl font-semibold">$1,550</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CreditCard className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Active Pools
                  </p>
                  <p className="text-2xl font-semibold">2</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Next Payout
                  </p>
                  <p className="text-2xl font-semibold">Mar 15</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Total Members
                  </p>
                  <p className="text-2xl font-semibold">14</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Pools */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Active Pools
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pools.map((pool) => (
              <Card key={pool.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle>{pool.name}</CardTitle>
                  <CardDescription>
                    Your position: {pool.yourPosition} • {pool.yourContribution}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Amount</p>
                      <p className="font-semibold">{pool.totalAmount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Members</p>
                      <p className="font-semibold">{pool.members}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Next Payout</p>
                      <p className="font-semibold">{pool.nextPayoutDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">To</p>
                      <p className="font-semibold">{pool.nextPayoutMember}</p>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewPool(pool.id)}
                    >
                      View Details
                    </Button>
                    <Button size="sm">Make Payment</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest pool activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Type
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Pool
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Amount
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Date
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {transaction.type === "deposit" ? (
                              <ArrowUpCircle className="h-5 w-5 text-blue-500 mr-2" />
                            ) : (
                              <ArrowDownCircle className="h-5 w-5 text-green-500 mr-2" />
                            )}
                            <span className="text-sm font-medium text-gray-900 capitalize">
                              {transaction.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.pool}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-sm font-medium ${
                              transaction.type === "deposit"
                                ? "text-blue-600"
                                : "text-green-600"
                            }`}
                          >
                            {transaction.amount}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  onClick={() => router.push("/payments")}
                >
                  View All Transactions
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
