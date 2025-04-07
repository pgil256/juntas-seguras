'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Download, User, Mail, Lock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function AccountDocumentationPage() {
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Account Management</h2>
        <p className="text-gray-700">
          Learn how to manage your Juntas Seguras account, update your profile information, and customize your settings.
        </p>

        <div className="space-y-6 mt-8">
          <section>
            <h3 className="text-xl font-semibold text-gray-900">Your Profile Information</h3>
            <p className="mt-2 text-gray-700">
              Your profile helps build trust with other members. Here's how to manage it:
            </p>
            <ol className="mt-2 space-y-3 text-gray-700 list-decimal pl-5">
              <li>
                <span className="font-medium">Accessing Your Profile:</span> Click on your profile photo in the top right corner and select "Profile"
              </li>
              <li>
                <span className="font-medium">Edit Profile:</span> Click the "Edit Profile" button to update your information
              </li>
              <li>
                <span className="font-medium">Upload a Photo:</span> Add a clear profile photo to help identify you
              </li>
              <li>
                <span className="font-medium">Contact Information:</span> Keep your email and phone number updated for important notifications
              </li>
            </ol>
            
            <div className="my-6 rounded-lg overflow-hidden border border-gray-200">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">Profile Page Preview</p>
              </div>
              <div className="p-4 bg-white flex justify-center">
                <div className="max-w-sm p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex flex-col items-center">
                    <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-12 w-12 text-blue-600" />
                    </div>
                    <h5 className="mt-4 text-xl font-medium text-gray-900">Maria Rodriguez</h5>
                    <span className="text-sm text-gray-500">Member since January 2025</span>
                    <div className="mt-4 space-y-1 w-full">
                      <div className="flex items-center text-sm">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        <span>maria@example.com</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Shield className="h-4 w-4 mr-2 text-gray-400" />
                        <span>Verified Member</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Lock className="h-4 w-4 mr-2 text-gray-400" />
                        <span>2FA Enabled</span>
                      </div>
                    </div>
                    <Button className="mt-6 w-full text-sm">Edit Profile</Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Account Settings</h3>
            <p className="mt-2 text-gray-700">
              Customize your account settings to match your preferences:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Language:</span> Set your preferred language for the platform interface
              </li>
              <li>
                <span className="font-medium">Notifications:</span> Configure email, SMS, and in-app notification preferences
              </li>
              <li>
                <span className="font-medium">Time Zone:</span> Set your time zone to ensure notifications arrive at appropriate times
              </li>
              <li>
                <span className="font-medium">Privacy Settings:</span> Control what information is visible to other users
              </li>
            </ul>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Tip:</span> Review your notification settings regularly to ensure you don't miss important updates about your savings pools.
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Security Settings</h3>
            <p className="mt-2 text-gray-700">
              Protect your account with these security features:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Password Management:</span> Regularly update your password for enhanced security
              </li>
              <li>
                <span className="font-medium">Two-Factor Authentication:</span> Enable 2FA to add an extra layer of security using an authenticator app, SMS, or email
              </li>
              <li>
                <span className="font-medium">Login Sessions:</span> Review and manage active login sessions across devices
              </li>
              <li>
                <span className="font-medium">Activity Log:</span> Monitor account activity to identify any unauthorized access
              </li>
            </ul>
            <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-100">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Security Tip:</span> Enable two-factor authentication for significantly improved account security. This prevents unauthorized access even if your password is compromised.
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Account Verification</h3>
            <p className="mt-2 text-gray-700">
              Verified accounts have higher trust levels and may access additional features:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Email Verification:</span> Required for all accounts
              </li>
              <li>
                <span className="font-medium">Phone Verification:</span> Recommended for additional security and features
              </li>
              <li>
                <span className="font-medium">ID Verification:</span> Optional but recommended for higher contribution pools
              </li>
              <li>
                <span className="font-medium">Address Verification:</span> May be required for certain payment methods
              </li>
            </ul>
            
            <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Verification Badges</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center p-3 bg-white rounded border">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email Verified</p>
                    <p className="text-xs text-gray-500">Basic account verification</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-white rounded border">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <Shield className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Fully Verified</p>
                    <p className="text-xs text-gray-500">ID and address verified</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex justify-between mt-10 pt-4 border-t border-gray-200">
          <Link href="/help/documentation">
            <Button
              variant="outline"
              className="flex items-center"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous: Getting Started
            </Button>
          </Link>
          <Link href="/help/documentation/pools">
            <Button
              className="flex items-center"
            >
              Next: Savings Pools
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}