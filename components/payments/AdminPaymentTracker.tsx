"use client";

import { useState } from "react";
import {
  Clock,
  Check,
  X,
  AlertCircle,
  Mail,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Textarea } from "../ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { cn } from "../../lib/utils";
import type { RoundPayment, RoundPaymentStatus, ManualPaymentMethod } from "../../types/pool";

interface AdminPaymentTrackerProps {
  // Round info
  roundNumber: number;
  poolName: string;
  contributionAmount: number;
  dueDate: Date;
  winnerName: string;

  // Payments
  payments: RoundPayment[];

  // Callbacks
  onVerifyPayment: (memberId: number, notes?: string) => Promise<void>;
  onDisputePayment: (memberId: number, notes: string) => Promise<void>;
  onSendReminder: (memberId: number) => Promise<void>;
  onMarkLate: (memberId: number) => Promise<void>;
  onExcusePayment: (memberId: number, notes: string) => Promise<void>;

  // Whether all payments are verified (ready for payout)
  allVerified: boolean;

  className?: string;
}

const statusConfig: Record<RoundPaymentStatus, {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: React.ReactNode;
}> = {
  pending: {
    label: 'Pending',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
    icon: <Clock className="h-4 w-4" />,
  },
  member_confirmed: {
    label: 'Member Confirmed',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-600',
    icon: <Clock className="h-4 w-4" />,
  },
  admin_verified: {
    label: 'Verified',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-600',
    icon: <Check className="h-4 w-4" />,
  },
  late: {
    label: 'Late',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-600',
    icon: <AlertCircle className="h-4 w-4" />,
  },
  missed: {
    label: 'Missed',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-600',
    icon: <X className="h-4 w-4" />,
  },
  excused: {
    label: 'Excused',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-600',
    icon: <Check className="h-4 w-4" />,
  },
};

const methodLabels: Record<ManualPaymentMethod, string> = {
  venmo: 'Venmo',
  cashapp: 'Cash App',
  paypal: 'PayPal',
  zelle: 'Zelle',
  cash: 'Cash',
  other: 'Other',
};

interface PaymentRowProps {
  payment: RoundPayment;
  isAdmin: boolean;
  onVerify: (notes?: string) => Promise<void>;
  onDispute: (notes: string) => Promise<void>;
  onSendReminder: () => Promise<void>;
  onMarkLate: () => Promise<void>;
  onExcuse: (notes: string) => Promise<void>;
}

