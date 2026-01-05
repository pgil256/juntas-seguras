// components/settings/NotificationPreferences.tsx
"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  DollarSign,
  Users,
  Calendar,
  AlertTriangle,
  Settings,
  Save,
  Loader2,
  CheckCircle,
  Info,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn } from "../../lib/utils";

// Types for notification preferences
export interface NotificationChannel {
  email: boolean;
  push: boolean;
  sms?: boolean;
}

export interface NotificationPreferencesData {
  // Payment-related notifications
  paymentReminders: NotificationChannel;
  paymentConfirmations: NotificationChannel;
  paymentOverdue: NotificationChannel;

  // Pool-related notifications
  poolUpdates: NotificationChannel;
  memberJoined: NotificationChannel;
  memberLeft: NotificationChannel;
  roundStarted: NotificationChannel;
  payoutReceived: NotificationChannel;

  // Social notifications
  mentions: NotificationChannel;
  directMessages: NotificationChannel;
  discussionReplies: NotificationChannel;

  // Admin notifications (only for pool admins)
  adminAlerts: NotificationChannel;

  // Digest settings
  digestFrequency: "realtime" | "daily" | "weekly" | "none";
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string; // HH:MM format

  // Marketing
  marketing: NotificationChannel;
}

interface NotificationPreferencesProps {
  preferences?: Partial<NotificationPreferencesData>;
  isLoading?: boolean;
  isSaving?: boolean;
  error?: string | null;
  onSave?: (preferences: NotificationPreferencesData) => Promise<void> | void;
  showAdminOptions?: boolean;
  className?: string;
}

// Default preferences
const defaultPreferences: NotificationPreferencesData = {
  paymentReminders: { email: true, push: true },
  paymentConfirmations: { email: true, push: true },
  paymentOverdue: { email: true, push: true },
  poolUpdates: { email: true, push: true },
  memberJoined: { email: false, push: true },
  memberLeft: { email: false, push: true },
  roundStarted: { email: true, push: true },
  payoutReceived: { email: true, push: true },
  mentions: { email: true, push: true },
  directMessages: { email: false, push: true },
  discussionReplies: { email: false, push: true },
  adminAlerts: { email: true, push: true },
  digestFrequency: "realtime",
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  marketing: { email: false, push: false },
};

// Notification category definition
interface NotificationCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  settings: {
    key: keyof NotificationPreferencesData;
    label: string;
    description: string;
    adminOnly?: boolean;
  }[];
}

const notificationCategories: NotificationCategory[] = [
  {
    id: "payments",
    title: "Payment Notifications",
    description: "Get notified about payments and contributions",
    icon: <DollarSign className="h-5 w-5 text-green-600" />,
    settings: [
      {
        key: "paymentReminders",
        label: "Payment Reminders",
        description: "Reminders before your contribution is due",
      },
      {
        key: "paymentConfirmations",
        label: "Payment Confirmations",
        description: "Confirmations when payments are processed",
      },
      {
        key: "paymentOverdue",
        label: "Overdue Alerts",
        description: "Alerts when payments become overdue",
      },
    ],
  },
  {
    id: "pool",
    title: "Pool Activity",
    description: "Updates about your savings pools",
    icon: <Users className="h-5 w-5 text-blue-600" />,
    settings: [
      {
        key: "poolUpdates",
        label: "Pool Updates",
        description: "General pool announcements and changes",
      },
      {
        key: "memberJoined",
        label: "New Members",
        description: "When someone joins a pool you're in",
      },
      {
        key: "memberLeft",
        label: "Member Departures",
        description: "When someone leaves a pool you're in",
      },
      {
        key: "roundStarted",
        label: "Round Started",
        description: "When a new contribution round begins",
      },
      {
        key: "payoutReceived",
        label: "Payout Received",
        description: "When you receive a payout",
      },
    ],
  },
  {
    id: "social",
    title: "Messages & Mentions",
    description: "Stay connected with pool members",
    icon: <MessageSquare className="h-5 w-5 text-purple-600" />,
    settings: [
      {
        key: "mentions",
        label: "Mentions",
        description: "When someone @mentions you",
      },
      {
        key: "directMessages",
        label: "Direct Messages",
        description: "Private messages from other members",
      },
      {
        key: "discussionReplies",
        label: "Discussion Replies",
        description: "Replies to your posts and comments",
      },
    ],
  },
  {
    id: "admin",
    title: "Admin Notifications",
    description: "Alerts for pool administrators",
    icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    settings: [
      {
        key: "adminAlerts",
        label: "Admin Alerts",
        description: "Important alerts requiring admin attention",
        adminOnly: true,
      },
    ],
  },
  {
    id: "marketing",
    title: "Marketing & Promotions",
    description: "News and promotional content",
    icon: <Bell className="h-5 w-5 text-gray-500" />,
    settings: [
      {
        key: "marketing",
        label: "Marketing Emails",
        description: "Product updates, tips, and promotions",
      },
    ],
  },
];

