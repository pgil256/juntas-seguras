// app/notifications/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Bell as BellIcon,
  Filter,
  ChevronDown,
  MoreHorizontal,
  X,
  Trash2,
  Mail,
  CheckCircle2,
  Bell,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import { Label } from "../../components/ui/label";
import { useNotifications } from "../../contexts/NotificationContext";
import { NotificationIcon } from "../../components/notifications/NotificationIcon";
import { NotificationType } from "../../types/notification";
import { useCreateNotification } from "../../lib/hooks/useCreateNotification";
import { NoNotificationsEmptyState, NoSearchResultsEmptyState } from "../../components/ui/empty-state";

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

export default function NotificationsPage() {
  const {
    notifications,
    preferences,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    togglePreference,
    savePreferences,
    getNotifications,
  } = useNotifications();
  
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isAllEmailEnabled, setIsAllEmailEnabled] = useState(true);
  const [isAllPushEnabled, setIsAllPushEnabled] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  
  // For the test notification creation
  const { createNotification, isCreating } = useCreateNotification();
  const [testMessage, setTestMessage] = useState("");
  const [testType, setTestType] = useState<NotificationType>("system");
  const [testImportant, setTestImportant] = useState(false);

  // Refresh notifications when the page loads
  useEffect(() => {
    getNotifications();
  }, [getNotifications]);

  // Check if all email or push notifications are enabled
  useEffect(() => {
    if (preferences.length > 0) {
      setIsAllEmailEnabled(preferences.every(pref => pref.email));
      setIsAllPushEnabled(preferences.every(pref => pref.push));
    }
  }, [preferences]);

  // Toggle all email notifications
  const toggleAllEmail = () => {
    const newValue = !isAllEmailEnabled;
    setIsAllEmailEnabled(newValue);
    preferences.forEach(pref => {
      if (pref.email !== newValue) {
        togglePreference(pref.id, "email");
      }
    });
  };

  // Toggle all push notifications
  const toggleAllPush = () => {
    const newValue = !isAllPushEnabled;
    setIsAllPushEnabled(newValue);
    preferences.forEach(pref => {
      if (pref.push !== newValue) {
        togglePreference(pref.id, "push");
      }
    });
  };

  // Handle saving preferences
  const handleSavePreferences = async () => {
    const success = await savePreferences();
    if (success) {
      setSaveStatus("Preferences saved successfully!");
      setTimeout(() => setSaveStatus(null), 3000);
    } else {
      setSaveStatus("Error saving preferences. Please try again.");
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // Create a test notification
  const handleCreateTestNotification = async () => {
    if (!testMessage) return;
    
    const success = await createNotification({
      message: testMessage,
      type: testType,
      isImportant: testImportant
    });
    
    if (success) {
      setTestMessage("");
      getNotifications(); // Refresh notifications
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      const now = new Date();
      const diffHours = Math.abs(now.getTime() - date.getTime()) / 36e5;
      
      if (diffHours < 24) {
        // Today
        return format(date, "h:mm a");
      } else if (diffHours < 48) {
        // Yesterday
        return "Yesterday";
      } else if (diffHours < 168) {
        // Less than a week ago
        return format(date, "EEEE"); // Day name
      } else {
        // More than a week ago
        return format(date, "MMM d"); // Month and day
      }
    } catch (error) {
      return dateString;
    }
  };

  // Filter notifications by category
  const filteredNotifications =
    selectedCategory === "all"
      ? notifications
      : notifications.filter(
          (notification) => notification.type === selectedCategory
        );

  return (
    <div className="min-h-screen bg-gray-50">
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
            <TabsTrigger value="test">Test</TabsTrigger>
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
                  selectedCategory === "all" ? (
                    <NoNotificationsEmptyState />
                  ) : (
                    <NoSearchResultsEmptyState
                      query={selectedCategory}
                      onClear={() => setSelectedCategory("all")}
                    />
                  )
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
                          <NotificationIcon type={notification.type as NotificationType} />
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
                    <Switch 
                      id="email-all" 
                      checked={isAllEmailEnabled}
                      onCheckedChange={toggleAllEmail}
                    />
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
                    <Switch 
                      id="push-all" 
                      checked={isAllPushEnabled}
                      onCheckedChange={toggleAllPush}
                    />
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

                  <div className="mt-6 flex items-center">
                    <Button onClick={handleSavePreferences}>Save Preferences</Button>
                    {saveStatus && (
                      <span className={`ml-4 text-sm ${saveStatus.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
                        {saveStatus}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="test">
            <Card>
              <CardHeader>
                <CardTitle>Test Notifications</CardTitle>
                <CardDescription>
                  Create test notifications to see how they appear
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="message" className="block mb-1">Notification Message</Label>
                    <textarea 
                      id="message"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      rows={3}
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      placeholder="Enter your notification message"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="type" className="block mb-1">Notification Type</Label>
                    <select
                      id="type"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={testType}
                      onChange={(e) => setTestType(e.target.value as NotificationType)}
                    >
                      <option value="payment">Payment</option>
                      <option value="transaction">Transaction</option>
                      <option value="pool">Pool</option>
                      <option value="invite">Invitation</option>
                      <option value="alert">Alert</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <Switch
                      id="important"
                      checked={testImportant}
                      onCheckedChange={() => setTestImportant(!testImportant)}
                    />
                    <Label htmlFor="important" className="ml-2">
                      Mark as important
                    </Label>
                  </div>
                  
                  <Button 
                    onClick={handleCreateTestNotification}
                    disabled={isCreating || !testMessage}
                    className="mt-2"
                  >
                    {isCreating ? 'Creating...' : 'Create Test Notification'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
