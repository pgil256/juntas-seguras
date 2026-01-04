'use client';

/**
 * AutoCollectionStatus Component
 *
 * Displays the auto-collection status for a member in a pool.
 * Shows saved payment method, next collection date, and allows updating payment method.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SavePaymentMethodModal } from '@/components/payments/SavePaymentMethodModal';
import { formatDistanceToNow, format } from 'date-fns';

interface PaymentSetupInfo {
  id: string;
  paymentMethodType: string;
  last4: string;
  brand?: string;
  status: 'active' | 'cancelled' | 'requires_update' | 'paused';
  lastSuccessAt?: string;
  lastFailedAt?: string;
  consecutiveFailures: number;
}

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
  const [paymentSetup, setPaymentSetup] = useState<PaymentSetupInfo | null>(null);
  const [upcomingCollections, setUpcomingCollections] = useState<UpcomingCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch payment setup and collections
  useEffect(() => {
    fetchData();
  }, [poolId, userId]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch payment methods
      const methodsRes = await fetch(`/api/users/${userId}/payment-methods`);
      const methodsData = await methodsRes.json();

      if (methodsRes.ok) {
        const poolSetup = methodsData.paymentSetups?.find(
          (ps: PaymentSetupInfo & { poolId: string }) => ps.poolId === poolId
        );
        setPaymentSetup(poolSetup || null);
      }

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
      setError('Failed to load auto-collection status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupSuccess = () => {
    setShowModal(false);
    fetchData();
  };

  const getStatusBadge = () => {
    if (!paymentSetup) {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Not Set Up</Badge>;
    }

    switch (paymentSetup.status) {
      case 'active':
        return <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>;
      case 'requires_update':
        return <Badge variant="destructive">Update Required</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const getCardBrandIcon = (brand?: string) => {
    // Simple text representation - could be replaced with actual card icons
    return brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : 'Card';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-muted-foreground">Loading auto-collection status...</span>
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
                <CreditCard className="h-5 w-5" />
                Auto-Collection
              </CardTitle>
              <CardDescription>
                Automatic contribution collection for this pool
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Payment Method Status */}
          {paymentSetup ? (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {getCardBrandIcon(paymentSetup.brand)} ending in {paymentSetup.last4}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ${contributionAmount} {frequency}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowModal(true)}>
                  Update
                </Button>
              </div>

              {paymentSetup.status === 'requires_update' && (
                <Alert variant="destructive" className="mt-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Your payment method needs to be updated. Please add a new card to continue automatic payments.
                  </AlertDescription>
                </Alert>
              )}

              {paymentSetup.consecutiveFailures > 0 && paymentSetup.status === 'active' && (
                <Alert className="mt-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {paymentSetup.consecutiveFailures} recent payment{paymentSetup.consecutiveFailures > 1 ? 's' : ''} failed.
                    Please check your payment method.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-6 text-center">
              <CreditCard className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <h4 className="font-medium mb-1">No Payment Method Set Up</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Set up automatic payments to never miss a contribution.
              </p>
              <Button onClick={() => setShowModal(true)}>
                Set Up Auto-Pay
              </Button>
            </div>
          )}

          {/* Next Collection */}
          {nextCollection && paymentSetup?.status === 'active' && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Next Auto-Collection</span>
              </div>
              <div className="bg-background border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Round {nextCollection.round}</p>
                    <p className="text-sm text-muted-foreground">
                      ${nextCollection.amount} will be collected {formatDistanceToNow(new Date(nextCollection.collectionEligibleAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {format(new Date(nextCollection.dueDate), 'MMM d')}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Grace period: {nextCollection.gracePeriodHours} hours after due date
                </p>
              </div>
            </div>
          )}

          {/* Expandable Details */}
          {paymentSetup && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground pt-2"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide details
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show details
                </>
              )}
            </button>
          )}

          {showDetails && paymentSetup && (
            <div className="border-t pt-4 space-y-2 text-sm">
              {paymentSetup.lastSuccessAt && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>
                    Last successful: {formatDistanceToNow(new Date(paymentSetup.lastSuccessAt), { addSuffix: true })}
                  </span>
                </div>
              )}
              {paymentSetup.lastFailedAt && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span>
                    Last failed: {formatDistanceToNow(new Date(paymentSetup.lastFailedAt), { addSuffix: true })}
                  </span>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={fetchData} className="mt-2">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Payment Method Modal */}
      <SavePaymentMethodModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSetupSuccess}
        poolId={poolId}
        poolName={poolName}
        contributionAmount={contributionAmount}
        frequency={frequency}
      />
    </>
  );
}

export default AutoCollectionStatus;
