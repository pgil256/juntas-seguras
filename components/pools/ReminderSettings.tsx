// components/pools/ReminderSettings.tsx
"use client";

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import {
  Bell,
  Clock,
  Calendar,
  Mail,
  MessageSquare,
  AlertTriangle,
  Plus,
  Trash2,
  Settings,
  Save,
  Loader2,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../ui/card";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { cn } from "../../lib/utils";

// Types for reminder configuration
export type ReminderChannel = "email" | "push" | "sms" | "in_app";
export type ReminderTiming = "before" | "on" | "after";
export type ReminderRecipient = "all" | "unpaid" | "specific";

export interface ReminderSchedule {
  id: string;
  enabled: boolean;
  timing: ReminderTiming;
  days: number; // Days before/after due date (0 = on due date)
  time: string; // HH:MM format for scheduled time
  channels: ReminderChannel[];
  recipients: ReminderRecipient;
  customMessage?: string;
}

export interface PoolReminderSettings {
  // Global settings
  remindersEnabled: boolean;
  defaultChannels: ReminderChannel[];

  // Payment reminder schedules
  paymentReminders: ReminderSchedule[];

  // Overdue payment settings
  overdueRemindersEnabled: boolean;
  overdueReminderInterval: number; // Days between overdue reminders
  maxOverdueReminders: number; // Maximum overdue reminders to send
  escalateToAdmin: boolean;
  escalateAfterDays: number;

  // Round reminders
  roundStartReminder: boolean;
  roundStartReminderDays: number; // Days before round starts
  roundEndReminder: boolean;
  roundEndReminderDays: number; // Days before round ends

  // Payout notifications
  payoutNotification: boolean;
  payoutReminderDays: number; // Days before payout to remind

  // Custom message templates
  customTemplates: {
    paymentReminder?: string;
    overdueReminder?: string;
    roundStart?: string;
    payoutNotification?: string;
  };
}

interface ReminderSettingsProps {
  poolId: string;
  settings?: Partial<PoolReminderSettings>;
  isLoading?: boolean;
  isSaving?: boolean;
  error?: string | null;
  onSave?: (settings: PoolReminderSettings) => Promise<void> | void;
  className?: string;
}

// Default settings
const defaultSettings: PoolReminderSettings = {
  remindersEnabled: true,
  defaultChannels: ["email", "push"],
  paymentReminders: [
    {
      id: "reminder-1",
      enabled: true,
      timing: "before",
      days: 3,
      time: "09:00",
      channels: ["email", "push"],
      recipients: "all",
    },
    {
      id: "reminder-2",
      enabled: true,
      timing: "before",
      days: 1,
      time: "09:00",
      channels: ["email", "push"],
      recipients: "unpaid",
    },
    {
      id: "reminder-3",
      enabled: true,
      timing: "on",
      days: 0,
      time: "10:00",
      channels: ["email", "push"],
      recipients: "unpaid",
    },
  ],
  overdueRemindersEnabled: true,
  overdueReminderInterval: 2,
  maxOverdueReminders: 5,
  escalateToAdmin: true,
  escalateAfterDays: 7,
  roundStartReminder: true,
  roundStartReminderDays: 1,
  roundEndReminder: true,
  roundEndReminderDays: 1,
  payoutNotification: true,
  payoutReminderDays: 1,
  customTemplates: {},
};

// Channel icon component
const ChannelIcon = ({
  channel,
  active,
}: {
  channel: ReminderChannel;
  active: boolean;
}) => {
  const icons: Record<ReminderChannel, React.ReactNode> = {
    email: <Mail className="h-4 w-4" />,
    push: <Bell className="h-4 w-4" />,
    sms: <MessageSquare className="h-4 w-4" />,
    in_app: <Bell className="h-4 w-4" />,
  };

  return (
    <span className={cn(active ? "text-blue-600" : "text-gray-400")}>
      {icons[channel]}
    </span>
  );
};

// Channel selector component
const ChannelSelector = ({
  selected,
  onChange,
  disabled,
}: {
  selected: ReminderChannel[];
  onChange: (channels: ReminderChannel[]) => void;
  disabled?: boolean;
}) => {
  const channels: { id: ReminderChannel; label: string }[] = [
    { id: "email", label: "Email" },
    { id: "push", label: "Push" },
    { id: "sms", label: "SMS" },
  ];

  const toggleChannel = (channel: ReminderChannel) => {
    if (selected.includes(channel)) {
      onChange(selected.filter((c) => c !== channel));
    } else {
      onChange([...selected, channel]);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {channels.map((channel) => (
        <button
          key={channel.id}
          type="button"
          onClick={() => toggleChannel(channel.id)}
          disabled={disabled}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors",
            selected.includes(channel.id)
              ? "bg-blue-100 text-blue-700 border border-blue-200"
              : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <ChannelIcon channel={channel.id} active={selected.includes(channel.id)} />
          {channel.label}
        </button>
      ))}
    </div>
  );
};

// Reminder schedule row component
const ReminderScheduleRow = ({
  schedule,
  onChange,
  onDelete,
  disabled,
}: {
  schedule: ReminderSchedule;
  onChange: (schedule: ReminderSchedule) => void;
  onDelete: () => void;
  disabled?: boolean;
}) => {
  const timingLabel = () => {
    if (schedule.timing === "on") return "On due date";
    if (schedule.timing === "before")
      return `${schedule.days} day${schedule.days !== 1 ? "s" : ""} before`;
    return `${schedule.days} day${schedule.days !== 1 ? "s" : ""} after`;
  };

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border",
        schedule.enabled ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100"
      )}
    >
      {/* Enable toggle */}
      <div className="flex items-center gap-2">
        <Switch
          checked={schedule.enabled}
          onCheckedChange={(v) => onChange({ ...schedule, enabled: v })}
          disabled={disabled}
        />
        <span
          className={cn(
            "text-sm font-medium",
            schedule.enabled ? "text-gray-900" : "text-gray-500"
          )}
        >
          {timingLabel()}
        </span>
      </div>

      {/* Timing controls */}
      <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
        <Select
          value={schedule.timing}
          onValueChange={(v) =>
            onChange({ ...schedule, timing: v as ReminderTiming })
          }
          disabled={disabled || !schedule.enabled}
        >
          <SelectTrigger className="w-24 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="before">Before</SelectItem>
            <SelectItem value="on">On</SelectItem>
            <SelectItem value="after">After</SelectItem>
          </SelectContent>
        </Select>

        {schedule.timing !== "on" && (
          <Input
            type="number"
            min={1}
            max={30}
            value={schedule.days}
            onChange={(e) =>
              onChange({ ...schedule, days: parseInt(e.target.value) || 1 })
            }
            disabled={disabled || !schedule.enabled}
            className="w-16 h-8 text-xs"
          />
        )}

        <span className="text-xs text-gray-500">at</span>

        <Input
          type="time"
          value={schedule.time}
          onChange={(e) => onChange({ ...schedule, time: e.target.value })}
          disabled={disabled || !schedule.enabled}
          className="w-24 h-8 text-xs"
        />

        {/* Recipients */}
        <Select
          value={schedule.recipients}
          onValueChange={(v) =>
            onChange({ ...schedule, recipients: v as ReminderRecipient })
          }
          disabled={disabled || !schedule.enabled}
        >
          <SelectTrigger className="w-24 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>

        {/* Delete button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={disabled}
          className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Channel selector */}
      <div className="sm:hidden">
        <ChannelSelector
          selected={schedule.channels}
          onChange={(channels) => onChange({ ...schedule, channels })}
          disabled={disabled || !schedule.enabled}
        />
      </div>
    </div>
  );
};

