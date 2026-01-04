// components/pools/RulesAcknowledgmentDialog.tsx
// Dialog that displays pool rules users must acknowledge before joining

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { ScrollText, AlertCircle, Info } from 'lucide-react';
import { useState } from 'react';

interface RulesAcknowledgmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poolName: string;
  contributionAmount: number;
  frequency: string;
  onAccept: () => void;
  isProcessing?: boolean;
}

const POOL_RULES = [
  {
    id: 'contribution',
    title: 'Contribute Every Round',
    description: 'I understand that I must contribute every round, including the round when I receive my payout. Late or missed payments delay payouts for everyone.',
  },
  {
    id: 'payout-order',
    title: 'Position-Based Payouts',
    description: 'I understand that members receive payouts based on their position in the queue. Payouts cannot be processed until all members have contributed for that round.',
  },
  {
    id: 'stripe-required',
    title: 'Stripe Account Required',
    description: 'I understand that I must connect and verify a Stripe account to receive my payout. Payouts are sent directly to my linked bank account.',
  },
  {
    id: 'commitment',
    title: 'Full Cycle Commitment',
    description: 'I commit to staying in the pool for all rounds until the cycle is complete. Leaving early disrupts the rotation for all members.',
  },
  {
    id: 'trust',
    title: 'Trust & Responsibility',
    description: 'I understand that this pool is based on mutual trust between members. I will fulfill my obligations and communicate promptly about any issues.',
  },
];

export function RulesAcknowledgmentDialog({
  open,
  onOpenChange,
  poolName,
  contributionAmount,
  frequency,
  onAccept,
  isProcessing = false,
}: RulesAcknowledgmentDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setAcknowledged(false);
    }
    onOpenChange(newOpen);
  };

  const handleAccept = () => {
    if (acknowledged) {
      onAccept();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Pool Rules & Agreement
          </DialogTitle>
          <DialogDescription>
            Please review and acknowledge the rules before joining <strong>{poolName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800">
                By joining this pool, you agree to contribute <strong>${contributionAmount}</strong>{' '}
                <strong>{frequency}</strong> until the cycle is complete.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800">
                Each round, all members contribute and one member receives the full payout.
                You will be assigned a position in the queue when you join.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {POOL_RULES.map((rule) => (
              <div
                key={rule.id}
                className="bg-gray-50 rounded-lg p-3 space-y-1"
              >
                <h4 className="text-sm font-medium text-gray-900">{rule.title}</h4>
                <p className="text-xs text-gray-600">{rule.description}</p>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="acknowledge-rules"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
                disabled={isProcessing}
              />
              <Label
                htmlFor="acknowledge-rules"
                className="text-sm text-gray-700 cursor-pointer leading-tight"
              >
                I have read and agree to follow these pool rules. I understand my commitment and responsibilities as a member.
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!acknowledged || isProcessing}
          >
            {isProcessing ? 'Joining...' : 'Accept & Join'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
