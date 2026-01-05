'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  DollarSign,
  Gift,
  Info,
  Loader2,
  Mail,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { cn } from '../../lib/utils';
import { NotificationType } from '../../types/notification';

interface PendingInvitation {
  id: string;
  invitationCode: string;
  poolId: string;
  poolName: string;
  poolDescription?: string;
  contributionAmount: number;
  frequency: string;
  memberCount: number;
  inviterName: string;
  message?: string;
  sentDate: string;
  expiresAt: string;
}

interface Pool {
  id: string;
  name: string;
  status: string;
  currentRound: number;
  totalRounds: number;
  contributionAmount: number;
  frequency: string;
  nextPayoutDate?: string;
  members: {
    id?: string | number;
    email: string;
    name: string;
    hasContributed?: boolean;
    isRecipient?: boolean;
    position?: number;
  }[];
}

interface DashboardAlertsProps {
  pools: Pool[];
  userEmail: string | null | undefined;
  isLoading?: boolean;
}

interface AlertItem {
  id: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  notificationType: NotificationType;
  title: string;
  message: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  dismissible?: boolean;
}

const getAlertStyles = (type: AlertItem['type']) => {
  switch (type) {
    case 'urgent':
      return {
        container: 'border-red-200 bg-red-50',
        icon: 'text-red-600',
        title: 'text-red-800',
        description: 'text-red-700',
      };
    case 'warning':
      return {
        container: 'border-amber-200 bg-amber-50',
        icon: 'text-amber-600',
        title: 'text-amber-800',
        description: 'text-amber-700',
      };
    case 'success':
      return {
        container: 'border-emerald-200 bg-emerald-50',
        icon: 'text-emerald-600',
        title: 'text-emerald-800',
        description: 'text-emerald-700',
      };
    case 'info':
    default:
      return {
        container: 'border-blue-200 bg-blue-50',
        icon: 'text-blue-600',
        title: 'text-blue-800',
        description: 'text-blue-700',
      };
  }
};

const AlertIcon = ({ type, notificationType }: { type: AlertItem['type']; notificationType: NotificationType }) => {
  const styles = getAlertStyles(type);

  const iconMap: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
    payment: CreditCard,
    transaction: CheckCircle2,
    pool: Users,
    invite: Mail,
    alert: AlertCircle,
    system: Info,
  };

  const Icon = iconMap[notificationType] || Bell;

  return <Icon className={cn('h-5 w-5', styles.icon)} />;
};

