// app/dashboard/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CreditCard,
  Users,
  Calendar,
  Wallet,
  PlusCircle,
  TrendingUp,
  Award,
} from "lucide-react";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { usePools } from "../../lib/hooks/usePools";
import { formatDate } from "../../lib/utils";
import { QuickActions } from "../../components/dashboard/QuickActions";
import { PoolCard, PoolCardSkeleton } from "../../components/pools/PoolCard";
import CreatePoolModal from "../../components/pools/CreatePoolModal";
import { DashboardAlerts } from "../../components/dashboard/DashboardAlerts";

export default function Dashboard() {
  const router = useRouter();
  const [isCreatePoolModalOpen, setIsCreatePoolModalOpen] = useState(false);

  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/auth/signin?callbackUrl=/dashboard");
    },
  });

  // Fetch pool data
  const { pools, isLoading: poolsLoading, error: poolsError, refreshPools } = usePools();

  // Calculate dashboard metrics
  const activePools = pools?.filter(pool => pool.status === 'active' && pool.members.length > 1) || [];
  const totalMembers = activePools.reduce((total, pool) => total + pool.members.length, 0);
  const totalSavings = activePools.reduce((total, pool) => total + pool.totalAmount, 0);

  // Find the next payout date across all pools
  let nextPayoutDate = null;
  if (activePools.length > 0) {
    const sortedPayouts = [...activePools]
      .map(pool => pool.nextPayoutDate)
      .filter(date => date)
      .sort();

    if (sortedPayouts.length > 0) {
      nextPayoutDate = sortedPayouts[0];
    }
  }

  // Determine if user has any pools (even if not active)
  const hasAnyPools = pools && pools.length > 0;

  // Check if user has newly created pools that need members
  const pendingPools = pools?.filter(pool => pool.members.length === 1) || [];
  const hasPendingPools = pendingPools.length > 0;

  // Calculate pending payments count - check if user is the current round recipient or hasn't contributed
  // Note: hasContributed and isRecipient may come from API but aren't in base type
  const pendingPaymentsCount = activePools.filter(pool => {
    const userMember = pool.members.find(m => m.email === session?.user?.email);
    // Cast to any to access dynamic properties from API
    const memberData = userMember as any;
    return memberData && memberData.hasContributed === false;
  }).length;

  // Check if user is receiving any payouts
  const receivingPayout = activePools.find(pool => {
    const userMember = pool.members.find(m => m.email === session?.user?.email);
    // Cast to any to access dynamic properties from API
    const memberData = userMember as any;
    return memberData?.isRecipient === true;
  });

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <main className="pt-8 pb-12">
        <DashboardHeader
          title="My Dashboard"
          subtitle={`Welcome back, ${session?.user?.name || 'User'}`}
        />

        {/* Dashboard Alerts - User-specific notifications */}
        {hasAnyPools && (
          <div className="mt-6">
            <DashboardAlerts
              pools={pools || []}
              userEmail={session?.user?.email}
              isLoading={poolsLoading}
            />
          </div>
        )}

        {/* Quick Actions */}
        {hasAnyPools && !poolsLoading && (
          <div className="mt-6">
            <QuickActions
              onCreatePool={() => setIsCreatePoolModalOpen(true)}
              onMakePayment={() => router.push('/my-pool')}
              pendingPaymentsCount={pendingPaymentsCount}
            />
          </div>
        )}

        {/* Receiving Payout Banner */}
        {receivingPayout && (
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-white/20 shrink-0">
                  <Award className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-base sm:text-lg">You're receiving a payout!</p>
                  <p className="text-emerald-100 text-sm truncate">
                    {receivingPayout.name} - {formatCurrency(receivingPayout.contributionAmount * receivingPayout.members.length)}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => router.push(`/pools/${receivingPayout.id}`)}
                className="bg-white text-emerald-700 hover:bg-emerald-50 w-full sm:w-auto shrink-0"
              >
                View Details
              </Button>
            </div>
          </div>
        )}

        {/* Get Started or Pool Status */}
        <div className="mt-6">
          {poolsLoading ? (
            <div className="space-y-4">
              <PoolCardSkeleton />
              <PoolCardSkeleton variant="compact" />
            </div>
          ) : !hasAnyPools ? (
            <Card className="border-2 border-dashed border-gray-200">
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <PlusCircle className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Start Your First Junta</h3>
                    <p className="text-gray-500 mt-1 max-w-md">
                      Create a savings pool with friends or family. Everyone contributes, and each member takes turns receiving the pot.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      size="lg"
                      onClick={() => setIsCreatePoolModalOpen(true)}
                    >
                      <PlusCircle className="h-5 w-5 mr-2" />
                      Create a Pool
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => router.push("/help/documentation")}
                    >
                      Learn How It Works
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : hasPendingPools ? (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Complete Your Pool Setup
                </CardTitle>
                <CardDescription>
                  Invite members to your newly created {pendingPools.length > 1 ? 'pools' : 'pool'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {pendingPools.map(pool => (
                  <div
                    key={pool.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-lg border border-blue-100"
                  >
                    <div className="min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{pool.name}</h4>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(pool.contributionAmount)}/{pool.frequency} • Waiting for members
                      </p>
                    </div>
                    <Button
                      onClick={() => router.push(`/member-management/${pool.id}`)}
                      className="w-full sm:w-auto shrink-0"
                    >
                      Invite Members
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Your Active Pools</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreatePoolModalOpen(true)}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Pool
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {activePools.map(pool => {
                  const userMember = pool.members.find(m => m.email === session?.user?.email) as any;
                  const contributedCount = pool.members.filter(m => (m as any).hasContributed).length;

                  return (
                    <PoolCard
                      key={pool.id}
                      poolId={pool.id}
                      poolName={pool.name}
                      description={pool.description}
                      status={pool.status as 'active' | 'pending' | 'completed'}
                      currentRound={pool.currentRound}
                      totalRounds={pool.totalRounds}
                      contributionAmount={pool.contributionAmount}
                      frequency={pool.frequency}
                      nextPayoutDate={pool.nextPayoutDate}
                      members={pool.members.map(m => {
                        const member = m as any;
                        return {
                          id: m.id?.toString() || m.email,
                          name: m.name,
                          email: m.email,
                          avatar: m.avatar,
                          hasContributed: member.hasContributed || false,
                          isRecipient: member.isRecipient || false,
                          position: m.position,
                        };
                      })}
                      currentUserEmail={session?.user?.email || ''}
                      userHasContributed={userMember?.hasContributed || false}
                      userIsRecipient={userMember?.isRecipient || false}
                      allContributionsReceived={contributedCount === pool.members.length}
                      payoutProcessed={false}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

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
                  <p className="text-2xl font-semibold">
                    ${totalSavings}
                  </p>
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
                  <p className="text-2xl font-semibold">
                    {activePools.length}
                  </p>
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
                  <p className="text-2xl font-semibold">
                    {nextPayoutDate ? formatDate(new Date(nextPayoutDate)) : '-'}
                  </p>
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
                  <p className="text-2xl font-semibold">
                    {totalMembers}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity - only show if there are pools */}
        {hasAnyPools && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest updates from your pools</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => router.push("/my-pool")}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pools?.slice(0, 3).flatMap(pool =>
                    pool.messages?.slice(0, 2).map(message => (
                      <div
                        key={`${pool.id}-${message.id}`}
                        className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                        onClick={() => router.push(`/pools/${pool.id}`)}
                      >
                        <div className="bg-blue-100 text-blue-600 p-2 rounded-full shrink-0">
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">{message.author}</span>
                            <span className="text-xs text-gray-500 shrink-0">
                              {formatDate(new Date(message.date))}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{message.content}</p>
                          <p className="text-xs text-gray-500 mt-1">{pool.name}</p>
                        </div>
                      </div>
                    ))
                  ) || (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      No recent activity
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Create Pool Modal */}
      <CreatePoolModal
        isOpen={isCreatePoolModalOpen}
        onClose={() => setIsCreatePoolModalOpen(false)}
        onCreatePool={() => {
          refreshPools();
          setIsCreatePoolModalOpen(false);
        }}
      />
    </div>
  );
}