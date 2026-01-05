// components/activity/ActivityFeed.tsx
"use client";

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  DollarSign,
  Users,
  MessageSquare,
  Trophy,
  Bell,
  Calendar,
  CreditCard,
  UserPlus,
  UserMinus,
  CheckCircle,
  AlertCircle,
  Clock,
  Filter,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { cn } from "../../lib/utils";

// Activity types that can appear in the feed
export type ActivityType =
  | "contribution"
  | "payout"
  | "member_joined"
  | "member_left"
  | "message"
  | "reminder"
  | "round_started"
  | "round_completed"
  | "payment_confirmed"
  | "payment_overdue"
  | "pool_created"
  | "pool_updated"
  | "mention";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
  poolId?: string;
  poolName?: string;
  metadata?: {
    amount?: number;
    round?: number;
    memberId?: string;
    memberName?: string;
    mentionedUsers?: string[];
    [key: string]: unknown;
  };
  read?: boolean;
}

interface ActivityFeedProps {
  activities?: ActivityItem[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  showFilters?: boolean;
  showHeader?: boolean;
  maxHeight?: string;
  poolId?: string; // Filter by pool
  className?: string;
  emptyMessage?: string;
  onActivityClick?: (activity: ActivityItem) => void;
}

// Get icon for each activity type
const getActivityIcon = (type: ActivityType) => {
  const iconMap: Record<ActivityType, React.ReactNode> = {
    contribution: <DollarSign className="h-4 w-4 text-green-600" />,
    payout: <Trophy className="h-4 w-4 text-purple-600" />,
    member_joined: <UserPlus className="h-4 w-4 text-blue-600" />,
    member_left: <UserMinus className="h-4 w-4 text-gray-600" />,
    message: <MessageSquare className="h-4 w-4 text-blue-500" />,
    reminder: <Bell className="h-4 w-4 text-amber-600" />,
    round_started: <Calendar className="h-4 w-4 text-indigo-600" />,
    round_completed: <CheckCircle className="h-4 w-4 text-green-600" />,
    payment_confirmed: <CreditCard className="h-4 w-4 text-green-500" />,
    payment_overdue: <AlertCircle className="h-4 w-4 text-red-600" />,
    pool_created: <Users className="h-4 w-4 text-blue-600" />,
    pool_updated: <Clock className="h-4 w-4 text-gray-600" />,
    mention: <MessageSquare className="h-4 w-4 text-purple-500" />,
  };
  return iconMap[type] || <Bell className="h-4 w-4 text-gray-500" />;
};

// Get background color for activity icon container
const getIconBackground = (type: ActivityType) => {
  const bgMap: Record<ActivityType, string> = {
    contribution: "bg-green-100",
    payout: "bg-purple-100",
    member_joined: "bg-blue-100",
    member_left: "bg-gray-100",
    message: "bg-blue-50",
    reminder: "bg-amber-100",
    round_started: "bg-indigo-100",
    round_completed: "bg-green-100",
    payment_confirmed: "bg-green-50",
    payment_overdue: "bg-red-100",
    pool_created: "bg-blue-100",
    pool_updated: "bg-gray-100",
    mention: "bg-purple-100",
  };
  return bgMap[type] || "bg-gray-100";
};

// Get user initials from name
const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// Format timestamp for display
const formatTimestamp = (timestamp: string) => {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return timestamp;
  }
};

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

// Single activity item component
const ActivityItemComponent = React.memo(
  ({
    activity,
    onClick,
  }: {
    activity: ActivityItem;
    onClick?: (activity: ActivityItem) => void;
  }) => {
    const handleClick = () => {
      onClick?.(activity);
    };

    return (
      <div
        className={cn(
          "flex gap-3 p-3 rounded-lg transition-colors",
          !activity.read && "bg-blue-50/50",
          onClick && "cursor-pointer hover:bg-gray-50"
        )}
        onClick={handleClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleClick();
                }
              }
            : undefined
        }
      >
        {/* Icon or Avatar */}
        <div className="flex-shrink-0">
          {activity.user ? (
            <Avatar className="h-10 w-10">
              <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
              <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                {getInitials(activity.user.name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center",
                getIconBackground(activity.type)
              )}
            >
              {getActivityIcon(activity.type)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {activity.title}
              </p>
              {activity.description && (
                <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                  {activity.description}
                </p>
              )}
              {activity.metadata?.amount !== undefined && (
                <p className="text-sm font-semibold text-green-600 mt-1">
                  {formatCurrency(activity.metadata.amount)}
                </p>
              )}
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
              {/* Activity type icon (when user avatar is shown) */}
              {activity.user && (
                <div
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center",
                    getIconBackground(activity.type)
                  )}
                >
                  {getActivityIcon(activity.type)}
                </div>
              )}
            </div>
          </div>

          {/* Footer with timestamp and pool name */}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-gray-500">
              {formatTimestamp(activity.timestamp)}
            </span>
            {activity.poolName && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500 truncate">
                  {activity.poolName}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ActivityItemComponent.displayName = "ActivityItemComponent";

export function ActivityFeed({
  activities = [],
  isLoading = false,
  error = null,
  onRefresh,
  onLoadMore,
  hasMore = false,
  showFilters = true,
  showHeader = true,
  maxHeight = "600px",
  poolId,
  className,
  emptyMessage = "No activity to show",
  onActivityClick,
}: ActivityFeedProps) {
  const [filter, setFilter] = useState<ActivityType | "all">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter activities based on selected filter
  const filteredActivities = React.useMemo(() => {
    if (filter === "all") return activities;
    return activities.filter((activity) => activity.type === filter);
  }, [activities, filter]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  // Filter options
  const filterOptions: { value: ActivityType | "all"; label: string }[] = [
    { value: "all", label: "All Activity" },
    { value: "contribution", label: "Contributions" },
    { value: "payout", label: "Payouts" },
    { value: "payment_confirmed", label: "Payments" },
    { value: "member_joined", label: "Member Changes" },
    { value: "message", label: "Messages" },
    { value: "reminder", label: "Reminders" },
  ];

  return (
    <Card className={cn("overflow-hidden", className)}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Activity Feed
            </CardTitle>
            <div className="flex items-center gap-2">
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="h-8 w-8 p-0"
                  aria-label="Refresh activity feed"
                >
                  <RefreshCw
                    className={cn(
                      "h-4 w-4",
                      isRefreshing && "animate-spin"
                    )}
                  />
                </Button>
              )}
              {showFilters && (
                <Select
                  value={filter}
                  onValueChange={(value) =>
                    setFilter(value as ActivityType | "all")
                  }
                >
                  <SelectTrigger className="h-8 w-[140px]">
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0">
        {/* Loading State */}
        {isLoading && !isRefreshing && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">
              Loading activity...
            </span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
            <p className="text-sm text-gray-600 text-center">{error}</p>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="mt-3"
              >
                Try Again
              </Button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredActivities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Bell className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 text-center">{emptyMessage}</p>
            {filter !== "all" && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setFilter("all")}
                className="mt-2"
              >
                Show all activity
              </Button>
            )}
          </div>
        )}

        {/* Activity List */}
        {!isLoading && !error && filteredActivities.length > 0 && (
          <div
            className="divide-y divide-gray-100 overflow-y-auto px-3"
            style={{ maxHeight }}
          >
            {filteredActivities.map((activity) => (
              <ActivityItemComponent
                key={activity.id}
                activity={activity}
                onClick={onActivityClick}
              />
            ))}

            {/* Load More Button */}
            {hasMore && onLoadMore && (
              <div className="p-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLoadMore}
                  className="w-full"
                >
                  Load More Activity
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ActivityFeed;
