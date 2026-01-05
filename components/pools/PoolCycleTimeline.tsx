'use client';

import React from 'react';
import { Award, Check, Clock, DollarSign, User } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TimelineMember {
  id: string;
  name: string;
  email: string;
  position: number;
  status: 'completed' | 'current' | 'upcoming';
  hasReceivedPayout: boolean;
  payoutDate?: string;
}

interface PoolCycleTimelineProps {
  members: TimelineMember[];
  currentRound: number;
  totalRounds: number;
  contributionAmount: number;
  frequency: string;
  currentUserEmail?: string;
}

export function PoolCycleTimeline({
  members,
  currentRound,
  totalRounds,
  contributionAmount,
  frequency,
  currentUserEmail,
}: PoolCycleTimelineProps) {
  const sortedMembers = [...members].sort((a, b) => a.position - b.position);
  const payoutAmount = contributionAmount * members.length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusStyles = (status: string, isCurrentUser: boolean) => {
    const baseStyles = 'transition-all duration-200';

    if (status === 'completed') {
      return {
        circle: cn(baseStyles, 'bg-green-500 text-white border-green-500'),
        line: 'bg-green-500',
        text: 'text-green-700',
        bg: isCurrentUser ? 'bg-green-50 border-green-200' : '',
      };
    }
    if (status === 'current') {
      return {
        circle: cn(baseStyles, 'bg-blue-500 text-white border-blue-500 ring-4 ring-blue-100'),
        line: 'bg-gray-200',
        text: 'text-blue-700 font-semibold',
        bg: isCurrentUser ? 'bg-blue-50 border-blue-200' : 'bg-blue-50/50',
      };
    }
    return {
      circle: cn(baseStyles, 'bg-gray-100 text-gray-400 border-gray-300'),
      line: 'bg-gray-200',
      text: 'text-gray-500',
      bg: isCurrentUser ? 'bg-gray-50 border-gray-200' : '',
    };
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Payout Schedule</h3>
          <p className="text-sm text-gray-500">
            {formatCurrency(payoutAmount)} per round • {frequency}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">
            Round {currentRound} of {totalRounds}
          </p>
          <p className="text-xs text-gray-500">
            {totalRounds - currentRound} rounds remaining
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {sortedMembers.map((member, index) => {
          const isCurrentUser = member.email === currentUserEmail;
          const styles = getStatusStyles(member.status, isCurrentUser);
          const isLast = index === sortedMembers.length - 1;

          return (
            <div key={member.id} className="relative">
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'absolute left-5 top-10 w-0.5 h-full -translate-x-1/2',
                    member.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                  )}
                />
              )}

              {/* Timeline item */}
              <div
                className={cn(
                  'relative flex items-start gap-4 p-3 rounded-lg border border-transparent',
                  styles.bg,
                  isCurrentUser && 'border'
                )}
              >
                {/* Circle indicator */}
                <div
                  className={cn(
                    'relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0',
                    styles.circle
                  )}
                >
                  {member.status === 'completed' ? (
                    <Check className="w-5 h-5" />
                  ) : member.status === 'current' ? (
                    <Award className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{member.position}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-sm truncate', styles.text)}>
                      {member.name}
                    </p>
                    {isCurrentUser && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        You
                      </span>
                    )}
                    {member.status === 'current' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                        Receiving
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">
                      Position {member.position}
                    </span>
                    {member.payoutDate && (
                      <span className="text-xs text-gray-500">
                        {member.status === 'completed' ? 'Received' : 'Expected'}: {formatDate(member.payoutDate)}
                      </span>
                    )}
                    {member.status === 'completed' && (
                      <span className="inline-flex items-center text-xs text-green-600">
                        <DollarSign className="w-3 h-3 mr-0.5" />
                        {formatCurrency(payoutAmount)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status badge for mobile */}
                <div className="sm:hidden">
                  {member.status === 'completed' && (
                    <span className="text-xs text-green-600 font-medium">Paid</span>
                  )}
                  {member.status === 'current' && (
                    <span className="text-xs text-blue-600 font-medium">Now</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs text-gray-600">Received</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-200" />
          <span className="text-xs text-gray-600">Current</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-200 border border-gray-300" />
          <span className="text-xs text-gray-600">Upcoming</span>
        </div>
      </div>
    </div>
  );
}
