// app/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Shield,
  Bell,
  Settings,
  Lock,
  Globe,
  LogOut,
  Save,
  Smartphone,
  Eye,
  EyeOff,
  ExternalLink,
  AlertTriangle,
  Trash2,
  Check,
  Wallet,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { useUserProfile } from "../../lib/hooks/useUserProfile";
import { useUserSettings } from "../../lib/hooks/useUserSettings";
import { formatDate } from "../../lib/utils";

interface NotificationPreferences {
  email: {
    paymentReminders: boolean;
    poolUpdates: boolean;
    memberActivity: boolean;
    marketing: boolean;
  };
  push: {
    paymentReminders: boolean;
    poolUpdates: boolean;
    memberActivity: boolean;
    marketing: boolean;
  };
}

type PayoutMethodType = 'venmo' | 'paypal' | 'zelle' | 'cashapp' | 'bank';

interface PayoutMethod {
  type: PayoutMethodType;
  handle: string;
  displayName?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Payout method state
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod | null>(null);
  const [payoutMethodLoading, setPayoutMethodLoading] = useState(true);
  const [editingPayoutMethod, setEditingPayoutMethod] = useState(false);
  const [payoutFormData, setPayoutFormData] = useState({
    type: '' as PayoutMethodType | '',
    handle: '',
    displayName: '',
  });
  const [savingPayoutMethod, setSavingPayoutMethod] = useState(false);

  // Get user profile data
  const { 
    profile: userProfile, 
    isLoading: profileLoading, 
    error: profileError,
    updateProfile
  } = useUserProfile();
  
  // Get user settings data
  const {
    settings: userSettings,
    isLoading: settingsLoading,
    error: settingsError,
    updateSettings
  } = useUserSettings();

