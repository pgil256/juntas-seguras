'use client';

/**
 * AutoCollectionStatus Component
 *
 * Displays the contribution status for a member in a pool.
 * Shows upcoming contribution dates and payment information.
 *
 * Note: This app uses manual payments, not automatic Stripe collection.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { SavePaymentMethodModal } from '@/components/payments/SavePaymentMethodModal';
import { formatDistanceToNow, format } from 'date-fns';

interface UpcomingCollection {
  collectionId: string;
  round: number;
  amount: number;
  dueDate: string;
  collectionEligibleAt: string;
  status: string;
  gracePeriodHours: number;
}

interface AutoCollectionStatusProps {
  poolId: string;
  poolName: string;
  contributionAmount: number;
  frequency: string;
  nextPayoutDate?: string;
  currentRound: number;
  userId: string;
}

export function AutoCollectionStatus({
  poolId,
  poolName,
  contributionAmount,
  frequency,
  nextPayoutDate,
  currentRound,
  userId,
}: AutoCollectionStatusProps) {
  const [upcomingCollections, setUpcomingCollections] = useState<UpcomingCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch collections
  useEffect(() => {
    fetchData();
  }, [poolId, userId]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch upcoming collections
      const collectionsRes = await fetch(`/api/pools/${poolId}/collections?days=30`);
      const collectionsData = await collectionsRes.json();

      if (collectionsRes.ok) {
        setUpcomingCollections(
          collectionsData.collections?.filter(
            (c: UpcomingCollection) => c.status === 'scheduled' || c.status === 'pending'
          ) || []
        );
      }
    } catch (err) {
      setError('Failed to load contribution schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInfoClose = () => {
    setShowModal(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-muted-foreground">Loading contribution schedule...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextCollection = upcomingCollections[0];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5" />
                Contributions
              </CardTitle>
              <CardDescription>
                Contribution schedule for this pool
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-blue-600 border-blue-600">Manual Payments</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Payment Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    ${contributionAmount} {frequency}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Contributions collected manually
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowModal(true)}>
                <Info className="h-4 w-4 mr-1" />
                Info
              </Button>
            </div>
          </div>

          {/* Next Collection */}
          {nextCollection && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Next Contribution Due</span>
              </div>
              <div className="bg-background border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Round {nextCollection.round}</p>
                    <p className="text-sm text-muted-foreground">
                      ${nextCollection.amount} due {formatDistanceToNow(new Date(nextCollection.dueDate), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {format(new Date(nextCollection.dueDate), 'MMM d')}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {!nextCollection && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">No upcoming contributions scheduled</span>
              </div>
            </div>
          )}

          {/* Expandable Details */}
          {upcomingCollections.length > 1 && (
            <>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground pt-2"
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Hide schedule
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show full schedule ({upcomingCollections.length} upcoming)
                  </>
                )}
              </button>

              {showDetails && (
                <div className="border-t pt-4 space-y-2">
                  {upcomingCollections.slice(1).map((collection) => (
                    <div key={collection.collectionId} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                      <div>
                        <span className="font-medium">Round {collection.round}</span>
                        <span className="text-muted-foreground ml-2">${collection.amount}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {format(new Date(collection.dueDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <Button variant="ghost" size="sm" onClick={fetchData} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Schedule
          </Button>
        </CardContent>
      </Card>

      {/* Payment Info Modal */}
      <SavePaymentMethodModal
        isOpen={showModal}
        onClose={handleInfoClose}
        onSuccess={handleInfoClose}
        poolId={poolId}
        poolName={poolName}
        contributionAmount={contributionAmount}
        frequency={frequency}
      />
    </>
  );
}

export default AutoCollectionStatus;
