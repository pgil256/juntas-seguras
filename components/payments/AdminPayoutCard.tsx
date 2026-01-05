"use client";

import { useState } from "react";
import {
  Check,
  AlertCircle,
  Loader2,
  Trophy,
  DollarSign,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { PaymentLinkButton, PaymentMethodType } from "./PaymentLinkButton";
import { ZelleInstructionsCard } from "./ZelleCopyButton";
import { cn } from "../../lib/utils";
import {
  generatePayoutLink,
  PayoutMethodType,
} from "../../lib/payments/deep-links";
import type {
  MemberPayoutMethods,
  PayoutStatus,
  ManualPaymentMethod,
} from "../../types/pool";

interface AdminPayoutCardProps {
  // Round info
  roundNumber: number;
  poolName: string;
  potAmount: number;

  // Winner info
  winnerName: string;
  winnerEmail: string;
  winnerPayoutMethods?: MemberPayoutMethods;

  // Payout status
  payoutStatus: PayoutStatus;
  payoutCompletedAt?: Date;
  payoutMethod?: ManualPaymentMethod;

  // Whether all payments are verified
  allPaymentsVerified: boolean;

  // Callback
  onConfirmPayout: (method: ManualPaymentMethod, notes?: string) => Promise<void>;

  className?: string;
}

const statusConfig: Record<PayoutStatus, {
  label: string;
  color: string;
  bgColor: string;
  canPayout: boolean;
}> = {
  pending_collection: {
    label: 'Collecting Payments',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    canPayout: false,
  },
  ready_to_pay: {
    label: 'Ready to Pay',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    canPayout: true,
  },
  paid: {
    label: 'Paid',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    canPayout: false,
  },
  completed: {
    label: 'Completed',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    canPayout: false,
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

export function AdminPayoutCard({
  roundNumber,
  poolName,
  potAmount,
  winnerName,
  winnerEmail,
  winnerPayoutMethods,
  payoutStatus,
  payoutCompletedAt,
  payoutMethod,
  allPaymentsVerified,
  onConfirmPayout,
  className,
}: AdminPayoutCardProps) {
  const [selectedMethod, setSelectedMethod] = useState<ManualPaymentMethod | ''>('');
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [showConfirmSection, setShowConfirmSection] = useState(false);

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(potAmount);

  const status = statusConfig[payoutStatus];
  const canPayout = allPaymentsVerified && status.canPayout;

  // Generate payment note
  const paymentNote = `${poolName} - Round ${roundNumber} Payout`;

  // Generate links for each winner payment method
  const getPaymentLink = (type: PayoutMethodType): string | null => {
    if (type === 'bank') return null; // Bank transfers don't have deep links
    const handle = winnerPayoutMethods?.[type];
    if (!handle) return null;
    try {
      return generatePayoutLink(type, { recipientHandle: handle, amount: potAmount, note: paymentNote });
    } catch {
      return null;
    }
  };

  const hasPaymentMethods =
    winnerPayoutMethods?.venmo ||
    winnerPayoutMethods?.cashapp ||
    winnerPayoutMethods?.paypal ||
    winnerPayoutMethods?.zelle;

  const preferredMethod = winnerPayoutMethods?.preferred;

  const handleConfirmPayout = async () => {
    if (!selectedMethod) return;

    setConfirming(true);
    try {
      await onConfirmPayout(selectedMethod, notes || undefined);
      setShowConfirmSection(false);
    } catch (error) {
      console.error('Failed to confirm payout:', error);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
              <Trophy className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                Round {roundNumber} Payout
              </CardTitle>
              <p className="text-sm text-gray-500">
                {poolName}
              </p>
            </div>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium',
              status.bgColor,
              status.color
            )}
          >
            {payoutStatus === 'paid' || payoutStatus === 'completed' ? (
              <Check className="h-4 w-4" />
            ) : (
              <DollarSign className="h-4 w-4" />
            )}
            {status.label}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Winner Info */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
            <User className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900">Pay to: {winnerName}</div>
            <div className="text-sm text-gray-500">{winnerEmail}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">{formattedAmount}</div>
            <div className="text-xs text-gray-500">Total Pot</div>
          </div>
        </div>

        {/* Not ready for payout */}
        {!allPaymentsVerified && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Payout Disabled
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  All member payments must be verified before you can send the payout.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payout completed */}
        {(payoutStatus === 'paid' || payoutStatus === 'completed') && payoutCompletedAt && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Payout Sent
                </p>
                <p className="text-sm text-green-700 mt-1">
                  {formattedAmount} was sent to {winnerName} via {payoutMethod ? methodLabels[payoutMethod] : 'payment app'} on{' '}
                  {new Intl.DateTimeFormat('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(payoutCompletedAt))}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payout Section - Only show if can pay */}
        {canPayout && (
          <>
            {/* Winner has payment methods */}
            {hasPaymentMethods ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">
                    Pay {winnerName}:
                  </h4>
                  {preferredMethod && (
                    <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                      Preferred: {methodLabels[preferredMethod] || preferredMethod}
                    </span>
                  )}
                </div>

                {/* Payment Link Buttons */}
                <div className="space-y-3">
                  {/* Show preferred method first */}
                  {preferredMethod && winnerPayoutMethods?.[preferredMethod] && preferredMethod !== 'zelle' && (
                    <div>
                      <PaymentLinkButton
                        type={preferredMethod as PaymentMethodType}
                        link={getPaymentLink(preferredMethod as PayoutMethodType)}
                        amount={potAmount}
                        className="w-full justify-center"
                        onClick={() => setShowConfirmSection(true)}
                      />
                      <p className="text-xs text-center text-gray-500 mt-1">Primary method</p>
                    </div>
                  )}

                  {/* Other methods */}
                  <div className="flex flex-wrap gap-2">
                    {winnerPayoutMethods?.venmo && preferredMethod !== 'venmo' && (
                      <PaymentLinkButton
                        type="venmo"
                        link={getPaymentLink('venmo')}
                        amount={potAmount}
                        size="sm"
                        onClick={() => setShowConfirmSection(true)}
                      />
                    )}
                    {winnerPayoutMethods?.cashapp && preferredMethod !== 'cashapp' && (
                      <PaymentLinkButton
                        type="cashapp"
                        link={getPaymentLink('cashapp')}
                        amount={potAmount}
                        size="sm"
                        onClick={() => setShowConfirmSection(true)}
                      />
                    )}
                    {winnerPayoutMethods?.paypal && preferredMethod !== 'paypal' && (
                      <PaymentLinkButton
                        type="paypal"
                        link={getPaymentLink('paypal')}
                        amount={potAmount}
                        size="sm"
                        onClick={() => setShowConfirmSection(true)}
                      />
                    )}
                  </div>

                  {/* Zelle Section */}
                  {winnerPayoutMethods?.zelle && (
                    <ZelleInstructionsCard
                      identifier={winnerPayoutMethods.zelle}
                      recipientName={winnerName}
                      amount={potAmount}
                    />
                  )}
                </div>
              </div>
            ) : (
              /* No payment methods warning */
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      No Payment Methods Set Up
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      {winnerName} hasn&apos;t configured their payout methods.
                      Please contact them to get their payment information.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Confirm Payout Section */}
            {showConfirmSection && (
              <div className="border-t pt-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-900">
                  Confirm Payout Sent
                </h4>

                <div>
                  <Label htmlFor="payout-method" className="text-sm text-gray-600">
                    Payment Method Used:
                  </Label>
                  <Select
                    value={selectedMethod}
                    onValueChange={(value) => setSelectedMethod(value as ManualPaymentMethod)}
                  >
                    <SelectTrigger id="payout-method" className="mt-1">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {winnerPayoutMethods?.venmo && (
                        <SelectItem value="venmo">Venmo</SelectItem>
                      )}
                      {winnerPayoutMethods?.cashapp && (
                        <SelectItem value="cashapp">Cash App</SelectItem>
                      )}
                      {winnerPayoutMethods?.paypal && (
                        <SelectItem value="paypal">PayPal</SelectItem>
                      )}
                      {winnerPayoutMethods?.zelle && (
                        <SelectItem value="zelle">Zelle</SelectItem>
                      )}
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payout-notes" className="text-sm text-gray-600">
                    Notes (optional):
                  </Label>
                  <Textarea
                    id="payout-notes"
                    placeholder="Add any notes about this payout..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1 min-h-[60px]"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleConfirmPayout}
                    disabled={!selectedMethod || confirming}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {confirming ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Confirm Payout Sent
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowConfirmSection(false);
                      setSelectedMethod('');
                      setNotes('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Manual confirm button if not shown yet */}
            {!showConfirmSection && (
              <Button
                variant="outline"
                onClick={() => setShowConfirmSection(true)}
                className="w-full"
              >
                Already sent payment? Confirm payout
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminPayoutCard;
