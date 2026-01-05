'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Award, DollarSign, Check, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PayoutCountdownProps {
  payoutDate: string;
  payoutAmount: number;
  recipientName: string;
  isUserRecipient: boolean;
  allContributionsReceived: boolean;
  payoutProcessed: boolean;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export function PayoutCountdown({
  payoutDate,
  payoutAmount,
  recipientName,
  isUserRecipient,
  allContributionsReceived,
  payoutProcessed,
  className,
}: PayoutCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!payoutDate || payoutProcessed) return;

    const calculateTimeLeft = () => {
      const difference = new Date(payoutDate).getTime() - new Date().getTime();

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        total: difference,
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [payoutDate, payoutProcessed]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Don't render until client-side mounted to avoid hydration issues
  if (!mounted) {
    return (
      <div className={cn('p-4 rounded-xl bg-gray-50', className)}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-8 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    );
  }

  // Payout already processed
  if (payoutProcessed) {
    return (
      <div
        className={cn(
          'p-4 rounded-xl',
          isUserRecipient
            ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white'
            : 'bg-green-50 border border-green-100',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center',
              isUserRecipient ? 'bg-white/20' : 'bg-green-100'
            )}
          >
            <Check
              className={cn('w-6 h-6', isUserRecipient ? 'text-white' : 'text-green-600')}
            />
          </div>
          <div>
            <p
              className={cn(
                'font-semibold',
                isUserRecipient ? 'text-white' : 'text-green-800'
              )}
            >
              {isUserRecipient ? 'Payout Received!' : 'Payout Complete'}
            </p>
            <p
              className={cn(
                'text-sm',
                isUserRecipient ? 'text-green-100' : 'text-green-600'
              )}
            >
              {formatCurrency(payoutAmount)} {isUserRecipient ? 'deposited' : `sent to ${recipientName}`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Waiting for contributions
  if (!allContributionsReceived) {
    return (
      <div className={cn('p-4 rounded-xl bg-amber-50 border border-amber-100', className)}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-800">Awaiting Contributions</p>
            <p className="text-sm text-amber-600">
              Payout scheduled for {new Date(payoutDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isOverdue = timeLeft?.total === 0;

  // Ready for payout (all contributions received)
  if (isOverdue || !timeLeft) {
    return (
      <div
        className={cn(
          'p-4 rounded-xl',
          isUserRecipient
            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
            : 'bg-blue-50 border border-blue-100',
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                isUserRecipient ? 'bg-white/20' : 'bg-blue-100'
              )}
            >
              <Award
                className={cn('w-6 h-6', isUserRecipient ? 'text-white' : 'text-blue-600')}
              />
            </div>
            <div>
              <p
                className={cn(
                  'font-semibold',
                  isUserRecipient ? 'text-white' : 'text-blue-800'
                )}
              >
                {isUserRecipient ? 'Your Payout is Ready!' : 'Ready for Payout'}
              </p>
              <p
                className={cn(
                  'text-sm',
                  isUserRecipient ? 'text-blue-100' : 'text-blue-600'
                )}
              >
                {formatCurrency(payoutAmount)} to {isUserRecipient ? 'you' : recipientName}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Countdown display
  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="text-center">
      <div
        className={cn(
          'text-2xl sm:text-3xl font-bold tabular-nums',
          isUserRecipient ? 'text-white' : 'text-gray-900'
        )}
      >
        {value.toString().padStart(2, '0')}
      </div>
      <div
        className={cn(
          'text-xs uppercase tracking-wide',
          isUserRecipient ? 'text-emerald-100' : 'text-gray-500'
        )}
      >
        {label}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        'p-4 rounded-xl',
        isUserRecipient
          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
          : 'bg-gray-50 border border-gray-100',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock
            className={cn('w-5 h-5', isUserRecipient ? 'text-emerald-100' : 'text-gray-400')}
          />
          <span
            className={cn(
              'text-sm font-medium',
              isUserRecipient ? 'text-emerald-100' : 'text-gray-600'
            )}
          >
            {isUserRecipient ? 'Your payout in' : 'Next payout in'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <DollarSign
            className={cn('w-4 h-4', isUserRecipient ? 'text-emerald-100' : 'text-gray-400')}
          />
          <span
            className={cn(
              'font-semibold',
              isUserRecipient ? 'text-white' : 'text-gray-900'
            )}
          >
            {formatCurrency(payoutAmount)}
          </span>
        </div>
      </div>

      {/* Countdown */}
      <div className="flex justify-center gap-4 sm:gap-6">
        <TimeBlock value={timeLeft.days} label="Days" />
        <div
          className={cn(
            'text-2xl sm:text-3xl font-bold',
            isUserRecipient ? 'text-emerald-200' : 'text-gray-300'
          )}
        >
          :
        </div>
        <TimeBlock value={timeLeft.hours} label="Hours" />
        <div
          className={cn(
            'text-2xl sm:text-3xl font-bold',
            isUserRecipient ? 'text-emerald-200' : 'text-gray-300'
          )}
        >
          :
        </div>
        <TimeBlock value={timeLeft.minutes} label="Min" />
        <div
          className={cn(
            'text-2xl sm:text-3xl font-bold hidden sm:block',
            isUserRecipient ? 'text-emerald-200' : 'text-gray-300'
          )}
        >
          :
        </div>
        <div className="hidden sm:block">
          <TimeBlock value={timeLeft.seconds} label="Sec" />
        </div>
      </div>

      {/* Recipient info */}
      <div
        className={cn(
          'mt-4 pt-3 border-t text-center text-sm',
          isUserRecipient ? 'border-emerald-400/30 text-emerald-100' : 'border-gray-200 text-gray-500'
        )}
      >
        {isUserRecipient ? (
          <>
            <Award className="w-4 h-4 inline mr-1" />
            You're the recipient this round!
          </>
        ) : (
          <>Recipient: <span className="font-medium">{recipientName}</span></>
        )}
      </div>
    </div>
  );
}

// Compact version for dashboard/list views
interface PayoutCountdownCompactProps {
  payoutDate: string;
  payoutAmount: number;
  isUserRecipient: boolean;
  allContributionsReceived: boolean;
  payoutProcessed: boolean;
  className?: string;
}

export function PayoutCountdownCompact({
  payoutDate,
  payoutAmount,
  isUserRecipient,
  allContributionsReceived,
  payoutProcessed,
  className,
}: PayoutCountdownCompactProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!payoutDate || payoutProcessed) return;

    const calculateTimeLeft = () => {
      const difference = new Date(payoutDate).getTime() - new Date().getTime();

      if (difference <= 0) return 'Ready';

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);

      if (days > 0) return `${days}d ${hours}h`;

      const minutes = Math.floor((difference / 1000 / 60) % 60);
      return `${hours}h ${minutes}m`;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [payoutDate, payoutProcessed]);

  if (!mounted) return null;

  if (payoutProcessed) {
    return (
      <span className={cn('text-green-600 font-medium text-sm', className)}>
        <Check className="w-3 h-3 inline mr-1" />
        Paid
      </span>
    );
  }

  if (!allContributionsReceived) {
    return (
      <span className={cn('text-amber-600 text-sm', className)}>
        <Clock className="w-3 h-3 inline mr-1" />
        Pending
      </span>
    );
  }

  return (
    <span
      className={cn(
        'text-sm font-medium',
        isUserRecipient ? 'text-emerald-600' : 'text-blue-600',
        className
      )}
    >
      <Clock className="w-3 h-3 inline mr-1" />
      {timeLeft}
    </span>
  );
}
