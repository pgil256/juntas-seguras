'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, AlertCircle, HelpCircle, Zap, MessageSquare, RefreshCw, Key, Mail, Bug } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Card } from '../../../../components/ui/card';
import { Separator } from '../../../../components/ui/separator';
import { Badge } from '../../../../components/ui/badge';

export default function TroubleshootingPage() {
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Troubleshooting</h2>
        <p className="text-gray-700">
          Find solutions to common issues and learn how to resolve problems that may arise while using Juntas Seguras.
        </p>

        <div className="space-y-6 mt-8">
          <section>
            <h3 className="text-xl font-semibold text-gray-900">Account Access Issues</h3>
            <p className="mt-2 text-gray-700">
              Solutions for problems with logging in:
            </p>
            
            <div className="mt-4 space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start">
                  <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <Key className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Forgotten Password</h4>
                    <p className="text-sm text-gray-700 mt-1">
                      Click the "Forgot Password" link on the login screen. You'll receive an email with instructions to reset your password.
                    </p>
                    <div className="mt-2">
                      <Link href="/auth/forgot-password">
                        <Button variant="outline" size="sm" className="text-xs">Reset Password</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <Zap className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Two-Factor Authentication (2FA) Issues</h4>
                    <p className="text-sm text-gray-700 mt-1">
                      If you can't access your authenticator app or don't receive the SMS code, use your backup codes to log in. Contact support if you've lost both.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <Mail className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Email Access Lost</h4>
                    <p className="text-sm text-gray-700 mt-1">
                      If you no longer have access to your registered email, contact our support team. You'll need to verify your identity through alternative means.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Account Locked</h4>
                    <p className="text-sm text-gray-700 mt-1">
                      Multiple failed login attempts will temporarily lock your account for security reasons. Wait 30 minutes before trying again, or contact support for immediate assistance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Payment Problems</h3>
            <p className="mt-2 text-gray-700">
              Resolving issues with contributions and payouts:
            </p>
            
            <div className="mt-4 space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-2">Failed Contributions</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Issue:</span> Payment method declined</span>
                  </li>
                  <li className="flex items-start ml-6">
                    <Zap className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Solution:</span> Check your payment method's balance and information. Make sure the card isn't expired and has sufficient funds.</span>
                  </li>
                  
                  <li className="flex items-start mt-4">
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Issue:</span> Transaction timeout</span>
                  </li>
                  <li className="flex items-start ml-6">
                    <Zap className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Solution:</span> Check your internet connection and try again. If the problem persists, try a different payment method.</span>
                  </li>
                  
                  <li className="flex items-start mt-4">
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Issue:</span> Payment processor error</span>
                  </li>
                  <li className="flex items-start ml-6">
                    <Zap className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Solution:</span> Wait a few minutes and try again. Our payment system may be experiencing temporary issues.</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-2">Payout Issues</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Issue:</span> Delayed payout</span>
                  </li>
                  <li className="flex items-start ml-6">
                    <Zap className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Solution:</span> Payouts typically process within 1-3 business days. Check the status in your account. If it's been longer than 3 business days, contact support.</span>
                  </li>
                  
                  <li className="flex items-start mt-4">
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Issue:</span> Incorrect payout amount</span>
                  </li>
                  <li className="flex items-start ml-6">
                    <Zap className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Solution:</span> Immediately report any discrepancies to support with screenshots of the expected and received amounts.</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
              <div className="flex items-start">
                <HelpCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  If you're experiencing persistent payment issues, try adding a different payment method to your account.
                </p>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Pool Management Challenges</h3>
            <p className="mt-2 text-gray-700">
              Solutions for issues with pool administration:
            </p>
            
            <div className="mt-4 space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-2">Member Invitation Issues</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Issue:</span> Invitee hasn't joined</span>
                  </li>
                  <li className="flex items-start ml-6">
                    <Zap className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Solution:</span> Verify the email address is correct. Check if the invitation is in their spam folder. Resend the invitation or try sharing the invitation link directly.</span>
                  </li>
                  
                  <li className="flex items-start mt-4">
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Issue:</span> Error when inviting members</span>
                  </li>
                  <li className="flex items-start ml-6">
                    <Zap className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Solution:</span> Make sure you haven't reached the maximum member limit for your pool. Verify that email addresses are formatted correctly.</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-2">Member Contribution Issues</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Issue:</span> Member hasn't paid</span>
                  </li>
                  <li className="flex items-start ml-6">
                    <Zap className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Solution:</span> Use the reminder system to notify them. Send a direct message through the platform. Encourage them to set up automatic payments.</span>
                  </li>
                  
                  <li className="flex items-start mt-4">
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Issue:</span> Persistent non-payment</span>
                  </li>
                  <li className="flex items-start ml-6">
                    <Zap className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Solution:</span> After appropriate warnings, you may need to replace the member. The platform provides a process for removing non-compliant members and finding replacements.</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-2">Pool Setting Changes</h4>
                <p className="text-sm text-gray-700 mb-2">
                  Most pool settings can only be changed before the pool starts or with unanimous member approval. For specific situations:
                </p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <Zap className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Changing contribution amount:</span> Requires approval from all members and can only be applied to future rounds.</span>
                  </li>
                  <li className="flex items-start">
                    <Zap className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Adjusting payout order:</span> Requires consent from all affected members. Create a poll in the pool messaging system.</span>
                  </li>
                  <li className="flex items-start">
                    <Zap className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Changing pool duration:</span> Only possible with unanimous approval and may require restarting the pool.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Technical Issues</h3>
            <p className="mt-2 text-gray-700">
              Troubleshooting app performance and technical problems:
            </p>
            
            <div className="mt-4 space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <Bug className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">App Crashes or Freezes</h4>
                    <ul className="mt-2 space-y-2 text-sm text-gray-700">
                      <li className="flex items-start">
                        <RefreshCw className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Refresh the page or restart the app</span>
                      </li>
                      <li className="flex items-start">
                        <RefreshCw className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Clear your browser cache if using the web version</span>
                      </li>
                      <li className="flex items-start">
                        <RefreshCw className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Update your browser or app to the latest version</span>
                      </li>
                      <li className="flex items-start">
                        <RefreshCw className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Try a different browser if issues persist</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start">
                  <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Slow Performance</h4>
                    <ul className="mt-2 space-y-2 text-sm text-gray-700">
                      <li className="flex items-start">
                        <RefreshCw className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Check your internet connection speed and stability</span>
                      </li>
                      <li className="flex items-start">
                        <RefreshCw className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Close unnecessary browser tabs or applications</span>
                      </li>
                      <li className="flex items-start">
                        <RefreshCw className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Clear browser cache and cookies</span>
                      </li>
                      <li className="flex items-start">
                        <RefreshCw className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Try accessing during off-peak hours if possible</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Notification Issues</h4>
                    <ul className="mt-2 space-y-2 text-sm text-gray-700">
                      <li className="flex items-start">
                        <RefreshCw className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Verify notification settings are enabled in your account</span>
                      </li>
                      <li className="flex items-start">
                        <RefreshCw className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Check your device notification settings for the app or browser</span>
                      </li>
                      <li className="flex items-start">
                        <RefreshCw className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Make sure your email is not filtering our messages as spam</span>
                      </li>
                      <li className="flex items-start">
                        <RefreshCw className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Update your contact information if it has changed</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-100">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  If you encounter a persistent technical issue not covered here, please take a screenshot (if possible) and contact our support team with details about the problem and steps to reproduce it.
                </p>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Getting Additional Help</h3>
            <p className="mt-2 text-gray-700">
              If you're still experiencing issues, our support team is here to help:
            </p>
            
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/help/contact" className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-200 hover:bg-blue-50 transition-colors">
                <div className="flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">Contact Support</h4>
                  <p className="text-sm text-gray-700 mt-1">
                    Submit a detailed support request for personalized assistance
                  </p>
                  <Badge className="mt-2">Response within 24 hours</Badge>
                </div>
              </Link>
              
              <Link href="/help/support" className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-200 hover:bg-blue-50 transition-colors">
                <div className="flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                    <MessageSquare className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">Support Tickets</h4>
                  <p className="text-sm text-gray-700 mt-1">
                    View and manage your existing support requests
                  </p>
                  <Badge className="mt-2">Track resolution status</Badge>
                </div>
              </Link>
            </div>
          </section>
        </div>

        <div className="flex justify-between mt-10 pt-4 border-t border-gray-200">
          <Link href="/help/documentation/settings">
            <Button
              variant="outline"
              className="flex items-center"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous: Account Settings
            </Button>
          </Link>
          <Link href="/help/documentation/technical">
            <Button
              className="flex items-center"
            >
              Next: Technical Guide
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}