// Channel toggle component
const ChannelToggle = ({
  label,
  icon,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) => (
  <div className="flex items-center gap-2">
    {icon}
    <Switch
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label={`${label} notifications`}
    />
  </div>
);

export function NotificationPreferences({
  preferences: initialPreferences,
  isLoading = false,
  isSaving = false,
  error = null,
  onSave,
  showAdminOptions = false,
  className,
}: NotificationPreferencesProps) {
  const [preferences, setPreferences] =
    useState<NotificationPreferencesData>(defaultPreferences);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize preferences
  useEffect(() => {
    if (initialPreferences) {
      setPreferences({ ...defaultPreferences, ...initialPreferences });
    }
  }, [initialPreferences]);

  // Update a notification channel
  const updateChannel = useCallback(
    (
      key: keyof NotificationPreferencesData,
      channel: keyof NotificationChannel,
      value: boolean
    ) => {
      setPreferences((prev) => {
        const current = prev[key] as NotificationChannel;
        return {
          ...prev,
          [key]: { ...current, [channel]: value },
        };
      });
      setHasChanges(true);
      setSaveSuccess(false);
    },
    []
  );

  // Update a simple preference
  const updatePreference = useCallback(
    <K extends keyof NotificationPreferencesData>(
      key: K,
      value: NotificationPreferencesData[K]
    ) => {
      setPreferences((prev) => ({ ...prev, [key]: value }));
      setHasChanges(true);
      setSaveSuccess(false);
    },
    []
  );

  // Toggle all in a category
  const toggleCategoryAll = useCallback(
    (category: NotificationCategory, channel: keyof NotificationChannel, enabled: boolean) => {
      setPreferences((prev) => {
        const updates: Record<string, unknown> = {};
        for (const setting of category.settings) {
          if (setting.adminOnly && !showAdminOptions) continue;
          const current = prev[setting.key] as NotificationChannel;
          updates[setting.key] = { ...current, [channel]: enabled };
        }
        return { ...prev, ...updates } as NotificationPreferencesData;
      });
      setHasChanges(true);
      setSaveSuccess(false);
    },
    [showAdminOptions]
  );

  // Handle save
  const handleSave = useCallback(async () => {
    if (!onSave) return;

    try {
      await onSave(preferences);
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      // Error handling is done by parent
    }
  }, [onSave, preferences]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading preferences...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with save button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Notification Preferences
          </h2>
          <p className="text-sm text-gray-500">
            Control how and when you receive notifications
          </p>
        </div>
        {onSave && (
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="min-w-[100px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Notification Categories */}
      <TooltipProvider>
        {notificationCategories.map((category) => {
          // Skip admin category if not showing admin options
          if (
            category.id === "admin" &&
            !showAdminOptions
          ) {
            return null;
          }

          return (
            <Card key={category.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {category.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{category.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {category.description}
                      </CardDescription>
                    </div>
                  </div>
                  {/* Bulk toggles */}
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-gray-500 hidden sm:block">
                      Enable all:
                    </div>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => toggleCategoryAll(category, "email", true)}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                          >
                            <Mail className="h-4 w-4 text-gray-500" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Enable all email</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => toggleCategoryAll(category, "push", true)}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                          >
                            <Smartphone className="h-4 w-4 text-gray-500" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Enable all push</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-gray-100">
                  {category.settings.map((setting) => {
                    if (setting.adminOnly && !showAdminOptions) return null;

                    const channel = preferences[setting.key] as NotificationChannel;

                    return (
                      <div
                        key={setting.key}
                        className="flex items-center justify-between py-3"
                      >
                        <div className="min-w-0 pr-4">
                          <p className="text-sm font-medium text-gray-900">
                            {setting.label}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {setting.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <ChannelToggle
                            label={`${setting.label} email`}
                            icon={<Mail className="h-4 w-4 text-gray-400" />}
                            checked={channel.email}
                            onChange={(v) =>
                              updateChannel(setting.key, "email", v)
                            }
                          />
                          <ChannelToggle
                            label={`${setting.label} push`}
                            icon={<Smartphone className="h-4 w-4 text-gray-400" />}
                            checked={channel.push}
                            onChange={(v) =>
                              updateChannel(setting.key, "push", v)
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </TooltipProvider>

      {/* Digest & Quiet Hours Settings */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Settings className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <CardTitle className="text-base">Delivery Settings</CardTitle>
              <CardDescription className="text-sm">
                Control when and how often you receive notifications
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-6">
          {/* Digest Frequency */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="digest-frequency" className="text-sm font-medium">
                Notification Digest
              </Label>
              <p className="text-xs text-gray-500 mt-0.5">
                How often to receive email summaries
              </p>
            </div>
            <Select
              value={preferences.digestFrequency}
              onValueChange={(value) =>
                updatePreference(
                  "digestFrequency",
                  value as NotificationPreferencesData["digestFrequency"]
                )
              }
            >
              <SelectTrigger id="digest-frequency" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">Real-time</SelectItem>
                <SelectItem value="daily">Daily Digest</SelectItem>
                <SelectItem value="weekly">Weekly Digest</SelectItem>
                <SelectItem value="none">No Digest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quiet Hours */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label className="text-sm font-medium">Quiet Hours</Label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pause push notifications during certain hours
                </p>
              </div>
              <Switch
                checked={preferences.quietHoursEnabled}
                onCheckedChange={(v) => updatePreference("quietHoursEnabled", v)}
              />
            </div>

            {preferences.quietHoursEnabled && (
              <div className="flex items-center gap-4 pl-0 sm:pl-6">
                <div>
                  <Label htmlFor="quiet-start" className="text-xs text-gray-500">
                    Start
                  </Label>
                  <input
                    id="quiet-start"
                    type="time"
                    value={preferences.quietHoursStart}
                    onChange={(e) =>
                      updatePreference("quietHoursStart", e.target.value)
                    }
                    className="mt-1 block w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <span className="text-gray-400 pt-5">to</span>
                <div>
                  <Label htmlFor="quiet-end" className="text-xs text-gray-500">
                    End
                  </Label>
                  <input
                    id="quiet-end"
                    type="time"
                    value={preferences.quietHoursEnd}
                    onChange={(e) =>
                      updatePreference("quietHoursEnd", e.target.value)
                    }
                    className="mt-1 block w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info note */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p>
          Push notifications require browser permission. You'll be prompted to
          allow notifications when you enable push for the first time.
        </p>
      </div>
    </div>
  );
}

export default NotificationPreferences;