export function DashboardAlerts({ pools, userEmail, isLoading }: DashboardAlertsProps) {
  const router = useRouter();
  const { notifications, getNotifications } = useNotifications();
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [selectedInvitation, setSelectedInvitation] = useState<PendingInvitation | null>(null);
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  // Fetch pending invitations for the current user
  const fetchPendingInvitations = useCallback(async () => {
    try {
      const response = await fetch('/api/user/invitations');
      if (response.ok) {
        const data = await response.json();
        setPendingInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
    }
  }, []);

  // Handle accepting an invitation
  const handleAcceptInvitation = async () => {
    if (!selectedInvitation) return;

    setIsAccepting(true);
    try {
      const response = await fetch('/api/pools/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationCode: selectedInvitation.invitationCode }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsInvitationModalOpen(false);
        setSelectedInvitation(null);
        // Remove the accepted invitation from the list
        setPendingInvitations(prev => prev.filter(inv => inv.id !== selectedInvitation.id));
        // Navigate to the pool page
        router.push(`/pools/${data.pool.id}`);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      alert('Failed to accept invitation. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  // Handle declining an invitation
  const handleDeclineInvitation = async () => {
    if (!selectedInvitation) return;

    setIsDeclining(true);
    try {
      const response = await fetch('/api/pools/invitations/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationCode: selectedInvitation.invitationCode }),
      });

      if (response.ok) {
        setIsInvitationModalOpen(false);
        setSelectedInvitation(null);
        // Remove the declined invitation from the list
        setPendingInvitations(prev => prev.filter(inv => inv.id !== selectedInvitation.id));
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to decline invitation');
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
      alert('Failed to decline invitation. Please try again.');
    } finally {
      setIsDeclining(false);
    }
  };

  // Open invitation details modal
  const openInvitationModal = useCallback((invitation: PendingInvitation) => {
    setSelectedInvitation(invitation);
    setIsInvitationModalOpen(true);
  }, []);

  // Fetch invitations on mount and periodically
  useEffect(() => {
    if (userEmail) {
      fetchPendingInvitations();
    }
  }, [userEmail, fetchPendingInvitations]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (userEmail) {
        fetchPendingInvitations();
      }
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [userEmail, fetchPendingInvitations]);

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      getNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [getNotifications]);

  // Generate alerts based on pool data and user context
  useEffect(() => {
    if (isLoading || !userEmail) return;

    const generatedAlerts: AlertItem[] = [];
    const activePools = pools.filter(p => p.status === 'active' && p.members.length > 1);

    // Check for pending contributions (payment due)
    activePools.forEach(pool => {
      const userMember = pool.members.find(m => m.email === userEmail);
      if (userMember && !userMember.hasContributed) {
        generatedAlerts.push({
          id: `payment-due-${pool.id}`,
          type: 'warning',
          notificationType: 'payment',
          title: 'Payment Due',
          message: `Your contribution of $${pool.contributionAmount} is due for ${pool.name}.`,
          action: {
            label: 'Make Payment',
            href: `/pools/${pool.id}`,
          },
        });
      }
    });

    // Check if user is receiving a payout this round
    activePools.forEach(pool => {
      const userMember = pool.members.find(m => m.email === userEmail);
      if (userMember?.isRecipient) {
        const totalPayout = pool.contributionAmount * pool.members.length;
        generatedAlerts.push({
          id: `payout-receiving-${pool.id}`,
          type: 'success',
          notificationType: 'transaction',
          title: 'Payout Coming!',
          message: `You're receiving $${totalPayout} from ${pool.name} this round.`,
          action: {
            label: 'View Details',
            href: `/pools/${pool.id}`,
          },
        });
      }
    });

    // Check for upcoming payouts (within 3 days)
    activePools.forEach(pool => {
      if (pool.nextPayoutDate) {
        const payoutDate = new Date(pool.nextPayoutDate);
        const now = new Date();
        const daysUntilPayout = Math.ceil((payoutDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilPayout > 0 && daysUntilPayout <= 3) {
          const userMember = pool.members.find(m => m.email === userEmail);
          if (!userMember?.isRecipient) {
            generatedAlerts.push({
              id: `payout-upcoming-${pool.id}`,
              type: 'info',
              notificationType: 'pool',
              title: 'Upcoming Payout',
              message: `${pool.name} payout is in ${daysUntilPayout} day${daysUntilPayout !== 1 ? 's' : ''}.`,
              action: {
                label: 'View Pool',
                href: `/pools/${pool.id}`,
              },
              dismissible: true,
            });
          }
        }
      }
    });

    // Check for pools waiting for all contributions
    activePools.forEach(pool => {
      const contributedCount = pool.members.filter(m => m.hasContributed).length;
      const pendingCount = pool.members.length - contributedCount;

      if (pendingCount > 0 && contributedCount > 0) {
        const userMember = pool.members.find(m => m.email === userEmail);
        if (userMember?.hasContributed) {
          generatedAlerts.push({
            id: `waiting-contributions-${pool.id}`,
            type: 'info',
            notificationType: 'pool',
            title: 'Waiting for Contributions',
            message: `${pendingCount} member${pendingCount !== 1 ? 's' : ''} still need${pendingCount === 1 ? 's' : ''} to contribute to ${pool.name}.`,
            dismissible: true,
          });
        }
      }
    });

    // Check for pools needing members (created but only has creator)
    const pendingPools = pools.filter(p => p.members.length === 1);
    pendingPools.forEach(pool => {
      generatedAlerts.push({
        id: `invite-members-${pool.id}`,
        type: 'info',
        notificationType: 'invite',
        title: 'Invite Members',
        message: `${pool.name} needs members to get started. Invite your friends and family.`,
        action: {
          label: 'Invite Members',
          href: `/member-management/${pool.id}`,
        },
      });
    });

    // Add pending pool invitations as alerts (high priority)
    pendingInvitations.forEach(invitation => {
      const daysUntilExpiry = Math.ceil(
        (new Date(invitation.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      generatedAlerts.push({
        id: `pool-invitation-${invitation.id}`,
        type: daysUntilExpiry <= 2 ? 'warning' : 'success',
        notificationType: 'invite',
        title: 'Pool Invitation',
        message: `${invitation.inviterName} invited you to join "${invitation.poolName}" ($${invitation.contributionAmount}/${invitation.frequency})`,
        action: {
          label: 'View & Join',
          onClick: () => openInvitationModal(invitation),
        },
      });
    });

    // Add recent important notifications as alerts (exclude invite type to avoid duplicates)
    const importantNotifications = notifications
      .filter(n => !n.read && n.isImportant && n.type !== 'invite')
      .slice(0, 3);

    importantNotifications.forEach(notification => {
      generatedAlerts.push({
        id: `notification-${notification.id}`,
        type: notification.type === 'alert' ? 'urgent' : 'info',
        notificationType: notification.type,
        title: 'New Notification',
        message: notification.message,
        dismissible: true,
      });
    });

    // Filter out dismissed alerts
    const filteredAlerts = generatedAlerts.filter(alert => !dismissedAlerts.has(alert.id));

    // Sort alerts: urgent first, then warning, then success, then info
    const sortOrder: Record<AlertItem['type'], number> = {
      urgent: 0,
      warning: 1,
      success: 2,
      info: 3,
    };

    filteredAlerts.sort((a, b) => sortOrder[a.type] - sortOrder[b.type]);

    setAlerts(filteredAlerts);
  }, [pools, userEmail, isLoading, notifications, dismissedAlerts, pendingInvitations, openInvitationModal]);

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  if (isLoading || alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {alerts.slice(0, 5).map((alert) => {
        const styles = getAlertStyles(alert.type);

        return (
          <Alert
            key={alert.id}
            className={cn(styles.container, 'relative')}
          >
            <AlertIcon type={alert.type} notificationType={alert.notificationType} />
            <div className="flex-1 ml-2">
              <AlertTitle className={cn('text-sm font-semibold', styles.title)}>
                {alert.title}
              </AlertTitle>
              <AlertDescription className={cn('text-sm mt-1', styles.description)}>
                {alert.message}
              </AlertDescription>
              {alert.action && (
                <div className="mt-2">
                  {alert.action.href ? (
                    <Link href={alert.action.href}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                      >
                        {alert.action.label}
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={alert.action.onClick}
                    >
                      {alert.action.label}
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            {alert.dismissible && (
              <button
                onClick={() => handleDismiss(alert.id)}
                className={cn(
                  'absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 transition-colors',
                  styles.icon
                )}
                aria-label="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </Alert>
        );
      })}

      {alerts.length > 5 && (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/notifications')}
            className="text-gray-500 hover:text-gray-700"
          >
            View {alerts.length - 5} more alerts
          </Button>
        </div>
      )}

      {/* Pool Invitation Modal */}
      <Dialog open={isInvitationModalOpen} onOpenChange={setIsInvitationModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              Pool Invitation
            </DialogTitle>
            <DialogDescription>
              You&apos;ve been invited to join a savings pool
            </DialogDescription>
          </DialogHeader>

          {selectedInvitation && (
            <div className="space-y-4">
              {/* Pool Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{selectedInvitation.poolName}</h4>
                  {selectedInvitation.poolDescription && (
                    <p className="text-sm text-gray-600 mt-1">{selectedInvitation.poolDescription}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      ${selectedInvitation.contributionAmount}/{selectedInvitation.frequency}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {selectedInvitation.memberCount} member{selectedInvitation.memberCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <span className="font-medium">Invited by:</span> {selectedInvitation.inviterName}
                </div>

                {selectedInvitation.message && (
                  <div className="border-t pt-3">
                    <p className="text-sm text-gray-700 italic">&quot;{selectedInvitation.message}&quot;</p>
                  </div>
                )}
              </div>

              {/* Expiration Warning */}
              {(() => {
                const daysUntilExpiry = Math.ceil(
                  (new Date(selectedInvitation.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                return daysUntilExpiry <= 3 ? (
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      {daysUntilExpiry === 1
                        ? 'Expires tomorrow'
                        : daysUntilExpiry === 0
                        ? 'Expires today'
                        : `Expires in ${daysUntilExpiry} days`}
                    </span>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleDeclineInvitation}
              disabled={isAccepting || isDeclining}
              className="w-full sm:w-auto"
            >
              {isDeclining ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Declining...
                </>
              ) : (
                'Decline'
              )}
            </Button>
            <Button
              onClick={handleAcceptInvitation}
              disabled={isAccepting || isDeclining}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700"
            >
              {isAccepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Join Pool
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
