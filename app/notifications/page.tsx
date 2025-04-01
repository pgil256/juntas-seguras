// app/notifications/page.tsx
"use client";

import { useState } from "react";
import {
  Bell,
  CheckCircle2,
  Filter,
  ChevronDown,
  MoreHorizontal,
  X,
  Trash2,
  Mail,
  Bell as BellIcon,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Sample notification data
const sampleNotifications = [
  {
    id: 1,
    message: "Your next payment for Family Savings Pool is due tomorrow",
    type: "payment",
    date: "2025-03-08T00:00:00Z",
    read: false,
    isImportant: true,
  },
  {
    id: 2,
    message: "Maria Rodriguez made a deposit of $50",
    type: "transaction",
    date: "2025-03-07T15:30:00Z",
    read: false,
    isImportant: false,
  },
  {
    id: 3,
    message: "Carlos Mendez has received the payout of $400",
    type: "transaction",
    date: "2025-03-07T10:45:00Z",
    read: false,
    isImportant: false,
  },
  {
    id: 4,
    message: "Pool cycle #4 has started",
    type: "pool",
    date: "2025-03-05T08:00:00Z",
    read: true,
    isImportant: false,
  },
  {
    id: 5,
    message: "Sofia Torres missed a payment. Reminder sent.",
    type: "alert",
    date: "2025-03-04T16:20:00Z",
    read: true,
    isImportant: true,
  },
  {
    id: 6,
    message: "You've been invited to join Vacation Fund pool",
    type: "invite",
    date: "2025-03-02T09:15:00Z",
    read: true,
    isImportant: false,
  },
  {
    id: 7,
    message: "Your account has been successfully verified",
    type: "system",
    date: "2025-02-28T14:30:00Z",
    read: true,
    isImportant: false,
  },
  {
    id: 8,
    message: "Family Savings Pool: Next payout is scheduled for March 15",
    type: "pool",
    date: "2025-02-25T11:45:00Z",
    read: true,
    isImportant: false,
  },
];

// Notification categories for filtering
const categories = [
  { value: "all", label: "All" },
  { value: "payment", label: "Payments" },
  { value: "transaction", label: "Transactions" },
  { value: "pool", label: "Pool Updates" },
  { value: "invite", label: "Invitations" },
  { value: "alert", label: "Alerts" },
  { value: "system", label: "System" },
];

// Notification preferences for settings tab
const notificationPreferences = [
  {
    id: "email_payment",
    label: "Payment Reminders",
    description: "Get notified before payments are due",
    email: true,
    push: true,
  },
  {
    id: "email_transaction",
    label: "Transactions",
    description: "When members make deposits or receive payouts",
    email: true,
    push: true,
  },
  {
    id: "email_pool",
    label: "Pool Updates",
    description: "Changes to pool status or information",
    email: false,
    push: true,
  },
  {
    id: "email_invite",
    label: "New Invitations",
    description: "When you're invited to join a pool",
    email: true,
    push: true,
  },
  {
    id: "email_missed",
    label: "Missed Payments",
    description: "When a member misses a scheduled payment",
    email: true,
    push: true,
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(sampleNotifications);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [preferences, setPreferences] = useState(notificationPreferences);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Today
      return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      }).format(date);
    } else if (diffDays === 1) {
      // Yesterday
      return "Yesterday";
    } else if (diffDays < 7) {
      // Less than a week ago
      return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
    } else {
      // More than a week ago
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(date);
    }
  };

  // Mark a notification as read
  const markAsRead = (id: number) => {
    setNotifications(
      notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(
      notifications.map((notification) => ({ ...notification, read: true }))
    );
  };

  // Delete a notification
  const deleteNotification = (id: number) => {
    setNotifications(
      notifications.filter((notification) => notification.id !== id)
    );
  };

  // Filter notifications by category
  const filteredNotifications =
    selectedCategory === "all"
      ? notifications
      : notifications.filter(
          (notification) => notification.type === selectedCategory
        );

  // Toggle notification preference
  const togglePreference = (id: string, type: "email" | "push") => {
    setPreferences(
      preferences.map((pref) =>
        pref.id === id
          ? { ...pref, [type]: !pref[type as keyof typeof pref] }
          : pref
      )
    );
  };

  // Get icon for notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "payment":
        return (
          <div className="rounded-full bg-blue-100 p-2">
            <Bell className="h-5 w-5 text-blue-600" />
          </div>
        );
      case "transaction":
        return (
          <div className="rounded-full bg-green-100 p-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
        );
      case "pool":
        return (
          <div className="rounded-full bg-purple-100 p-2">
            <Users className="h-5 w-5 text-purple-600" />
          </div>
        );
      case "invite":
        return (
          <div className="rounded-full bg-yellow-100 p-2">
            <UserPlus className="h-5 w-5 text-yellow-600" />
          </div>
        );
      case "alert":
        return (
          <div className="rounded-full bg-red-100 p-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
        );
      case "system":
        return (
          <div className="rounded-full bg-gray-100 p-2">
            <Settings className="h-5 w-5 text-gray-600" />
          </div>
        );
      default:
        return (
          <div className="rounded-full bg-gray-100 p-2">
            <Bell className="h-5 w-5 text-gray-600" />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-4 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">
                Notifications
              </h2>
              <p className="mt-1 text-gray-500">
                Stay updated on your pool activity
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {categories.map((category) => (
                    <DropdownMenuItem
                      key={category.value}
                      onClick={() => setSelectedCategory(category.value)}
                      className={
                        selectedCategory === category.value ? "bg-gray-100" : ""
                      }
                    >
                      {category.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" onClick={markAllAsRead}>
                Mark all as read
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="notifications" className="mt-6">
          <TabsList>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Recent Notifications</CardTitle>
                <CardDescription>
                  {selectedCategory === "all"
                    ? "All notifications"
                    : `Filtered by: ${selectedCategory}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-8">
                    <BellIcon className="h-12 w-12 text-gray-300 mx-auto" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      No notifications
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {selectedCategory === "all"
                        ? "You don't have any notifications yet"
                        : `You don't have any ${selectedCategory} notifications`}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`py-4 flex items-start ${
                          notification.read ? "" : "bg-blue-50"
                        }`}
                      >
                        <div className="flex-shrink-0 mr-4">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between">
                            <p
                              className={`text-sm ${
                                notification.read
                                  ? "text-gray-800"
                                  : "text-gray-900 font-medium"
                              }`}
                            >
                              {notification.message}
                            </p>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">
                                {formatDate(notification.date)}
                              </span>
                              {notification.isImportant && (
                                <Badge
                                  variant="outline"
                                  className="bg-red-50 text-red-600 border-red-200"
                                >
                                  Important
                                </Badge>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {!notification.read && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        markAsRead(notification.id)
                                      }
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-2" />
                                      Mark as read
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() =>
                                      deleteNotification(notification.id)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how and when you want to be notified
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Email Notifications
                      </h3>
                      <p className="text-sm text-gray-500">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch id="email-all" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Push Notifications
                      </h3>
                      <p className="text-sm text-gray-500">
                        Receive notifications in your browser and mobile
                      </p>
                    </div>
                    <Switch id="push-all" />
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Notification Settings
                    </h3>

                    <div className="divide-y divide-gray-200">
                      {preferences.map((pref) => (
                        <div key={pref.id} className="py-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">
                                {pref.label}
                              </h4>
                              <p className="text-xs text-gray-500">
                                {pref.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-6 mt-2">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`${pref.id}-email`}
                                checked={pref.email}
                                onCheckedChange={() =>
                                  togglePreference(pref.id, "email")
                                }
                              />
                              <Label
                                htmlFor={`${pref.id}-email`}
                                className="text-sm"
                              >
                                <Mail className="h-4 w-4 inline mr-1" /> Email
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`${pref.id}-push`}
                                checked={pref.push}
                                onCheckedChange={() =>
                                  togglePreference(pref.id, "push")
                                }
                              />
                              <Label
                                htmlFor={`${pref.id}-push`}
                                className="text-sm"
                              >
                                <Bell className="h-4 w-4 inline mr-1" /> Push
                              </Label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6">
                    <Button>Save Preferences</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Missing components
const Users = ({ className }: { className?: string }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
};

const UserPlus = ({ className }: { className?: string }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
      />
    </svg>
  );
};

const AlertCircle = ({ className }: { className?: string }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
};

const Settings = ({ className }: { className?: string }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
};
