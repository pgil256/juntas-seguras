// app/dashboard/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CreditCard,
  Users,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  PlusCircle
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

export default function Dashboard() {
  const router = useRouter();
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/auth/signin?callbackUrl=/dashboard");
    },
  });
  
  // Fetch pool data
  const { pools, isLoading: poolsLoading, error: poolsError } = usePools();
  
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

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <main className="pt-8">
        <DashboardHeader 
          title="My Dashboard"
          subtitle={`Welcome, ${session?.user?.name || 'User'}`}
        />

        {/* Get Started or Pool Status */}
        <div className="mt-6">
          {poolsLoading ? (
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  <span className="ml-3">Loading your pools...</span>
                </div>
              </CardContent>
            </Card>
          ) : !hasAnyPools ? (
            <Card>
              <CardHeader>
                <CardTitle>Get Started with Juntas Seguras</CardTitle>
                <CardDescription>
                  Create your first savings pool or join an existing one
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg text-center space-y-3">
                  <PlusCircle className="h-12 w-12 text-blue-500" />
                  <h3 className="text-lg font-medium">No savings pools yet</h3>
                  <p className="text-sm text-gray-500">
                    You haven't created or joined any savings pools yet. Get started by creating your first pool.
                  </p>
                  <Button
                    className="mt-2"
                    onClick={() => router.push("/create-pool")}
                  >
                    Create a Pool
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : hasPendingPools ? (
            <Card>
              <CardHeader>
                <CardTitle>Complete Your Pool Setup</CardTitle>
                <CardDescription>
                  Invite members to your newly created {pendingPools.length > 1 ? 'pools' : 'pool'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-blue-200 rounded-lg text-center space-y-3 bg-blue-50">
                  <Users className="h-12 w-12 text-blue-500" />
                  <h3 className="text-lg font-medium">Your {pendingPools.length > 1 ? 'pools need' : 'pool needs'} members</h3>
                  <p className="text-sm text-gray-700">
                    {pendingPools.length > 1 
                      ? `You've created ${pendingPools.length} pools that need members to join before they become active.` 
                      : `You've created a pool "${pendingPools[0].name}" that needs members to join before it becomes active.`}
                  </p>
                  <Button
                    className="mt-2"
                    onClick={() => router.push("/my-pool")}
                  >
                    Invite Members
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Your Active Pools</CardTitle>
                <CardDescription>
                  You have {activePools.length} active savings {activePools.length === 1 ? 'pool' : 'pools'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {activePools.map(pool => (
                  <div key={pool.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" 
                    onClick={() => router.push(`/pools/${pool.id}`)}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{pool.name}</h3>
                        <p className="text-sm text-gray-500">
                          Round {pool.currentRound} of {pool.totalRounds} • ${pool.contributionAmount}/{pool.frequency}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
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

        {/* Recent Activity */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                {hasAnyPools ? 'Your recent pool activity' : 'You have no recent activity'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasAnyPools ? (
                <div className="space-y-4">
                  {pools?.slice(0, 3).flatMap(pool => 
                    pool.messages?.slice(0, 2).map(message => (
                      <div key={`${pool.id}-${message.id}`} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-md">
                        <div className="bg-blue-100 text-blue-600 p-2 rounded-full">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center">
                            <span className="font-medium">{message.author}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              {formatDate(new Date(message.date))}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{message.content}</p>
                          <p className="text-xs text-gray-500 mt-1">In pool: {pool.name}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div className="flex justify-center mt-4">
                    <Button variant="outline" onClick={() => router.push("/my-pool")}>
                      View All Activity
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                  <p className="text-sm text-gray-500">
                    Your activity will appear here once you create or join a savings pool.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/help/documentation")}
                  >
                    Learn how it works
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}