  // Local state for form data
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
  });
  
  // Update local profile state when data is loaded
  useEffect(() => {
    if (userProfile) {
      setProfile({
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone || '',
      });
    }
  }, [userProfile]);

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  // Initialize notifications with null, to indicate loading state
  const [notifications, setNotifications] = useState<NotificationPreferences | null>(null);
  
  // Update notifications state when settings are loaded
  useEffect(() => {
    if (userSettings?.notificationPreferences) {
      setNotifications(userSettings.notificationPreferences);
    }
  }, [userSettings]);

  const [preferences, setPreferences] = useState({
    language: 'en',
    timezone: 'America/New_York',
  });
  
  // Update preferences state when settings are loaded
  useEffect(() => {
    if (userSettings) {
      setPreferences({
        language: userSettings.language || 'en',
        timezone: userSettings.timezone || 'America/New_York',
      });
    }
  }, [userSettings]);

  // Fetch payout method on mount
  useEffect(() => {
    const fetchPayoutMethod = async () => {
      try {
        const response = await fetch('/api/user/payout-method');
        const data = await response.json();
        if (response.ok && data.payoutMethod?.type) {
          setPayoutMethod(data.payoutMethod);
          setPayoutFormData({
            type: data.payoutMethod.type,
            handle: data.payoutMethod.handle || '',
            displayName: data.payoutMethod.displayName || '',
          });
        }
      } catch (error) {
        console.error('Error fetching payout method:', error);
      } finally {
        setPayoutMethodLoading(false);
      }
    };
    fetchPayoutMethod();
  }, []);

  // Handle saving payout method
  const handleSavePayoutMethod = async () => {
    if (!payoutFormData.type || !payoutFormData.handle.trim()) return;

    setSavingPayoutMethod(true);
    try {
      const response = await fetch('/api/user/payout-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: payoutFormData.type,
          handle: payoutFormData.handle.trim(),
          displayName: payoutFormData.displayName.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setPayoutMethod(data.payoutMethod);
        setEditingPayoutMethod(false);
      }
    } catch (error) {
      console.error('Error saving payout method:', error);
    } finally {
      setSavingPayoutMethod(false);
    }
  };

  // Get payout method label
  const getPayoutMethodLabel = (type: string) => {
    const labels: Record<string, string> = {
      venmo: 'Venmo',
      paypal: 'PayPal',
      zelle: 'Zelle',
      cashapp: 'Cash App',
      bank: 'Bank Transfer',
    };
    return labels[type] || type;
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile({
      ...profile,
      [name]: value,
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords({
      ...passwords,
      [name]: value,
    });
  };

  const handleNotificationToggle = (
    type: "email" | "push",
    setting: string
  ) => {
    if (!notifications) return;
    setNotifications({
      ...notifications,
      [type]: {
        ...notifications[type],
        [setting]:
          !notifications[type][
            setting as keyof (typeof notifications)[typeof type]
          ],
      },
    });
  };

  const handlePreferenceChange = (name: string, value: string) => {
    setPreferences({
      ...preferences,
      [name]: value,
    });
  };
  
  const saveProfile = async () => {
    // Save to API
    const result = await updateProfile({
      name: profile.name,
      phone: profile.phone,
    });
    
    if (result.success) {
      // Profile updated successfully
    } else {
      // Show error message
      console.error("Failed to update profile:", result.error);
    }
  };

  const changePassword = async () => {
    // In a real app, this would call an API to change the password
    // Password change logic would go here
    
    // Reset fields and hide the form
    setPasswords({ current: "", new: "", confirm: "" });
    setShowPasswordFields(false);
    
    // Password changed successfully
  };

  const saveNotifications = async () => {
    if (!notifications) return;
    // Save notification preferences to API
    const result = await updateSettings({
      notificationPreferences: notifications
    });
    
    if (result.success) {
      // Notification preferences updated successfully
    } else {
      // Show error message
      console.error("Failed to update notification preferences:", result.error);
    }
  };

  const savePreferences = async () => {
    // Save preferences to API
    const result = await updateSettings({
      language: preferences.language,
      timezone: preferences.timezone
    });
    
    if (result.success) {
      // Preferences updated successfully
    } else {
      // Show error message
      console.error("Failed to update preferences:", result.error);
    }
  };

  const deleteAccount = () => {
    // In a real app, this would call an API to delete the account
    // Account deletion logic would go here
    
    // Redirect to login or home
    router.push("/");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Show loading state if any data is loading
  const isLoading = profileLoading || settingsLoading;
  
  // Show error state if there are any errors
  const hasError = profileError || settingsError;
  
  return (
    <div className="min-h-screen bg-gray-50">

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-4 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">Settings</h2>
              <p className="mt-1 text-gray-500">
                Manage your account and preferences
              </p>
            </div>
            
            {/* Loading and error states */}
            {isLoading && (
              <div className="mt-2 md:mt-0 px-4 py-2 bg-blue-50 text-blue-700 rounded-md">
                Loading your settings...
              </div>
            )}
            {hasError && (
              <div className="mt-2 md:mt-0 px-4 py-2 bg-red-50 text-red-700 rounded-md">
                Error loading settings
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="profile" className="mt-6">
          <TabsList className="mb-8">
            <TabsTrigger value="profile" className="flex items-center">
              <User className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center">
              <Shield className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center">
              <Bell className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center">
              <CreditCard className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Payment</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center">
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal details and public profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture */}
                <div className="flex flex-col items-center sm:flex-row sm:items-start sm:space-x-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage
                        src={userProfile?.avatar || ''}
                        alt={profile.name}
                      />
                      <AvatarFallback className="bg-blue-200 text-blue-800 text-2xl">
                        {getInitials(profile.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full h-8 w-8 p-0"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0 text-center sm:text-left">
                    <h3 className="text-lg font-medium text-gray-900">
                      Profile Picture
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      JPG or PNG. 1MB max size.
                    </p>
                    <div className="mt-3 flex space-x-3">
                      <Button variant="outline" size="sm">
                        Change
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={profile.name}
                        onChange={handleProfileChange}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={profile.email}
                        onChange={handleProfileChange}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This will be used for account-related communications
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={profile.phone}
                        onChange={handleProfileChange}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Used for two-factor authentication and notifications
                        (optional)
                      </p>
                    </div>

                    <div>
                      <Label>Account Created</Label>
                      <div className="mt-1 text-gray-700 border border-gray-300 rounded-md p-2.5">
                        {userProfile?.createdAt ? formatDate(new Date(userProfile.createdAt)) : 'Loading...'}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-4 border-t pt-6">
                <Button variant="outline">Cancel</Button>
                <Button onClick={saveProfile}>Save Changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your account's security and authentication methods
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Password Section */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Password
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Last changed on{" "}
                    {userSettings?.securitySettings?.lastPasswordChange 
                      ? formatDate(new Date(userSettings.securitySettings.lastPasswordChange)) 
                      : 'unknown'}
                  </p>

                  {!showPasswordFields ? (
                    <Button
                      variant="outline"
                      onClick={() => setShowPasswordFields(true)}
                      className="mt-3"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <div>
                        <Label htmlFor="current">Current Password</Label>
                        <div className="relative mt-1">
                          <Input
                            id="current"
                            name="current"
                            type={passwordVisible ? "text" : "password"}
                            value={passwords.current}
                            onChange={handlePasswordChange}
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setPasswordVisible(!passwordVisible)}
                          >
                            {passwordVisible ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="new">New Password</Label>
                        <Input
                          id="new"
                          name="new"
                          type="password"
                          value={passwords.new}
                          onChange={handlePasswordChange}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="confirm">Confirm New Password</Label>
                        <Input
                          id="confirm"
                          name="confirm"
                          type="password"
                          value={passwords.confirm}
                          onChange={handlePasswordChange}
                          className="mt-1"
                        />
                      </div>

                      <div className="flex space-x-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowPasswordFields(false);
                            setPasswords({ current: "", new: "", confirm: "" });
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={changePassword}
                          disabled={
                            !passwords.current ||
                            !passwords.new ||
                            !passwords.confirm ||
                            passwords.new !== passwords.confirm
                          }
                        >
                          Update Password
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Two-Factor Authentication
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Add an extra layer of security to your account
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <Smartphone className="h-10 w-10 text-gray-400 mr-4" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Authenticator App
                        </p>
                        <p className="text-xs text-gray-500">
                          Use an authenticator app to generate verification
                          codes
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={userSettings?.securitySettings?.twoFactorAuth || false}
                      onCheckedChange={() => {}}
                    />
                  </div>

                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Account Activity
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Recent sign-ins and activity on your account
                  </p>

                  <div className="mt-4 bg-gray-50 rounded-md p-4">
                    <div className="flex items-start">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          Last login: March 9, 2025 at 10:24 AM
                        </p>
                        <p className="text-xs text-gray-500">
                          From: Los Angeles, CA using Chrome on Windows
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button variant="outline">View Full Activity Log</Button>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-red-600">
                    Danger Zone
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Permanent actions that can't be undone
                  </p>

                  <div className="mt-4">
                    <AlertDialog
                      open={showDeleteDialog}
                      onOpenChange={setShowDeleteDialog}
                    >
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Are you absolutely sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete your account and remove all of your data from
                            our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="bg-red-50 border border-red-200 rounded-md p-4 my-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-red-800">
                                Warning
                              </h3>
                              <div className="mt-2 text-sm text-red-700">
                                <ul className="list-disc pl-5 space-y-1">
                                  <li>
                                    All your pool contributions and data will be
                                    lost
                                  </li>
                                  <li>
                                    You'll lose access to any pending payouts
                                  </li>
                                  <li>
                                    Your pools may be affected if you are the
                                    administrator
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={deleteAccount}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Yes, delete my account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Control how and when we contact you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {settingsLoading ? (
                  <div className="py-8 text-center">
                    <p className="text-gray-500">Loading your notification preferences...</p>
                  </div>
                ) : !notifications ? (
                  <div className="py-8 text-center">
                    <p className="text-gray-500">Could not load notification preferences</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => window.location.reload()}
                    >
                      Refresh Page
                    </Button>
                  </div>
                ) : (
                <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Email Notifications
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Manage emails sent to {profile.email}
                    </p>
                  </div>
                  <Switch
                    checked={Object.values(notifications.email).some((v) => v)}
                    onCheckedChange={() => {
                      const allOn = Object.values(notifications.email).every(
                        (v) => v
                      );
                      const newValue = !allOn;
                      setNotifications({
                        ...notifications,
                        email: {
                          paymentReminders: newValue,
                          poolUpdates: newValue,
                          memberActivity: newValue,
                          marketing: newValue,
                        },
                      });
                    }}
                  />
                </div>
                </>
                )}

{notifications && (
                <>
                <div className="ml-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="email-payment"
                      className="flex items-center space-x-2"
                    >
                      <span>Payment Reminders</span>
                    </Label>
                    <Switch
                      id="email-payment"
                      checked={notifications.email.paymentReminders}
                      onCheckedChange={() =>
                        handleNotificationToggle("email", "paymentReminders")
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="email-updates"
                      className="flex items-center space-x-2"
                    >
                      <span>Pool Updates</span>
                    </Label>
                    <Switch
                      id="email-updates"
                      checked={notifications.email.poolUpdates}
                      onCheckedChange={() =>
                        handleNotificationToggle("email", "poolUpdates")
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="email-activity"
                      className="flex items-center space-x-2"
                    >
                      <span>Member Activity</span>
                    </Label>
                    <Switch
                      id="email-activity"
                      checked={notifications.email.memberActivity}
                      onCheckedChange={() =>
                        handleNotificationToggle("email", "memberActivity")
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="email-marketing"
                      className="flex items-center space-x-2"
                    >
                      <span>Marketing & Promotions</span>
                    </Label>
                    <Switch
                      id="email-marketing"
                      checked={notifications.email.marketing}
                      onCheckedChange={() =>
                        handleNotificationToggle("email", "marketing")
                      }
                    />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Push Notifications
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Notifications on this device and mobile app
                      </p>
                    </div>
                    <Switch
                      checked={Object.values(notifications.push).some((v) => v)}
                      onCheckedChange={() => {
                        const allOn = Object.values(notifications.push).every(
                          (v) => v
                        );
                        const newValue = !allOn;
                        setNotifications({
                          ...notifications,
                          push: {
                            paymentReminders: newValue,
                            poolUpdates: newValue,
                            memberActivity: newValue,
                            marketing: newValue,
                          },
                        });
                      }}
                    />
                  </div>

                  <div className="ml-6 mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="push-payment"
                        className="flex items-center space-x-2"
                      >
                        <span>Payment Reminders</span>
                      </Label>
                      <Switch
                        id="push-payment"
                        checked={notifications.push.paymentReminders}
                        onCheckedChange={() =>
                          handleNotificationToggle("push", "paymentReminders")
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="push-updates"
                        className="flex items-center space-x-2"
                      >
                        <span>Pool Updates</span>
                      </Label>
                      <Switch
                        id="push-updates"
                        checked={notifications.push.poolUpdates}
                        onCheckedChange={() =>
                          handleNotificationToggle("push", "poolUpdates")
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="push-activity"
                        className="flex items-center space-x-2"
                      >
                        <span>Member Activity</span>
                      </Label>
                      <Switch
                        id="push-activity"
                        checked={notifications.push.memberActivity}
                        onCheckedChange={() =>
                          handleNotificationToggle("push", "memberActivity")
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="push-marketing"
                        className="flex items-center space-x-2"
                      >
                        <span>Marketing & Promotions</span>
                      </Label>
                      <Switch
                        id="push-marketing"
                        checked={notifications.push.marketing}
                        onCheckedChange={() =>
                          handleNotificationToggle("push", "marketing")
                        }
                      />
                    </div>
                  </div>
                </div>
                </>
                )}
              </CardContent>
              {notifications && (
                <CardFooter className="flex justify-end border-t pt-6">
                  <Button 
                    onClick={saveNotifications}
                    disabled={settingsLoading}
                  >
                    {settingsLoading ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </CardFooter>
              )}
            </Card>
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle>Payout Method</CardTitle>
                <CardDescription>
                  Set up how you receive your pool payouts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payout Method Section */}
                <div>
                    {payoutMethodLoading ? (
                      <div className="flex items-center gap-2 text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </div>
                    ) : editingPayoutMethod || !payoutMethod ? (
                      <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                        <div>
                          <Label htmlFor="payout-type">Payout Method</Label>
                          <Select
                            value={payoutFormData.type}
                            onValueChange={(value) =>
                              setPayoutFormData({ ...payoutFormData, type: value as PayoutMethodType })
                            }
                          >
                            <SelectTrigger id="payout-type" className="mt-1">
                              <SelectValue placeholder="Select payout method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="venmo">Venmo</SelectItem>
                              <SelectItem value="paypal">PayPal</SelectItem>
                              <SelectItem value="zelle">Zelle</SelectItem>
                              <SelectItem value="cashapp">Cash App</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {payoutFormData.type && (
                          <>
                            <div>
                              <Label htmlFor="payout-handle">
                                {payoutFormData.type === 'venmo' && 'Venmo Username or Phone'}
                                {payoutFormData.type === 'paypal' && 'PayPal Email'}
                                {payoutFormData.type === 'zelle' && 'Zelle Email or Phone'}
                                {payoutFormData.type === 'cashapp' && 'Cash App $Cashtag'}
                              </Label>
                              <Input
                                id="payout-handle"
                                type="text"
                                placeholder={
                                  payoutFormData.type === 'venmo' ? '@username or phone' :
                                  payoutFormData.type === 'paypal' ? 'email@example.com' :
                                  payoutFormData.type === 'zelle' ? 'email or phone' :
                                  '$cashtag'
                                }
                                value={payoutFormData.handle}
                                onChange={(e) =>
                                  setPayoutFormData({ ...payoutFormData, handle: e.target.value })
                                }
                                className="mt-1"
                              />
                            </div>

                            <div>
                              <Label htmlFor="payout-display-name">
                                Display Name <span className="text-gray-400">(optional)</span>
                              </Label>
                              <Input
                                id="payout-display-name"
                                type="text"
                                placeholder="e.g., John's Venmo"
                                value={payoutFormData.displayName}
                                onChange={(e) =>
                                  setPayoutFormData({ ...payoutFormData, displayName: e.target.value })
                                }
                                className="mt-1"
                              />
                            </div>
                          </>
                        )}

                        <div className="flex gap-2">
                          <Button
                            onClick={handleSavePayoutMethod}
                            disabled={savingPayoutMethod || !payoutFormData.type || !payoutFormData.handle.trim()}
                            className="min-h-[44px]"
                          >
                            {savingPayoutMethod ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Payout Method
                              </>
                            )}
                          </Button>
                          {payoutMethod && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setEditingPayoutMethod(false);
                                setPayoutFormData({
                                  type: payoutMethod.type,
                                  handle: payoutMethod.handle,
                                  displayName: payoutMethod.displayName || '',
                                });
                              }}
                              className="min-h-[44px]"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-purple-50 border border-purple-200 p-4 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="bg-purple-100 p-2 rounded-md">
                            <Wallet className="h-6 w-6 text-purple-600" />
                          </div>
                          <div>
                            <div className="font-medium">{getPayoutMethodLabel(payoutMethod.type)}</div>
                            <div className="text-sm text-gray-600">{payoutMethod.handle}</div>
                            {payoutMethod.displayName && (
                              <div className="text-xs text-gray-500">{payoutMethod.displayName}</div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingPayoutMethod(true)}
                          className="min-h-[44px]"
                        >
                          Edit
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Auto-Pay Settings
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Configure automatic contributions to your pools via Stripe
                  </p>

                  <div className="mt-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Enable Auto-Pay
                        </p>
                        <p className="text-xs text-gray-500">
                          Automatically pay your contributions when they&apos;re due
                        </p>
                      </div>
                      <Switch />
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Payment Reminders
                        </p>
                        <p className="text-xs text-gray-500">
                          Get notified 3 days before a payment is due
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Account Preferences</CardTitle>
                <CardDescription>
                  Customize your experience on Juntas Seguras
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={preferences.language}
                    onValueChange={(value) =>
                      handlePreferenceChange("language", value)
                    }
                  >
                    <SelectTrigger id="language" className="mt-1">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="pt">Português</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="timezone">Time Zone</Label>
                  <Select
                    value={preferences.timezone}
                    onValueChange={(value) =>
                      handlePreferenceChange("timezone", value)
                    }
                  >
                    <SelectTrigger id="timezone" className="mt-1">
                      <SelectValue placeholder="Select time zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">
                        Eastern Time (ET)
                      </SelectItem>
                      <SelectItem value="America/Chicago">
                        Central Time (CT)
                      </SelectItem>
                      <SelectItem value="America/Denver">
                        Mountain Time (MT)
                      </SelectItem>
                      <SelectItem value="America/Los_Angeles">
                        Pacific Time (PT)
                      </SelectItem>
                      <SelectItem value="America/Anchorage">
                        Alaska Time (AKT)
                      </SelectItem>
                      <SelectItem value="America/Adak">
                        Hawaii Time (HT)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Privacy Settings
                  </h3>

                  <div className="mt-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Profile Visibility
                        </p>
                        <p className="text-xs text-gray-500">
                          Show your profile to other members in your pools
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Activity Status
                        </p>
                        <p className="text-xs text-gray-500">
                          Let other members see when you're active
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Data Analytics
                        </p>
                        <p className="text-xs text-gray-500">
                          Allow us to use your data to improve our services
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t pt-6">
                <Button onClick={savePreferences}>Save Preferences</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
