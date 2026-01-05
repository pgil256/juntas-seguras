// app/my-pool/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePools } from "../../lib/hooks/usePools";
import {
  Calendar,
  DollarSign,
  Users,
  Plus,
  Check,
  Clock,
  Award,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import CreatePoolModal from "../../components/pools/CreatePoolModal";
import { ContributionModal } from "../../components/pools/ContributionModal";
import { Button } from "../../components/ui/button";
import { Pool } from "../../types/pool";

// Interface for contribution status from API
interface ContributionMember {
  memberId: number;
  name: string;
  email: string;
  position: number;
  isRecipient: boolean;
  hasContributed: boolean | null;
  contributionDate: string | null;
  amount: number;
}

interface ContributionStatus {
  currentRound: number;
  totalRounds: number;
  contributionAmount: number;
  nextPayoutDate: string;
  recipient: {
    name: string;
    email: string;
    position: number;
  } | null;
  contributions: ContributionMember[];
  allContributionsReceived: boolean;
}

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

// Function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
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
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Contribution status state
  const [contributionStatus, setContributionStatus] = useState<ContributionStatus | null>(null);
  const [contributionLoading, setContributionLoading] = useState(false);
  const [contributionError, setContributionError] = useState<string | null>(null);

  // Fetch contribution status for the selected pool
  const fetchContributionStatus = useCallback(async (poolId: string) => {
    setContributionLoading(true);
    setContributionError(null);

    try {
      const response = await fetch(`/api/pools/${poolId}/contributions`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch contribution status');
      }

      setContributionStatus(data);
    } catch (err: any) {
      console.error('Error fetching contribution status:', err);
      setContributionError(err.message);
      setContributionStatus(null);
    } finally {
      setContributionLoading(false);
    }
  }, []);

  // Select the first pool by default when pools are loaded
  useEffect(() => {
    if (pools && pools.length > 0 && !selectedPool) {
      setSelectedPool(pools[0]);
    }
  }, [pools, selectedPool]);

  // Fetch contribution status when selected pool changes
  useEffect(() => {
    if (selectedPool?.id) {
      fetchContributionStatus(selectedPool.id);
    }
  }, [selectedPool?.id, fetchContributionStatus]);

  const handleCreatePool = () => {
    setIsCreatePoolModalOpen(true);
  };

  const handlePoolCreated = (newPool: any) => {
    refreshPools();
  };

  const handleContributionSuccess = () => {
    // Refresh contribution status and pools after contribution
    if (selectedPool?.id) {
      fetchContributionStatus(selectedPool.id);
    }
    refreshPools();
  };

  // Handler for deleting the pool
  const handleDeletePool = async () => {
    if (!selectedPool?.id) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/pools/${selectedPool.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete pool');
      }

      // Close dialog and redirect to dashboard
      setShowDeleteDialog(false);
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to delete pool:', error);
      alert('Failed to delete pool. Only pool administrators can delete pools.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "current":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "upcoming":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Helper to get contribution status for a member
  const getMemberContributionStatus = (memberEmail: string) => {
    if (!contributionStatus) return null;
    return contributionStatus.contributions.find(c => c.email === memberEmail);
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

  // Get user's contribution status
  const userContributionStatus = currentUser?.email
    ? getMemberContributionStatus(currentUser.email)
    : null;

  // Find member with the current round payout (recipient)
  const currentRecipient = contributionStatus?.recipient;

  // Calculate contribution progress
  // All members must contribute, including the recipient
  const contributionProgress = contributionStatus
    ? {
        contributed: contributionStatus.contributions.filter(c => c.hasContributed).length,
        total: contributionStatus.contributions.length,
      }
    : null;

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
            <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => router.push(`/member-management/${selectedPool.id}`)}
                className="inline-flex items-center justify-center min-h-[44px] w-full sm:w-auto"
              >
                <Users className="h-4 w-4 mr-2" />
                Invite Members
              </Button>
              <Button
                className="inline-flex items-center justify-center min-h-[44px] w-full sm:w-auto"
                onClick={() => setShowContributionModal(true)}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Make Payment
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="inline-flex items-center justify-center min-h-[44px] w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Pool
              </Button>
            </div>
          </div>
        </div>

        {/* Current Round Status Card */}
        <div className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">Round {contributionStatus?.currentRound || selectedPool.currentRound} Status</CardTitle>
                  <CardDescription>Current round contribution progress</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => selectedPool.id && fetchContributionStatus(selectedPool.id)}
                  disabled={contributionLoading}
                >
                  {contributionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {contributionLoading && !contributionStatus ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                </div>
              ) : contributionError ? (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{contributionError}</AlertDescription>
                </Alert>
              ) : contributionStatus ? (
                <div className="space-y-4">
                  {/* Recipient info */}
                  {currentRecipient && (
                    <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <Award className="h-5 w-5 text-blue-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          This Round's Recipient: <span className="font-bold">{currentRecipient.name}</span>
                        </p>
                        <p className="text-xs text-blue-600">
                          Will receive {formatCurrency(contributionStatus.contributionAmount * contributionStatus.contributions.length)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* User's status */}
                  {userContributionStatus && (
                    <div className={`flex items-center p-3 rounded-lg border ${
                      userContributionStatus.hasContributed
                        ? userContributionStatus.isRecipient
                          ? 'bg-emerald-50 border-emerald-100'
                          : 'bg-green-50 border-green-100'
                        : 'bg-amber-50 border-amber-100'
                    }`}>
                      {userContributionStatus.hasContributed ? (
                        userContributionStatus.isRecipient ? (
                          <>
                            <Award className="h-5 w-5 text-emerald-600 mr-3" />
                            <p className="text-sm font-medium text-emerald-800">
                              You're the recipient this round and have contributed! Your payout will include all contributions.
                            </p>
                          </>
                        ) : (
                          <>
                            <Check className="h-5 w-5 text-green-600 mr-3" />
                            <p className="text-sm font-medium text-green-800">
                              You've contributed {formatCurrency(contributionStatus.contributionAmount)} this round.
                            </p>
                          </>
                        )
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center w-full gap-3">
                          <div className="flex items-center flex-1 min-w-0">
                            <Clock className="h-5 w-5 text-amber-600 mr-3 shrink-0" />
                            <p className="text-sm font-medium text-amber-800">
                              {userContributionStatus.isRecipient
                                ? "You're the recipient! You still need to contribute to receive your payout."
                                : "You haven't contributed yet this round."}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => setShowContributionModal(true)}
                            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 min-h-[44px] shrink-0"
                          >
                            Contribute Now
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Progress bar */}
                  {contributionProgress && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Contribution Progress</span>
                        <span className="font-medium">
                          {contributionProgress.contributed}/{contributionProgress.total} members
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            contributionStatus.allContributionsReceived ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${(contributionProgress.contributed / contributionProgress.total) * 100}%` }}
                        />
                      </div>
                      {contributionStatus.allContributionsReceived && (
                        <p className="text-sm text-green-600 mt-1 flex items-center">
                          <Check className="h-4 w-4 mr-1" />
                          All contributions received! Ready for payout.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No contribution data available</p>
              )}
            </CardContent>
          </Card>
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
                    {formatCurrency(selectedPool.contributionAmount)}
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
                    {formatDate(selectedPool.nextPayoutDate)} {currentRecipient ? `(${currentRecipient.name})` : ''}
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
                      .map((member) => {
                        const memberContribution = getMemberContributionStatus(member.email);
                        return (
                          <tr
                            key={member.id}
                            className={member.email === currentUser?.email ? "bg-blue-50" : ""}
                          >
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="text-sm font-medium text-gray-900 truncate max-w-[140px] sm:max-w-full">
                                  {member.email === currentUser?.email ? "You" : member.name}
                                </div>
                                {memberContribution?.isRecipient && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    <Award className="h-3 w-3 mr-1" />
                                    Recipient
                                  </span>
                                )}
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
                              {contributionLoading ? (
                                <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                              ) : memberContribution ? (
                                memberContribution.hasContributed ? (
                                  <span className="inline-flex items-center text-green-600">
                                    <Check className="h-4 w-4 mr-1" />
                                    Yes
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-amber-600">
                                    <Clock className="h-4 w-4 mr-1" />
                                    Pending
                                  </span>
                                )
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(member.payoutDate)}
                            </td>
                            <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(member.totalContributed || 0)}
                            </td>
                          </tr>
                        );
                      })}
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
                    <strong>{formatCurrency(selectedPool.contributionAmount)}</strong> every{" "}
                    {selectedPool.frequency.toLowerCase()}.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="h-5 w-5 text-blue-500 mr-2">•</span>
                  <span>
                    Contributions are made manually via Venmo, PayPal, Zelle, or Cash App directly to the pool admin.
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
                    Payouts are sent by the pool admin via your preferred payment method once all contributions are received.
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

      {/* Contribution Modal */}
      <ContributionModal
        poolId={selectedPool.id}
        poolName={selectedPool.name}
        userEmail={session?.user?.email || ''}
        isOpen={showContributionModal}
        onClose={() => setShowContributionModal(false)}
        onContributionSuccess={handleContributionSuccess}
      />

      {/* Delete Pool Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pool</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedPool.name}"? This action cannot be undone.
              All pool data, including members, transactions, and messages will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePool}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Pool'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
