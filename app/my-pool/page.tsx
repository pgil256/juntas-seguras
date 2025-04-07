// app/my-pool/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePools } from "../../lib/hooks/usePools";
import {
  Calendar,
  DollarSign,
  Users,
  RefreshCw,
  ChevronRight,
  Plus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import CreatePoolModal from "../../components/pools/CreatePoolModal";
import { Button } from "../../components/ui/button";
import { Pool } from "../../types/pool";

// Function to format dates from ISO string
const formatDate = (dateString?: string) => {
  if (!dateString) return "Not set";
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  }).format(date);
};

// Function to calculate end date based on frequency and rounds
const calculateEndDate = (startDate: string, frequency: string, rounds: number) => {
  const date = new Date(startDate);
  
  switch (frequency.toLowerCase()) {
    case 'weekly':
      date.setDate(date.getDate() + (7 * rounds));
      break;
    case 'biweekly':
      date.setDate(date.getDate() + (14 * rounds));
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + rounds);
      break;
    default:
      date.setDate(date.getDate() + (7 * rounds)); // Default to weekly
  }
  
  return formatDate(date.toISOString());
};

export default function MyPoolPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { pools, isLoading, error, refreshPools } = usePools();
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [isCreatePoolModalOpen, setIsCreatePoolModalOpen] = useState(false);

  // Select the first pool by default when pools are loaded
  useEffect(() => {
    if (pools && pools.length > 0 && !selectedPool) {
      setSelectedPool(pools[0]);
    }
  }, [pools, selectedPool]);

  const handleCreatePool = () => {
    setIsCreatePoolModalOpen(true);
  };

  const handlePoolCreated = (newPool: any) => {
    refreshPools();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "current":
      case "Current":
        return "bg-blue-100 text-blue-800";
      case "completed":
      case "Completed":
        return "bg-green-100 text-green-800";
      case "upcoming":
      case "Upcoming":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state / create pool prompt
  if (!pools || pools.length === 0) {
    return (
      <div>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-800">No Pools Found</h2>
            <p className="mt-2 text-gray-500">
              You don't have any savings pools yet. Create your first pool to get started.
            </p>
            <div className="mt-6">
              <Button 
                onClick={handleCreatePool}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Pool
              </Button>
              <CreatePoolModal 
                isOpen={isCreatePoolModalOpen} 
                onClose={() => setIsCreatePoolModalOpen(false)} 
                onCreatePool={handlePoolCreated}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If no pool is selected (which shouldn't happen at this point, but just in case)
  if (!selectedPool) {
    return (
      <div>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-800">Select a Pool</h2>
            <p className="mt-2 text-gray-500">
              Please select a pool to view details.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Find the user's member record in the selected pool
  const currentUser = session?.user;
  const userMember = currentUser ? 
    selectedPool.members.find(m => m.email === currentUser.email) : null;

  // Find member with the next payout
  const nextPayoutMember = selectedPool.members
    .sort((a, b) => a.position - b.position)
    .find(m => m.status === 'upcoming');

  return (
    <div>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-4 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">My Pool</h2>
              <p className="mt-1 text-gray-500">{selectedPool.name}</p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Button
                variant="outline"
                onClick={() => router.push(`/pools/${selectedPool.id}/members`)}
                className="inline-flex items-center"
              >
                <Users className="h-4 w-4 mr-2" />
                Invite Members
              </Button>
              <Button 
                className="inline-flex items-center"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Make Payment
              </Button>
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
                      {selectedPool.status}
                    </span>
                  </dd>
                </div>
                <div className="bg-white px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Your Position
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {userMember ? `${userMember.position} of ${selectedPool.memberCount}` : 'Not found'}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Amount Per Cycle
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    ${selectedPool.contributionAmount}
                  </dd>
                </div>
                <div className="bg-white px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Cycle Frequency
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {selectedPool.frequency}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Next Payout
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {formatDate(selectedPool.nextPayoutDate)} {nextPayoutMember ? `(${nextPayoutMember.name})` : ''}
                  </dd>
                </div>
                <div className="bg-white px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Timeline
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {formatDate(selectedPool.createdAt)} to {calculateEndDate(selectedPool.createdAt, selectedPool.frequency, selectedPool.totalRounds)}
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
                Round {selectedPool.currentRound} of {selectedPool.totalRounds}
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
                        (selectedPool.currentRound / selectedPool.totalRounds) *
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
                        (selectedPool.currentRound / selectedPool.totalRounds) *
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
              <div className="overflow-x-auto -mx-4 sm:mx-0 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Name
                      </th>
                      <th
                        scope="col"
                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Position
                      </th>
                      <th
                        scope="col"
                        className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Paid This Round
                      </th>
                      <th
                        scope="col"
                        className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Payout Date
                      </th>
                      <th
                        scope="col"
                        className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Total Contributed
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedPool.members
                      .sort((a, b) => a.position - b.position)
                      .map((member) => (
                        <tr
                          key={member.id}
                          className={member.email === currentUser?.email ? "bg-blue-50" : ""}
                        >
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 truncate max-w-[100px] sm:max-w-full">
                              {member.email === currentUser?.email ? "You" : member.name}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {member.position}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                member.status
                              )}`}
                            >
                              {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                            </span>
                          </td>
                          <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                            {member.paymentsOnTime > member.paymentsMissed ? (
                              <span className="text-green-600">Yes</span>
                            ) : (
                              <span className="text-red-600">No</span>
                            )}
                          </td>
                          <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(member.payoutDate)}
                          </td>
                          <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${member.totalContributed}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                
                {/* Mobile view for hidden columns */}
                <div className="block sm:hidden mt-4 px-4">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Note: Swipe table to see more details
                  </div>
                </div>
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
                    <strong>${selectedPool.contributionAmount}</strong> every{" "}
                    {selectedPool.frequency.toLowerCase()}.
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
      
      {/* Create Pool Modal */}
      <CreatePoolModal 
        isOpen={isCreatePoolModalOpen} 
        onClose={() => setIsCreatePoolModalOpen(false)} 
        onCreatePool={handlePoolCreated}
      />
    </div>
  );
}