export function ReminderSettings({
  poolId,
  settings: initialSettings,
  isLoading = false,
  isSaving = false,
  error = null,
  onSave,
  className,
}: ReminderSettingsProps) {
  const [settings, setSettings] = useState<PoolReminderSettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "payment-reminders",
  ]);

  // Initialize settings
  useEffect(() => {
    if (initialSettings) {
      setSettings({ ...defaultSettings, ...initialSettings });
    }
  }, [initialSettings]);

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  }, []);

  // Update settings helper
  const updateSettings = useCallback(
    <K extends keyof PoolReminderSettings>(
      key: K,
      value: PoolReminderSettings[K]
    ) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      setHasChanges(true);
      setSaveSuccess(false);
    },
    []
  );

  // Add new payment reminder
  const addPaymentReminder = useCallback(() => {
    const newReminder: ReminderSchedule = {
      id: `reminder-${Date.now()}`,
      enabled: true,
      timing: "before",
      days: 1,
      time: "09:00",
      channels: settings.defaultChannels,
      recipients: "all",
    };
    updateSettings("paymentReminders", [...settings.paymentReminders, newReminder]);
  }, [settings.defaultChannels, settings.paymentReminders, updateSettings]);

  // Update payment reminder
  const updatePaymentReminder = useCallback(
    (id: string, updatedReminder: ReminderSchedule) => {
      updateSettings(
        "paymentReminders",
        settings.paymentReminders.map((r) =>
          r.id === id ? updatedReminder : r
        )
      );
    },
    [settings.paymentReminders, updateSettings]
  );

  // Delete payment reminder
  const deletePaymentReminder = useCallback(
    (id: string) => {
      updateSettings(
        "paymentReminders",
        settings.paymentReminders.filter((r) => r.id !== id)
      );
    },
    [settings.paymentReminders, updateSettings]
  );

  // Handle save
  const handleSave = useCallback(async () => {
    if (!onSave) return;

    try {
      await onSave(settings);
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      // Error handling by parent
    }
  }, [onSave, settings]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading reminder settings...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Master Toggle */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Pool Reminders</CardTitle>
                <CardDescription className="text-sm">
                  Configure automated reminders for this pool
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.remindersEnabled}
              onCheckedChange={(v) => updateSettings("remindersEnabled", v)}
            />
          </div>
        </CardHeader>
      </Card>

      {settings.remindersEnabled && (
        <>
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Payment Reminders Section */}
          <Collapsible
            open={expandedSections.includes("payment-reminders")}
            onOpenChange={() => toggleSection("payment-reminders")}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          Payment Reminders
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {settings.paymentReminders.length} scheduled reminder
                          {settings.paymentReminders.length !== 1 ? "s" : ""}
                        </CardDescription>
                      </div>
                    </div>
                    {expandedSections.includes("payment-reminders") ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  {settings.paymentReminders.map((reminder) => (
                    <ReminderScheduleRow
                      key={reminder.id}
                      schedule={reminder}
                      onChange={(updated) =>
                        updatePaymentReminder(reminder.id, updated)
                      }
                      onDelete={() => deletePaymentReminder(reminder.id)}
                    />
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addPaymentReminder}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Reminder
                  </Button>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Overdue Settings Section */}
          <Collapsible
            open={expandedSections.includes("overdue")}
            onOpenChange={() => toggleSection("overdue")}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          Overdue Reminders
                        </CardTitle>
                        <CardDescription className="text-sm">
                          Reminders for late payments
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={settings.overdueRemindersEnabled}
                        onCheckedChange={(v) =>
                          updateSettings("overdueRemindersEnabled", v)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                      {expandedSections.includes("overdue") ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="overdue-interval">
                        Reminder Interval (days)
                      </Label>
                      <Input
                        id="overdue-interval"
                        type="number"
                        min={1}
                        max={14}
                        value={settings.overdueReminderInterval}
                        onChange={(e) =>
                          updateSettings(
                            "overdueReminderInterval",
                            parseInt(e.target.value) || 2
                          )
                        }
                        disabled={!settings.overdueRemindersEnabled}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Days between overdue reminders
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="max-overdue">Maximum Reminders</Label>
                      <Input
                        id="max-overdue"
                        type="number"
                        min={1}
                        max={10}
                        value={settings.maxOverdueReminders}
                        onChange={(e) =>
                          updateSettings(
                            "maxOverdueReminders",
                            parseInt(e.target.value) || 5
                          )
                        }
                        disabled={!settings.overdueRemindersEnabled}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Maximum number of overdue reminders
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <Label>Escalate to Admin</Label>
                      <p className="text-xs text-gray-500">
                        Notify pool admin about persistent overdue payments
                      </p>
                    </div>
                    <Switch
                      checked={settings.escalateToAdmin}
                      onCheckedChange={(v) =>
                        updateSettings("escalateToAdmin", v)
                      }
                      disabled={!settings.overdueRemindersEnabled}
                    />
                  </div>

                  {settings.escalateToAdmin && (
                    <div>
                      <Label htmlFor="escalate-days">Escalate After (days)</Label>
                      <Input
                        id="escalate-days"
                        type="number"
                        min={1}
                        max={30}
                        value={settings.escalateAfterDays}
                        onChange={(e) =>
                          updateSettings(
                            "escalateAfterDays",
                            parseInt(e.target.value) || 7
                          )
                        }
                        disabled={!settings.overdueRemindersEnabled}
                        className="mt-1 w-32"
                      />
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Round & Payout Notifications */}
          <Collapsible
            open={expandedSections.includes("other")}
            onOpenChange={() => toggleSection("other")}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Clock className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          Round & Payout Notifications
                        </CardTitle>
                        <CardDescription className="text-sm">
                          Reminders for rounds and payouts
                        </CardDescription>
                      </div>
                    </div>
                    {expandedSections.includes("other") ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  {/* Round Start */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Round Start Reminder</Label>
                      <p className="text-xs text-gray-500">
                        Notify members when a new round begins
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={0}
                        max={7}
                        value={settings.roundStartReminderDays}
                        onChange={(e) =>
                          updateSettings(
                            "roundStartReminderDays",
                            parseInt(e.target.value) || 1
                          )
                        }
                        disabled={!settings.roundStartReminder}
                        className="w-16 h-8 text-xs"
                      />
                      <span className="text-xs text-gray-500">days before</span>
                      <Switch
                        checked={settings.roundStartReminder}
                        onCheckedChange={(v) =>
                          updateSettings("roundStartReminder", v)
                        }
                      />
                    </div>
                  </div>

                  {/* Round End */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <Label>Round End Reminder</Label>
                      <p className="text-xs text-gray-500">
                        Remind members before a round closes
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={0}
                        max={7}
                        value={settings.roundEndReminderDays}
                        onChange={(e) =>
                          updateSettings(
                            "roundEndReminderDays",
                            parseInt(e.target.value) || 1
                          )
                        }
                        disabled={!settings.roundEndReminder}
                        className="w-16 h-8 text-xs"
                      />
                      <span className="text-xs text-gray-500">days before</span>
                      <Switch
                        checked={settings.roundEndReminder}
                        onCheckedChange={(v) =>
                          updateSettings("roundEndReminder", v)
                        }
                      />
                    </div>
                  </div>

                  {/* Payout Notification */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <Label>Payout Reminder</Label>
                      <p className="text-xs text-gray-500">
                        Remind winners about upcoming payout
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={0}
                        max={7}
                        value={settings.payoutReminderDays}
                        onChange={(e) =>
                          updateSettings(
                            "payoutReminderDays",
                            parseInt(e.target.value) || 1
                          )
                        }
                        disabled={!settings.payoutNotification}
                        className="w-16 h-8 text-xs"
                      />
                      <span className="text-xs text-gray-500">days before</span>
                      <Switch
                        checked={settings.payoutNotification}
                        onCheckedChange={(v) =>
                          updateSettings("payoutNotification", v)
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Default Channels */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Settings className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Default Channels</CardTitle>
                  <CardDescription className="text-sm">
                    Default notification channels for new reminders
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ChannelSelector
                selected={settings.defaultChannels}
                onChange={(channels) => updateSettings("defaultChannels", channels)}
              />
            </CardContent>
          </Card>

          {/* Info note */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              Members can customize their own notification preferences. These
              settings define the default behavior and admin-initiated reminders.
            </p>
          </div>
        </>
      )}

      {/* Save Button */}
      {onSave && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="min-w-[120px]"
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
                Save Settings
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export default ReminderSettings;
