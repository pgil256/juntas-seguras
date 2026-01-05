'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { Check, Clock, Award } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Member {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  hasContributed: boolean;
  isRecipient: boolean;
  position: number;
}

interface MemberContributionAvatarsProps {
  members: Member[];
  currentUserEmail?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  maxDisplay?: number;
  className?: string;
}

export function MemberContributionAvatars({
  members,
  currentUserEmail,
  size = 'md',
  showTooltip = true,
  maxDisplay = 8,
  className,
}: MemberContributionAvatarsProps) {
  const sortedMembers = [...members].sort((a, b) => a.position - b.position);
  const displayMembers = sortedMembers.slice(0, maxDisplay);
  const remainingCount = members.length - maxDisplay;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const sizeClasses = {
    sm: { avatar: 'w-8 h-8', icon: 'w-3 h-3', badge: 'w-4 h-4', overlap: '-ml-2' },
    md: { avatar: 'w-10 h-10', icon: 'w-3.5 h-3.5', badge: 'w-5 h-5', overlap: '-ml-2.5' },
    lg: { avatar: 'w-12 h-12', icon: 'w-4 h-4', badge: 'w-6 h-6', overlap: '-ml-3' },
  };

  const classes = sizeClasses[size];

  const getStatusBadge = (member: Member) => {
    if (member.isRecipient) {
      return (
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full bg-blue-500 text-white flex items-center justify-center ring-2 ring-white',
            classes.badge
          )}
        >
          <Award className={classes.icon} />
        </div>
      );
    }

    if (member.hasContributed) {
      return (
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full bg-green-500 text-white flex items-center justify-center ring-2 ring-white',
            classes.badge
          )}
        >
          <Check className={classes.icon} />
        </div>
      );
    }

    return (
      <div
        className={cn(
          'absolute -bottom-0.5 -right-0.5 rounded-full bg-amber-500 text-white flex items-center justify-center ring-2 ring-white',
          classes.badge
        )}
      >
        <Clock className={classes.icon} />
      </div>
    );
  };

  const MemberAvatar = ({ member, index }: { member: Member; index: number }) => {
    const isCurrentUser = member.email === currentUserEmail;

    const avatar = (
      <div
        className={cn(
          'relative',
          index > 0 && classes.overlap
        )}
      >
        <Avatar
          className={cn(
            classes.avatar,
            'ring-2 ring-white',
            isCurrentUser && 'ring-blue-500'
          )}
        >
          <AvatarImage src={member.avatar} alt={member.name} />
          <AvatarFallback
            className={cn(
              'text-xs font-medium',
              member.hasContributed
                ? 'bg-green-100 text-green-700'
                : member.isRecipient
                ? 'bg-blue-100 text-blue-700'
                : 'bg-amber-100 text-amber-700'
            )}
          >
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>
        {getStatusBadge(member)}
      </div>
    );

    if (!showTooltip) {
      return avatar;
    }

    return (
      <TooltipProvider key={member.id}>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>{avatar}</TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <p className="font-medium">
                {member.name}
                {isCurrentUser && ' (You)'}
              </p>
              <p className="text-xs text-gray-400">
                {member.isRecipient
                  ? 'Recipient this round'
                  : member.hasContributed
                  ? 'Paid'
                  : 'Payment pending'}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className={cn('flex items-center', className)}>
      {displayMembers.map((member, index) => (
        <MemberAvatar key={member.id} member={member} index={index} />
      ))}

      {remainingCount > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-xs font-medium ring-2 ring-white',
            classes.avatar,
            classes.overlap
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

// Expanded list version for showing all members with status
interface MemberContributionListProps {
  members: Member[];
  currentUserEmail?: string;
  contributionAmount: number;
  className?: string;
}

export function MemberContributionList({
  members,
  currentUserEmail,
  contributionAmount,
  className,
}: MemberContributionListProps) {
  const sortedMembers = [...members].sort((a, b) => a.position - b.position);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const contributedCount = members.filter((m) => m.hasContributed).length;
  const progress = (contributedCount / members.length) * 100;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress summary */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Contribution Progress</span>
        <span className="font-medium">
          {contributedCount}/{members.length} members ({formatCurrency(contributedCount * contributionAmount)})
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Member list */}
      <div className="space-y-2">
        {sortedMembers.map((member) => {
          const isCurrentUser = member.email === currentUserEmail;

          return (
            <div
              key={member.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg',
                isCurrentUser ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback
                      className={cn(
                        'text-xs',
                        member.hasContributed
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      )}
                    >
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  {member.isRecipient && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center ring-2 ring-white">
                      <Award className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>

                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {member.name}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        You
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    Position {member.position}
                    {member.isRecipient && ' • Receiving this round'}
                  </p>
                </div>
              </div>

              <div>
                {member.hasContributed ? (
                  <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                    <Check className="w-4 h-4" />
                    Paid
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-600 text-sm">
                    <Clock className="w-4 h-4" />
                    Pending
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
