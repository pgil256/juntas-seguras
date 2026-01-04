// components/pools/CreatorRulesAcknowledgmentDialog.tsx
// Dialog that displays pool rules creators must acknowledge before creating a pool

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

interface CreatorRulesAcknowledgmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poolName: string;
  contributionAmount: number;
  frequency: string;
  onAccept: () => void;
  isProcessing?: boolean;
}

const CREATOR_RULES = [
  {
    id: 'contribution',
    title: 'All Members Contribute Every Round',
    description: 'All members, including you as the creator and any round\'s payout recipient, must contribute every round. There are no exceptions - everyone pays, everyone benefits.',
  },
  {
    id: 'autopay',
    title: 'Automatic Payment Collection',
    description: 'Contributions are collected automatically via Stripe. All members must set up a valid payment method to participate. Payments are charged automatically on each due date.',
  },
  {
    id: 'payout-order',
    title: 'Position-Based Payouts',
    description: 'Members receive payouts based on their position in the queue. Payouts cannot be processed until all members have contributed for that round.',
  },
  {
    id: 'stripe-required',
    title: 'Stripe Account Required',
    description: 'All members must connect and verify a Stripe account to receive their payout. Payouts are sent directly to each member\'s linked bank account.',
  },
  {
    id: 'commitment',
    title: 'Full Cycle Commitment',
    description: 'All members commit to staying in the pool for all rounds until the cycle is complete. Leaving early disrupts the rotation for all members.',
  },
  {
    id: 'creator-responsibility',
    title: 'Creator Responsibilities',
    description: 'As the pool creator, you are responsible for inviting trustworthy members and ensuring the pool runs smoothly. You will participate as a regular member with all the same obligations.',
  },
];

export function CreatorRulesAcknowledgmentDialog({
  open,
  onOpenChange,
  poolName,
  contributionAmount,
  frequency,
  onAccept,
  isProcessing = false,
}: CreatorRulesAcknowledgmentDialogProps) {
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
            Please review and acknowledge the rules before creating <strong>{poolName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800">
                By creating this pool, you agree to contribute <strong>${contributionAmount}</strong>{' '}
                <strong>{frequency}</strong> along with all other members.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800">
                Each round, <strong>ALL</strong> members contribute and one member receives the full payout.
                Recipients also contribute to their own payout.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {CREATOR_RULES.map((rule) => (
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
                id="acknowledge-creator-rules"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
                disabled={isProcessing}
              />
              <Label
                htmlFor="acknowledge-creator-rules"
                className="text-sm text-gray-700 cursor-pointer leading-tight"
              >
                I have read and agree to follow these pool rules. I understand my commitment and responsibilities as the pool creator and as a contributing member.
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
            {isProcessing ? 'Creating...' : 'Accept & Create Pool'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
