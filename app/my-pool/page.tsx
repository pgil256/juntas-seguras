// app/my-pool/page.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  DollarSign,
  Users,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Navbar from "@/components/Navbar";

// Sample data for pool information
const poolDetails = {
  name: "Family Savings Pool",
  totalMembers: 8,
  currentPosition: 3,
  amountPerCycle: "$40",
  cycleFrequency: "Weekly",
  currentRound: 4,
  totalRounds: 8,
  nextPayoutDate: "March 15, 2025",
  nextPayoutMember: "Ana Garcia",
  startDate: "January 10, 2025",
  endDate: "May 28, 2025",
  status: "Active",
};

const members = [
  {
    id: 1,
    name: "You",
    position: 3,
    status: "Current",
    paidThisRound: true,
    payoutDate: "March 15, 2025",
    totalContributed: "$120",
  },
  {
    id: 2,
    name: "Maria Rodriguez",
    position: 1,
    status: "Completed",
    paidThisRound: true,
    payoutDate: "January 24, 2025",
    totalContributed: "$160",
  },
  {
    id: 3,
    name: "Carlos Mendez",
    position: 2,
    status: "Completed",
    paidThisRound: true,
    payoutDate: "February 7, 2025",
    totalContributed: "$160",
  },
  {
    id: 4,
    name: "Ana Garcia",
    position: 4,
    status: "Upcoming",
    paidThisRound: true,
    payoutDate: "March 28, 2025",
    totalContributed: "$120",
  },
  {
    id: 5,
    name: "Juan Perez",
    position: 5,
    status: "Upcoming",
    paidThisRound: true,
    payoutDate: "April 11, 2025",
    totalContributed: "$120",
  },
  {
    id: 6,
    name: "Sofia Torres",
    position: 6,
    status: "Upcoming",
    paidThisRound: false,
    payoutDate: "April 25, 2025",
    totalContributed: "$80",
  },
  {
    id: 7,
    name: "Diego Flores",
    position: 7,
    status: "Upcoming",
    paidThisRound: false,
    payoutDate: "May 9, 2025",
    totalContributed: "$80",
  },
  {
    id: 8,
    name: "Gabriela Ortiz",
    position: 8,
    status: "Upcoming",
    paidThisRound: false,
    payoutDate: "May 23, 2025",
    totalContributed: "$80",
  },
];

export default function MyPoolPage() {
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Current":
        return "bg-blue-100 text-blue-800";
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Upcoming":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-4 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">My Pool</h2>
              <p className="mt-1 text-gray-500">{poolDetails.name}</p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                onClick={() => router.push("/invite-members")}
              >
                <Users className="h-4 w-4 mr-2" />
                Invite Members
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                <DollarSign className="h-4 w-4 mr-2" />
                Make Payment
              </button>
            </div>
          </div>
        </div>

        {/* Pool Status Overview */}
        <div className="mt-6">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Pool Details
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Current status and information about your pool
              </p>
            </div>
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-gray-50 px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {poolDetails.status}
                    </span>
                  </dd>
                </div>
                <div className="bg-white px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Your Position
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {poolDetails.currentPosition} of {poolDetails.totalMembers}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Amount Per Cycle
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {poolDetails.amountPerCycle}
                  </dd>
                </div>
                <div className="bg-white px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Cycle Frequency
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {poolDetails.cycleFrequency}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Next Payout
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {poolDetails.nextPayoutDate} ({poolDetails.nextPayoutMember}
                    )
                  </dd>
                </div>
                <div className="bg-white px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Timeline
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {poolDetails.startDate} to {poolDetails.endDate}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Current Progress */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Pool Progress</CardTitle>
              <CardDescription>
                Round {poolDetails.currentRound} of {poolDetails.totalRounds}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                      In Progress
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-blue-600">
                      {Math.round(
                        (poolDetails.currentRound / poolDetails.totalRounds) *
                          100
                      )}
                      %
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                  <div
                    style={{
                      width: `${
                        (poolDetails.currentRound / poolDetails.totalRounds) *
                        100
                      }%`,
                    }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Member List */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>All participants in this pool</CardDescription>
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
                        Name
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Position
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Paid This Round
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Payout Date
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Total Contributed
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {members.map((member) => (
                      <tr
                        key={member.id}
                        className={member.name === "You" ? "bg-blue-50" : ""}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {member.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {member.position}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              member.status
                            )}`}
                          >
                            {member.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {member.paidThisRound ? (
                            <span className="text-green-600">Yes</span>
                          ) : (
                            <span className="text-red-600">No</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.payoutDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.totalContributed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pool Rules */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Pool Rules</CardTitle>
              <CardDescription>
                Guidelines and terms for this savings pool
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="h-5 w-5 text-blue-500 mr-2">•</span>
                  <span>
                    All members must contribute{" "}
                    <strong>{poolDetails.amountPerCycle}</strong> every{" "}
                    {poolDetails.cycleFrequency.toLowerCase()}.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="h-5 w-5 text-blue-500 mr-2">•</span>
                  <span>Payments are due every Friday by 8:00 PM.</span>
                </li>
                <li className="flex items-start">
                  <span className="h-5 w-5 text-blue-500 mr-2">•</span>
                  <span>
                    The rotation order was determined randomly at the start of
                    the pool.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="h-5 w-5 text-blue-500 mr-2">•</span>
                  <span>
                    Members who fail to make payments on time will receive a
                    warning. After two missed payments, they may be removed from
                    future pools.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="h-5 w-5 text-blue-500 mr-2">•</span>
                  <span>
                    If a member needs to leave the pool, they must find a
                    replacement who agrees to the same terms.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="h-5 w-5 text-blue-500 mr-2">•</span>
                  <span>
                    All disputes will be resolved by a majority vote of pool
                    members.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
