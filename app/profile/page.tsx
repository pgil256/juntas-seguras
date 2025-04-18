// app/profile/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Shield,
  CreditCard,
  Bell,
  Edit,
  Save,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";

import { useUserProfile } from "../../lib/hooks/useUserProfile";
import { usePools } from "../../lib/hooks/usePools";
import { usePaymentMethods } from "../../lib/hooks/usePaymentMethods";

export default function ProfilePage() {
  const [editMode, setEditMode] = useState(false);
  const { profile, isLoading: profileLoading, error: profileError, updateProfile } = useUserProfile();
  const { pools, isLoading: poolsLoading } = usePools();
  const { paymentMethods, isLoading: paymentsLoading } = usePaymentMethods({ userId: profile?.id || '' });
  
  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    sms: true,
    paymentReminders: true,
    poolUpdates: true,
    newMembers: false,
  });

  // Update local state when profile data is loaded
  useEffect(() => {
    if (profile) {
      setUserInfo({
        name: profile.name,
        email: profile.email,
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserInfo({
      ...userInfo,
      [name]: value,
    });
  };

  const handleToggleChange = (setting: string) => {
    setNotificationSettings({
      ...notificationSettings,
      [setting]:
        !notificationSettings[setting as keyof typeof notificationSettings],
    });
  };

  const saveProfile = async () => {
    const result = await updateProfile({
      name: userInfo.name,
      phone: userInfo.phone,
    });
    
    if (result.success) {
      setEditMode(false);
    } else {
      // Show error notification
      alert(result.error || "Failed to update profile");
    }
  };
  
  // Calculate stats from real data
  const activePools = pools?.filter(pool => pool.status === 'active')?.length || 0;
  const completedPools = pools?.filter(pool => pool.status === 'completed')?.length || 0;
  
  const totalSaved = pools?.reduce((total, pool) => {
    // Sum contributions across all pools
    return total + (pool.contributionAmount * pool.currentRound);
  }, 0) || 0;
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const preferredPaymentMethod = paymentMethods?.find(method => method.isDefault)?.name || 'None';

  // Show loading state
  if (profileLoading || poolsLoading || paymentsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-center">Loading profile data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (profileError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white shadow-lg rounded-lg p-8 max-w-md">
          <div className="text-red-500 text-center mb-4">
            <AlertTriangle className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-xl font-medium text-center">Error Loading Profile</h3>
          <p className="mt-2 text-gray-600 text-center">{profileError}</p>
          <div className="mt-6 text-center">
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-4 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">Profile</h2>
              <p className="mt-1 text-gray-500">
                Manage your account and preferences
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              {editMode ? (
                <button
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  onClick={saveProfile}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </button>
              ) : (
                <button
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  onClick={() => setEditMode(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Your personal details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center">
                  <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center mb-4 overflow-hidden">
                    {profile?.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={profile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-16 w-16 text-gray-400" />
                    )}
                  </div>

                  <h3 className="text-lg font-medium">{profile?.name}</h3>
                  <p className="text-sm text-gray-500">
                    Member since {formatDate(profile?.createdAt)}
                  </p>

                  <div className="mt-6 w-full space-y-4">
                    {editMode ? (
                      <>
                        <div>
                          <label
                            htmlFor="name"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            Name
                          </label>
                          <input
                            type="text"
                            id="name"
                            name="name"
                            value={userInfo.name}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            Email
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={userInfo.email}
                            disabled
                            className="w-full p-2 border border-gray-300 rounded-md bg-gray-50"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Email cannot be changed
                          </p>
                        </div>
                        <div>
                          <label
                            htmlFor="phone"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            Phone
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={userInfo.phone}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center">
                          <Mail className="h-5 w-5 text-gray-400 mr-3" />
                          <span className="text-sm text-gray-700">
                            {profile?.email}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-5 w-5 text-gray-400 mr-3" />
                          <span className="text-sm text-gray-700">
                            {profile?.phone || 'Not set'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <CreditCard className="h-5 w-5 text-gray-400 mr-3" />
                          <span className="text-sm text-gray-700">
                            Preferred payment: {preferredPaymentMethod}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {/* Account Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Account Stats</CardTitle>
                <CardDescription>
                  Your activity on Juntas Seguras
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-sm font-medium text-gray-500">
                      Total Saved
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">
                      ${totalSaved}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-sm font-medium text-gray-500">
                      Active Pools
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">
                      {activePools}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-sm font-medium text-gray-500">
                      Completed Pools
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">
                      {completedPools}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Manage how you receive alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Bell className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-700">
                        Email Notifications
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.email}
                        onChange={() => handleToggleChange("email")}
                        className="sr-only peer"
                        disabled={!editMode}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Bell className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-700">
                        SMS Notifications
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.sms}
                        onChange={() => handleToggleChange("sms")}
                        className="sr-only peer"
                        disabled={!editMode}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Bell className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-700">
                        Payment Reminders
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.paymentReminders}
                        onChange={() => handleToggleChange("paymentReminders")}
                        className="sr-only peer"
                        disabled={!editMode}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Bell className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-700">
                        Pool Updates
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.poolUpdates}
                        onChange={() => handleToggleChange("poolUpdates")}
                        className="sr-only peer"
                        disabled={!editMode}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Shield className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Two-Factor Authentication
                        </p>
                        <p className="text-xs text-gray-500">
                          Not enabled - Enable for increased security
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.location.href = '/profile/security/two-factor'}>
                      Enable
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Shield className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Password
                        </p>
                        <p className="text-xs text-gray-500">
                          Last changed: {formatDate(profile?.createdAt)}
                        </p>
                      </div>
                    </div>
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center">
                      Change
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Shield className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Account Activity
                        </p>
                        <p className="text-xs text-gray-500">
                          View recent activity and security events
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = '/profile/security/activity'}
                      className="flex items-center"
                    >
                      View Activity
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Shield className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Login Sessions
                        </p>
                        <p className="text-xs text-gray-500">
                          Manage devices where you're logged in
                        </p>
                      </div>
                    </div>
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center">
                      View
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