function PaymentRow({
  payment,
  isAdmin,
  onVerify,
  onDispute,
  onSendReminder,
  onMarkLate,
  onExcuse,
}: PaymentRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState('');
  const [action, setAction] = useState<'verify' | 'dispute' | 'excuse' | null>(null);

  const status = statusConfig[payment.status];
  const canVerify = payment.status === 'member_confirmed';
  const canRemind = payment.status === 'pending' || payment.status === 'late';
  const canMarkLate = payment.status === 'pending';
  const isVerified = payment.status === 'admin_verified';

  const handleAction = async (actionType: 'verify' | 'dispute' | 'excuse' | 'remind' | 'late') => {
    setIsProcessing(true);
    try {
      switch (actionType) {
        case 'verify':
          await onVerify(notes || undefined);
          break;
        case 'dispute':
          await onDispute(notes);
          break;
        case 'excuse':
          await onExcuse(notes);
          break;
        case 'remind':
          await onSendReminder();
          break;
        case 'late':
          await onMarkLate();
          break;
      }
      setAction(null);
      setNotes('');
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate days late
  const daysLate = payment.dueDate
    ? Math.max(0, Math.floor((Date.now() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div
        className={cn(
          'border rounded-lg overflow-hidden transition-colors',
          isVerified ? 'border-green-200 bg-green-50/50' : 'border-gray-200',
          payment.status === 'member_confirmed' && 'border-yellow-200 bg-yellow-50/50',
          (payment.status === 'late' || payment.status === 'missed') && 'border-red-200 bg-red-50/50'
        )}
      >
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
                <User className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <div className="font-medium text-gray-900">{payment.memberName}</div>
                <div className="text-sm text-gray-500">{payment.memberEmail}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Payment method badge if confirmed */}
              {payment.memberConfirmedVia && (
                <span className="text-xs text-gray-500">
                  via {methodLabels[payment.memberConfirmedVia]}
                </span>
              )}

              {/* Status badge */}
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                  status.bgColor,
                  status.textColor
                )}
              >
                {status.icon}
                {status.label}
              </span>

              {/* Late indicator */}
              {daysLate > 0 && payment.status !== 'admin_verified' && payment.status !== 'excused' && (
                <span className="text-xs text-red-600">
                  {daysLate} day{daysLate !== 1 ? 's' : ''} late
                </span>
              )}

              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t p-3 space-y-3 bg-white">
            {/* Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Amount:</span>{' '}
                <span className="font-medium">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(payment.amount)}
                </span>
              </div>
              {payment.memberConfirmedAt && (
                <div>
                  <span className="text-gray-500">Confirmed:</span>{' '}
                  <span className="font-medium">
                    {new Intl.DateTimeFormat('en-US', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }).format(new Date(payment.memberConfirmedAt))}
                  </span>
                </div>
              )}
              {payment.reminderCount > 0 && (
                <div>
                  <span className="text-gray-500">Reminders sent:</span>{' '}
                  <span className="font-medium">{payment.reminderCount}</span>
                </div>
              )}
              {payment.adminNotes && (
                <div className="col-span-2">
                  <span className="text-gray-500">Notes:</span>{' '}
                  <span className="font-medium">{payment.adminNotes}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            {isAdmin && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {canVerify && !action && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => setAction('verify')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAction('dispute')}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Dispute
                    </Button>
                  </>
                )}

                {canRemind && !action && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction('remind')}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4 mr-1" />
                    )}
                    Send Reminder
                  </Button>
                )}

                {canMarkLate && !action && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction('late')}
                    disabled={isProcessing}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    Mark Late
                  </Button>
                )}

                {!isVerified && !action && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAction('excuse')}
                  >
                    Excuse
                  </Button>
                )}

                {/* Action forms */}
                {action && (
                  <div className="w-full space-y-2">
                    <Textarea
                      placeholder={
                        action === 'verify'
                          ? 'Add verification notes (optional)'
                          : action === 'dispute'
                          ? 'Explain why you are disputing this payment'
                          : 'Reason for excusing this payment'
                      }
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-h-[60px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(action)}
                        disabled={isProcessing || (action !== 'verify' && !notes)}
                        className={action === 'verify' ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        {isProcessing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        {action === 'verify' ? 'Confirm Verification' : action === 'dispute' ? 'Submit Dispute' : 'Excuse Payment'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAction(null);
                          setNotes('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function AdminPaymentTracker({
  roundNumber,
  poolName,
  contributionAmount,
  dueDate,
  winnerName,
  payments,
  onVerifyPayment,
  onDisputePayment,
  onSendReminder,
  onMarkLate,
  onExcusePayment,
  allVerified,
  className,
}: AdminPaymentTrackerProps) {
  const totalAmount = contributionAmount * payments.length;
  const verifiedPayments = payments.filter(p => p.status === 'admin_verified');
  const confirmedPayments = payments.filter(p => p.status === 'member_confirmed');
  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'late');
  const latePayments = payments.filter(p => p.status === 'late');

  const amountCollected = verifiedPayments.reduce((sum, p) => sum + p.amount, 0);
  const percentComplete = payments.length > 0 ? (verifiedPayments.length / payments.length) * 100 : 0;

  const formattedDueDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(dueDate);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              Round {roundNumber} - {poolName}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Due: {formattedDueDate} | Winner: {winnerName}
            </p>
          </div>
          {allVerified && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
              <Check className="h-4 w-4" />
              Ready for Payout
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Collection Progress */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Collection Status</span>
            <span className="font-medium">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(amountCollected)}{' '}
              /{' '}
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(totalAmount)}{' '}
              ({verifiedPayments.length}/{payments.length} members)
            </span>
          </div>
          <Progress value={percentComplete} className="h-2" />

          {/* Summary badges */}
          <div className="flex flex-wrap gap-2 mt-2">
            {confirmedPayments.length > 0 && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                {confirmedPayments.length} awaiting verification
              </span>
            )}
            {latePayments.length > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                {latePayments.length} late
              </span>
            )}
            {pendingPayments.length > 0 && (
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                {pendingPayments.length} pending
              </span>
            )}
          </div>
        </div>

        {/* Payments List */}
        <div className="space-y-2">
          {payments.map((payment) => (
            <PaymentRow
              key={payment.memberId}
              payment={payment}
              isAdmin={true}
              onVerify={(notes) => onVerifyPayment(payment.memberId, notes)}
              onDispute={(notes) => onDisputePayment(payment.memberId, notes)}
              onSendReminder={() => onSendReminder(payment.memberId)}
              onMarkLate={() => onMarkLate(payment.memberId)}
              onExcuse={(notes) => onExcusePayment(payment.memberId, notes)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default AdminPaymentTracker;
