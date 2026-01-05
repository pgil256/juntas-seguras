"use client";

import { useState } from "react";
import { Clock, Check, AlertCircle, Loader2, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { PaymentLinkButton } from "./PaymentLinkButton";
import { ZelleCopyButton, ZelleInstructionsCard } from "./ZelleCopyButton";
import { cn } from "../../lib/utils";
import {
  generatePayoutLink,
  PayoutMethodType,
} from "../../lib/payments/deep-links";
import type {
  AdminPaymentMethods,
  RoundPaymentStatus,
  ManualPaymentMethod,
} from "../../types/pool";

interface ContributorPaymentCardProps {
  // Payment details
  amount: number;
  dueDate: Date;
  roundNumber: number;
  poolName: string;

  // Admin info (where to pay)
  adminName: string;
  adminPaymentMethods: AdminPaymentMethods;

  // Current payment status
  status: RoundPaymentStatus;
  memberConfirmedAt?: Date;
  memberConfirmedVia?: ManualPaymentMethod;
  adminVerifiedAt?: Date;

  // Callbacks
  onConfirmPayment: (method: ManualPaymentMethod) => Promise<void>;

  className?: string;
}

const statusConfig: Record<RoundPaymentStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}> = {
  pending: {
    label: 'Payment Pending',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: <Clock className="h-4 w-4" />,
  },
  member_confirmed: {
    label: 'Awaiting Verification',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    icon: <Clock className="h-4 w-4" />,
  },
  admin_verified: {
    label: 'Payment Verified',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: <Check className="h-4 w-4" />,
  },
  late: {
    label: 'Payment Late',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: <AlertCircle className="h-4 w-4" />,
  },
  missed: {
    label: 'Payment Missed',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: <AlertCircle className="h-4 w-4" />,
  },
  excused: {
    label: 'Payment Excused',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: <Check className="h-4 w-4" />,
  },
};

export function ContributorPaymentCard({
  amount,
  dueDate,
  roundNumber,
  poolName,
  adminName,
  adminPaymentMethods,
  status,
  memberConfirmedAt,
  memberConfirmedVia,
  adminVerifiedAt,
  onConfirmPayment,
  className,
}: ContributorPaymentCardProps) {
  const [selectedMethod, setSelectedMethod] = useState<ManualPaymentMethod | ''>('');
  const [confirming, setConfirming] = useState(false);
  const [showConfirmSection, setShowConfirmSection] = useState(false);

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  const formattedDueDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(dueDate);

  const isOverdue = new Date() > dueDate && status === 'pending';
  const canConfirm = status === 'pending' || status === 'late';
  const statusInfo = statusConfig[status];

  // Generate payment note
  const paymentNote = `${poolName} - Round ${roundNumber} Contribution`;

  // Generate links for each admin payment method
  const getPaymentLink = (type: PayoutMethodType): string | null => {
    const handle = adminPaymentMethods[type];
    if (!handle) return null;
    try {
      return generatePayoutLink(type, { recipientHandle: handle, amount, note: paymentNote });
    } catch {
      return null;
    }
  };

  const hasPaymentMethods =
    adminPaymentMethods.venmo ||
    adminPaymentMethods.cashapp ||
    adminPaymentMethods.paypal ||
    adminPaymentMethods.zelle;

  const handleConfirmPayment = async () => {
    if (!selectedMethod) return;

    setConfirming(true);
    try {
      await onConfirmPayment(selectedMethod);
      setShowConfirmSection(false);
    } catch (error) {
      console.error('Failed to confirm payment:', error);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Round {roundNumber} Payment
          </CardTitle>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium',
              statusInfo.bgColor,
              statusInfo.color
            )}
          >
            {statusInfo.icon}
            {statusInfo.label}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Amount and Due Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">Amount Due</div>
            <div className="text-2xl font-bold text-gray-900">{formattedAmount}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Due Date</div>
            <div className={cn(
              "text-sm font-medium flex items-center gap-1",
              isOverdue ? "text-red-600" : "text-gray-700"
            )}>
              <Calendar className="h-4 w-4" />
              {formattedDueDate}
              {isOverdue && <span className="text-xs ml-1">(Overdue)</span>}
            </div>
          </div>
        </div>

        {/* Payment already confirmed/verified */}
        {status === 'member_confirmed' && memberConfirmedAt && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              You confirmed this payment via <strong>{memberConfirmedVia}</strong> on{' '}
              {new Intl.DateTimeFormat('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(memberConfirmedAt))}
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              Waiting for {adminName} to verify receipt.
            </p>
          </div>
        )}

        {status === 'admin_verified' && adminVerifiedAt && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-800">
              Payment verified by {adminName} on{' '}
              {new Intl.DateTimeFormat('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(adminVerifiedAt))}
            </p>
          </div>
        )}

        {/* Pay Section - Only show if can still pay */}
        {canConfirm && hasPaymentMethods && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Pay {adminName}:
            </h4>

            <div className="space-y-3">
              {/* Payment Link Buttons */}
              <div className="flex flex-wrap gap-2">
                {adminPaymentMethods.venmo && (
                  <PaymentLinkButton
                    type="venmo"
                    link={getPaymentLink('venmo')}
                    amount={amount}
                    size="sm"
                    onClick={() => setShowConfirmSection(true)}
                  />
                )}
                {adminPaymentMethods.cashapp && (
                  <PaymentLinkButton
                    type="cashapp"
                    link={getPaymentLink('cashapp')}
                    amount={amount}
                    size="sm"
                    onClick={() => setShowConfirmSection(true)}
                  />
                )}
                {adminPaymentMethods.paypal && (
                  <PaymentLinkButton
                    type="paypal"
                    link={getPaymentLink('paypal')}
                    amount={amount}
                    size="sm"
                    onClick={() => setShowConfirmSection(true)}
                  />
                )}
              </div>

              {/* Zelle Section */}
              {adminPaymentMethods.zelle && (
                <ZelleInstructionsCard
                  identifier={adminPaymentMethods.zelle}
                  recipientName={adminName}
                  amount={amount}
                />
              )}
            </div>
          </div>
        )}

        {/* No payment methods warning */}
        {canConfirm && !hasPaymentMethods && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              {adminName} hasn&apos;t set up payment methods yet.
              Please contact them to arrange payment.
            </p>
          </div>
        )}

        {/* Confirm Payment Section */}
        {canConfirm && (showConfirmSection || status === 'late') && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Already sent your payment?
            </h4>

            <div className="space-y-3">
              <div>
                <Label htmlFor="payment-method" className="text-sm text-gray-600">
                  Payment Method Used:
                </Label>
                <Select
                  value={selectedMethod}
                  onValueChange={(value) => setSelectedMethod(value as ManualPaymentMethod)}
                >
                  <SelectTrigger id="payment-method" className="mt-1">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminPaymentMethods.venmo && (
                      <SelectItem value="venmo">Venmo</SelectItem>
                    )}
                    {adminPaymentMethods.cashapp && (
                      <SelectItem value="cashapp">Cash App</SelectItem>
                    )}
                    {adminPaymentMethods.paypal && (
                      <SelectItem value="paypal">PayPal</SelectItem>
                    )}
                    {adminPaymentMethods.zelle && (
                      <SelectItem value="zelle">Zelle</SelectItem>
                    )}
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleConfirmPayment}
                disabled={!selectedMethod || confirming}
                className="w-full"
              >
                {confirming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirm Payment Sent
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ContributorPaymentCard;
