// app/settings/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Shield,
  CreditCard,
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
  Plus,
  Building,
} from "lucide-react";
import { PaymentMethodDialog } from "@/components/payments/PaymentMethodDialog";
import { PaymentMethodFormValues } from "@/components/payments/PaymentMethodForm";
import Navbar from "@/components/Navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Sample user data
const userData = {
  name: "Maria Gonzalez",
  email: "maria.gonzalez@example.com",
  phone: "(555) 123-4567",
  joinDate: "January 12, 2025",
  profilePicture: "",
  language: "en",
  timezone: "America/New_York",
  securitySettings: {
    twoFactorAuth: true,
    lastPasswordChange: "December 28, 2024",
  },
  notificationPreferences: {
    email: {
      paymentReminders: true,
      poolUpdates: true,
      memberActivity: false,
      marketing: false,
    },
    push: {
      paymentReminders: true,
      poolUpdates: true,
      memberActivity: true,
      marketing: false,
    },
  },
  paymentMethods: [
    {
      id: 1,
      type: "bank",
      name: "Chase Bank",
      last4: "4567",
      isDefault: true,
    },
    {
      id: 2,
      type: "card",
      name: "Visa",
      last4: "8901",
      isDefault: false,
    },
  ],
};

export default function SettingsPage() {
  const router = useRouter();
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState(userData.paymentMethods);

  const [profile, setProfile] = useState({
    name: userData.name,
    email: userData.email,
    phone: userData.phone,
  });

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [notifications, setNotifications] = useState(
    userData.notificationPreferences
  );

  const [preferences, setPreferences] = useState({
    language: userData.language,
    timezone: userData.timezone,
  });

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
  
  // Handle adding or editing a payment method
  const handlePaymentMethodSubmit = (values: PaymentMethodFormValues) => {
    if (editingPaymentMethod) {
      // Update existing payment method
      const updatedMethods = paymentMethods.map(method => {
        if (method.id === editingPaymentMethod.id) {
          const last4 = values.type === 'card' 
            ? values.cardNumber?.slice(-4) || method.last4
            : values.accountNumber?.slice(-4) || method.last4;
            
          return {
            ...method,
            type: values.type,
            name: values.type === 'card' ? `${values.cardholderName}'s Card` : `${values.accountHolderName}'s Bank`,
            last4,
            isDefault: values.isDefault,
          };
        }
        
        // If the edited method is now default, ensure others are not default
        return values.isDefault ? { ...method, isDefault: false } : method;
      });
      
      setPaymentMethods(updatedMethods);
    } else {
      // Add new payment method
      const last4 = values.type === 'card' 
        ? values.cardNumber?.slice(-4) || '****'
        : values.accountNumber?.slice(-4) || '****';
      
      const newMethod = {
        id: Math.max(...paymentMethods.map(m => m.id)) + 1,
        type: values.type,
        name: values.type === 'card' ? `${values.cardholderName}'s Card` : `${values.accountHolderName}'s Bank`,
        last4,
        isDefault: values.isDefault,
      };
      
      // If the new method is default, update other methods
      let updatedMethods = paymentMethods.map(method => 
        values.isDefault ? { ...method, isDefault: false } : method
      );
      
      // Add the new method
      updatedMethods = [...updatedMethods, newMethod];
      setPaymentMethods(updatedMethods);
    }
    
    // Reset and close modal
    setEditingPaymentMethod(null);
    setShowPaymentMethodModal(false);
  };
  
  // Set a payment method as default
  const setDefaultPaymentMethod = (methodId: number) => {
    const updatedMethods = paymentMethods.map(method => ({
      ...method,
      isDefault: method.id === methodId
    }));
    
    setPaymentMethods(updatedMethods);
  };
  
  // Remove a payment method
  const removePaymentMethod = (methodId: number) => {
    const methodToRemove = paymentMethods.find(m => m.id === methodId);
    
    // Filter out the method to remove
    let updatedMethods = paymentMethods.filter(method => method.id !== methodId);
    
    // If the removed method was default, set the first remaining method as default
    if (methodToRemove?.isDefault && updatedMethods.length > 0) {
      updatedMethods = [
        { ...updatedMethods[0], isDefault: true },
        ...updatedMethods.slice(1)
      ];
    }
    
    setPaymentMethods(updatedMethods);
  };
  
  // Edit a payment method
  const editPaymentMethod = (method: any) => {
    setEditingPaymentMethod(method);
    setShowPaymentMethodModal(true);
  };

  const saveProfile = () => {
    // In a real app, this would save to an API
    console.log("Saving profile:", profile);
    // Show success message or redirect
  };

  const changePassword = () => {
    // In a real app, this would call an API to change the password
    console.log("Changing password");
    // Reset fields and hide the form
    setPasswords({ current: "", new: "", confirm: "" });
    setShowPasswordFields(false);
    // Show success message
  };

  const saveNotifications = () => {
    // In a real app, this would save to an API
    console.log("Saving notification preferences:", notifications);
    // Show success message
  };

  const savePreferences = () => {
    // In a real app, this would save to an API
    console.log("Saving preferences:", preferences);
    // Show success message
  };

  const deleteAccount = () => {
    // In a real app, this would call an API to delete the account
    console.log("Deleting account");
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-4 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">Settings</h2>
              <p className="mt-1 text-gray-500">
                Manage your account and preferences
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="profile" className="mt-6">
          <TabsList className="mb-8">
            <TabsTrigger value="profile" className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center">
              <CreditCard className="h-4 w-4 mr-2" />
              Payment Methods
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Preferences
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
                        src={userData.profilePicture}
                        alt={userData.name}
                      />
                      <AvatarFallback className="bg-blue-200 text-blue-800 text-2xl">
                        {getInitials(userData.name)}
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
                        {userData.joinDate}
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
                    {userData.securitySettings.lastPasswordChange}
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
                      checked={userData.securitySettings.twoFactorAuth}
                      onCheckedChange={() => {}}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <Phone className="h-10 w-10 text-gray-400 mr-4" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          SMS Authentication
                        </p>
                        <p className="text-xs text-gray-500">
                          Receive verification codes via text message
                        </p>
                      </div>
                    </div>
                    <Switch />
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
              </CardContent>
              <CardFooter className="flex justify-end border-t pt-6">
                <Button onClick={saveNotifications}>Save Preferences</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>
                  Manage how you make contributions and receive payouts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col space-y-4">
                  {userData.paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`border rounded-lg p-4 ${
                        method.isDefault ? "bg-blue-50 border-blue-200" : ""
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          {method.type === "bank" ? (
                            <div className="bg-green-100 p-2 rounded-md mr-4">
                              <CreditCard className="h-6 w-6 text-green-600" />
                            </div>
                          ) : (
                            <div className="bg-blue-100 p-2 rounded-md mr-4">
                              <CreditCard className="h-6 w-6 text-blue-600" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{method.name}</div>
                            <div className="text-sm text-gray-500">
                              {method.type === "bank" ? "Account" : "Card"}{" "}
                              ending in {method.last4}
                              {method.isDefault && (
                                <span className="ml-2 text-blue-600 text-xs font-medium">
                                  Default
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          {!method.isDefault && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setDefaultPaymentMethod(method.id)}
                            >
                              Set as Default
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => editPaymentMethod(method)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600"
                            onClick={() => removePaymentMethod(method.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  className="mt-4"
                  onClick={() => setShowPaymentMethodModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment Method
                </Button>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Auto-Pay Settings
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Configure automatic contributions to your pools
                  </p>

                  <div className="mt-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Enable Auto-Pay
                        </p>
                        <p className="text-xs text-gray-500">
                          Automatically pay your contributions when they're due
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
      
      {/* Payment Method Dialog */}
      <PaymentMethodDialog
        isOpen={showPaymentMethodModal}
        onClose={() => {
          setShowPaymentMethodModal(false);
          setEditingPaymentMethod(null);
        }}
        onSubmit={handlePaymentMethodSubmit}
        initialValues={editingPaymentMethod && {
          type: editingPaymentMethod.type,
          isDefault: editingPaymentMethod.isDefault,
          // In a real app, you'd retrieve the full payment details from an API
        }}
        isEditing={!!editingPaymentMethod}
      />
    </div>
  );
}
