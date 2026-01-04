'use client';

/**
 * AdminCollectionsDashboard Component
 *
 * Admin view for managing automatic collections in a pool.
 * Shows upcoming, successful, and failed collections with ability to take action.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Loader2,
  MoreVertical,
  PlayCircle,
  XCircle,
  Mail,
  DollarSign,
  Users,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Collection {
  collectionId: string;
  memberName: string;
  memberEmail?: string;
  round: number;
  amount: number;
  dueDate: string;
  gracePeriodHours: number;
  collectionEligibleAt: string;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  completedAt?: string;
  failureReason?: string;
  hasActivePaymentMethod: boolean;
}

interface CollectionSummary {
  scheduled: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
}

interface AdminCollectionsDashboardProps {
  poolId: string;
  poolName: string;
  currentRound: number;
  contributionAmount: number;
  memberCount: number;
}

export function AdminCollectionsDashboard({
  poolId,
  poolName,
  currentRound,
  contributionAmount,
  memberCount,
}: AdminCollectionsDashboardProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [summary, setSummary] = useState<CollectionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: string;
    collectionId: string;
    memberName: string;
  } | null>(null);

  useEffect(() => {
    fetchCollections();
  }, [poolId]);

  const fetchCollections = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pools/${poolId}/collections?days=30`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch collections');
      }

      setCollections(data.collections || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: string, collectionId: string) => {
    setActionLoading(collectionId);
    setError(null);

    try {
      const response = await fetch(`/api/pools/${poolId}/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, collectionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action}`);
      }

      // Refresh data
      await fetchCollections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
      setConfirmDialog(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Scheduled</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'manually_paid':
        return <Badge variant="outline" className="text-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Manual</Badge>;
      case 'cancelled':
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filterCollections = (status: string | 'all') => {
    if (status === 'all') return collections;
    return collections.filter(c => c.status === status);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-muted-foreground">Loading collections...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Collections Management
              </CardTitle>
              <CardDescription>
                Manage automatic contribution collections for {poolName}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchCollections}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Scheduled</span>
                </div>
                <p className="text-2xl font-bold mt-1">{summary.scheduled}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Pending</span>
                </div>
                <p className="text-2xl font-bold mt-1">{summary.pending + summary.processing}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Completed</span>
                </div>
                <p className="text-2xl font-bold mt-1">{summary.completed}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-muted-foreground">Failed</span>
                </div>
                <p className="text-2xl font-bold mt-1">{summary.failed}</p>
              </div>
            </div>
          )}

          {/* Collections Table */}
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            {['all', 'pending', 'failed', 'completed'].map(tab => (
              <TabsContent key={tab} value={tab}>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Round</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterCollections(tab).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No collections found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filterCollections(tab).map(collection => (
                          <TableRow key={collection.collectionId}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{collection.memberName}</p>
                                {collection.memberEmail && (
                                  <p className="text-sm text-muted-foreground">{collection.memberEmail}</p>
                                )}
                                {!collection.hasActivePaymentMethod && (
                                  <Badge variant="outline" className="text-yellow-600 text-xs mt-1">
                                    No payment method
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>Round {collection.round}</TableCell>
                            <TableCell>${collection.amount}</TableCell>
                            <TableCell>
                              <div>
                                <p>{format(new Date(collection.dueDate), 'MMM d, yyyy')}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(collection.dueDate), { addSuffix: true })}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(collection.status)}</TableCell>
                            <TableCell>
                              {collection.status === 'failed' ? (
                                <span className="text-red-500">
                                  {collection.attemptCount}/{collection.maxAttempts}
                                </span>
                              ) : (
                                <span>{collection.attemptCount}/{collection.maxAttempts}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={actionLoading === collection.collectionId}
                                  >
                                    {actionLoading === collection.collectionId ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <MoreVertical className="h-4 w-4" />
                                    )}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {['pending', 'failed', 'scheduled'].includes(collection.status) && (
                                    <DropdownMenuItem
                                      onClick={() => setConfirmDialog({
                                        open: true,
                                        action: 'manual_collect',
                                        collectionId: collection.collectionId,
                                        memberName: collection.memberName,
                                      })}
                                      disabled={!collection.hasActivePaymentMethod}
                                    >
                                      <PlayCircle className="h-4 w-4 mr-2" />
                                      Collect Now
                                    </DropdownMenuItem>
                                  )}
                                  {['pending', 'scheduled'].includes(collection.status) && (
                                    <DropdownMenuItem
                                      onClick={() => setConfirmDialog({
                                        open: true,
                                        action: 'cancel',
                                        collectionId: collection.collectionId,
                                        memberName: collection.memberName,
                                      })}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Cancel
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Reminder
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Failed collection details */}
                {tab === 'failed' && filterCollections('failed').length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium text-sm">Failure Details</h4>
                    {filterCollections('failed').map(c => (
                      <Alert key={c.collectionId} variant="destructive" className="bg-red-50">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>{c.memberName}</strong>: {c.failureReason || 'Unknown error'}
                          {c.nextRetryAt && (
                            <span className="block text-xs mt-1">
                              Next retry: {format(new Date(c.nextRetryAt), 'MMM d, h:mm a')}
                            </span>
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog?.open ?? false}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.action === 'manual_collect' && 'Collect Payment Now'}
              {confirmDialog?.action === 'cancel' && 'Cancel Collection'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.action === 'manual_collect' && (
                <>
                  This will immediately attempt to collect ${contributionAmount} from{' '}
                  <strong>{confirmDialog?.memberName}</strong>&apos;s saved payment method.
                </>
              )}
              {confirmDialog?.action === 'cancel' && (
                <>
                  This will cancel the scheduled collection for{' '}
                  <strong>{confirmDialog?.memberName}</strong>. They will need to pay manually.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmDialog?.action === 'cancel' ? 'destructive' : 'default'}
              onClick={() => confirmDialog && handleAction(confirmDialog.action, confirmDialog.collectionId)}
              disabled={actionLoading !== null}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : confirmDialog?.action === 'manual_collect' ? (
                <PlayCircle className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {confirmDialog?.action === 'manual_collect' ? 'Collect Now' : 'Cancel Collection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AdminCollectionsDashboard;
