'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Globe, Bell, Clock, Lock, Eye, Bookmark, Cloud, ToggleLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

export default function SettingsDocumentationPage() {
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Account Settings</h2>
        <p className="text-gray-700">
          Learn how to configure your Juntas Seguras account settings to personalize your experience and manage your preferences.
        </p>

        <div className="space-y-6 mt-8">
          <section>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <Globe className="h-5 w-5 mr-2 text-blue-600" />
              Language & Regional Settings
            </h3>
            <p className="mt-2 text-gray-700">
              Configure language and regional preferences for your account:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Interface Language:</span> Choose from English, Spanish, Portuguese, or French
              </li>
              <li>
                <span className="font-medium">Date Format:</span> MM/DD/YYYY, DD/MM/YYYY, or YYYY-MM-DD
              </li>
              <li>
                <span className="font-medium">Time Format:</span> 12-hour or 24-hour clock
              </li>
              <li>
                <span className="font-medium">Currency Display:</span> Choose your preferred currency symbol and format
              </li>
            </ul>
            
            <div className="my-6 rounded-lg overflow-hidden border border-gray-200">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">Language Settings Preview</p>
              </div>
              <div className="p-4 bg-white">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm font-medium">Interface Language</span>
                    </div>
                    <div className="w-32">
                      <div className="px-3 py-1.5 bg-gray-100 rounded-md text-sm text-center">
                        English
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm font-medium">Time Zone</span>
                    </div>
                    <div className="w-32">
                      <div className="px-3 py-1.5 bg-gray-100 rounded-md text-sm text-center">
                        UTC-05:00
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <Bell className="h-5 w-5 mr-2 text-blue-600" />
              Notification Preferences
            </h3>
            <p className="mt-2 text-gray-700">
              Control how and when you receive notifications about your account and savings pools:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Email Notifications:</span> Choose which updates are sent to your email
              </li>
              <li>
                <span className="font-medium">SMS Notifications:</span> Enable text messages for time-sensitive alerts
              </li>
              <li>
                <span className="font-medium">In-App Notifications:</span> Manage your notification center preferences
              </li>
              <li>
                <span className="font-medium">Notification Schedule:</span> Set quiet hours when you won't receive notifications
              </li>
            </ul>
            
            <div className="my-6 rounded-lg overflow-hidden border border-gray-200">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">Notification Settings Preview</p>
              </div>
              <div className="p-4 bg-white">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Pool Payment Reminders</p>
                      <p className="text-xs text-gray-500">Receive reminders before payments are due</p>
                    </div>
                    <Switch checked={true} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">New Member Notifications</p>
                      <p className="text-xs text-gray-500">When someone joins a pool you manage</p>
                    </div>
                    <Switch checked={true} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Promotional Messages</p>
                      <p className="text-xs text-gray-500">Updates about new features and offers</p>
                    </div>
                    <Switch checked={false} />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Tip:</span> Enable SMS notifications for payment reminders to avoid missing important contribution deadlines.
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <Eye className="h-5 w-5 mr-2 text-blue-600" />
              Privacy Settings
            </h3>
            <p className="mt-2 text-gray-700">
              Control who can see your information and how your data is used:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Profile Visibility:</span> Control what parts of your profile are visible to other users
              </li>
              <li>
                <span className="font-medium">Contact Information:</span> Manage who can contact you through the platform
              </li>
              <li>
                <span className="font-medium">Pool Activity:</span> Control whether your pool memberships are visible to others
              </li>
              <li>
                <span className="font-medium">Data Usage:</span> Opt in or out of using your data for platform improvements
              </li>
            </ul>
            
            <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-100">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Privacy Tip:</span> We recommend keeping your profile visible to pool members for better trust and transparency, but you can limit visibility of sensitive details.
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <Bookmark className="h-5 w-5 mr-2 text-blue-600" />
              Preferences & Defaults
            </h3>
            <p className="mt-2 text-gray-700">
              Customize your app experience with these preference settings:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Default Landing Page:</span> Choose which page loads when you log in
              </li>
              <li>
                <span className="font-medium">Theme Preferences:</span> Light mode, dark mode, or system default
              </li>
              <li>
                <span className="font-medium">Dashboard Layout:</span> Configure which widgets appear on your dashboard
              </li>
              <li>
                <span className="font-medium">Email Digest Frequency:</span> Daily, weekly, or monthly summaries
              </li>
            </ul>
            
            <div className="my-6 rounded-lg overflow-hidden border border-gray-200">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">Theme Settings Preview</p>
              </div>
              <div className="p-4 bg-white">
                <div className="grid grid-cols-2 gap-3">
                  <div className="border rounded-md p-3 bg-white">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full bg-blue-500 mr-2"></div>
                      <p className="text-xs font-medium">Light Theme</p>
                    </div>
                    <div className="mt-2 h-16 bg-gray-50 rounded border border-gray-200 flex items-center justify-center">
                      <p className="text-xs text-gray-900">Light Mode Preview</p>
                    </div>
                  </div>
                  
                  <div className="border rounded-md p-3 bg-gray-900">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full bg-blue-400 mr-2"></div>
                      <p className="text-xs font-medium text-white">Dark Theme</p>
                    </div>
                    <div className="mt-2 h-16 bg-gray-800 rounded border border-gray-700 flex items-center justify-center">
                      <p className="text-xs text-gray-100">Dark Mode Preview</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <Cloud className="h-5 w-5 mr-2 text-blue-600" />
              Data Management
            </h3>
            <p className="mt-2 text-gray-700">
              Manage your personal data and account information:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Download Your Data:</span> Request an export of all your personal data
              </li>
              <li>
                <span className="font-medium">Data Retention:</span> Control how long your data is stored
              </li>
              <li>
                <span className="font-medium">Account Deletion:</span> Process and requirements for deleting your account
              </li>
              <li>
                <span className="font-medium">Backup Preferences:</span> Configure automatic data backups
              </li>
            </ul>
            
            <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Data Export Options</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center p-3 bg-white rounded border">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <Cloud className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Full Account Data</p>
                    <p className="text-xs text-gray-500">All your personal info and activity</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-white rounded border">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <ToggleLeft className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Payment History Only</p>
                    <p className="text-xs text-gray-500">Just your transaction records</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex justify-between mt-10 pt-4 border-t border-gray-200">
          <Link href="/help/documentation/security">
            <Button
              variant="outline"
              className="flex items-center"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous: Security
            </Button>
          </Link>
          <Link href="/help/documentation/troubleshooting">
            <Button
              className="flex items-center"
            >
              Next: Troubleshooting
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}