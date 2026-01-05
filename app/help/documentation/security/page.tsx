'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Shield, Lock, Smartphone, AlertCircle, EyeOff, Key, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Card } from '../../../../components/ui/card';
import { Separator } from '../../../../components/ui/separator';
import { Badge } from '../../../../components/ui/badge';

export default function SecurityDocumentationPage() {
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Security</h2>
        <p className="text-gray-700">
          Learn about the security features available to protect your account, personal information, and financial transactions on Juntas Seguras.
        </p>

        <div className="space-y-6 mt-8">
          <section>
            <h3 className="text-xl font-semibold text-gray-900">Account Security</h3>
            <p className="mt-2 text-gray-700">
              Your Juntas Seguras account is protected by multiple layers of security:
            </p>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <Lock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Password Protection</h4>
                  <p className="text-sm text-gray-700 mt-1">
                    Use strong, unique passwords with a mix of letters, numbers, and special characters. Change your password regularly.
                  </p>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <Smartphone className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-700 mt-1">
                    Add an extra layer of security by enabling 2FA via authenticator app or email verification.
                  </p>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex">
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <AlertCircle className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Activity Monitoring</h4>
                  <p className="text-sm text-gray-700 mt-1">
                    We track login attempts and account activities to detect suspicious behavior. You'll be notified of unusual activities.
                  </p>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex">
                <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <EyeOff className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Session Management</h4>
                  <p className="text-sm text-gray-700 mt-1">
                    View and manage active login sessions. Remotely log out from any device you no longer use.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Two-Factor Authentication (2FA)</h3>
            <p className="mt-2 text-gray-700">
              Add an extra layer of security to your account:
            </p>
            <ol className="mt-2 space-y-3 text-gray-700 list-decimal pl-5">
              <li>
                <span className="font-medium">Setting Up 2FA:</span> Go to Profile → Security → Two-Factor Authentication
              </li>
              <li>
                <span className="font-medium">Select Method:</span> Choose from authenticator app or email verification
              </li>
              <li>
                <span className="font-medium">Authenticator App (Recommended):</span> Scan the QR code with Google Authenticator, Authy, or similar apps
              </li>
              <li>
                <span className="font-medium">Verify Setup:</span> Enter a verification code to confirm everything works
              </li>
              <li>
                <span className="font-medium">Backup Codes:</span> Save your backup codes securely for emergency access
              </li>
            </ol>
            
            <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-100">
              <div className="flex items-start">
                <Key className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">Important:</span> Store your backup codes in a safe place. If you lose access to your authentication device, these codes will be your only way to log in.
                </p>
              </div>
            </div>
            
            <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">2FA Method Comparison</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 text-left font-medium">Method</th>
                      <th className="p-2 text-left font-medium">Security Level</th>
                      <th className="p-2 text-left font-medium">Convenience</th>
                      <th className="p-2 text-left font-medium">Best For</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="p-2 font-medium">Authenticator App</td>
                      <td className="p-2">
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                          <span>High</span>
                        </div>
                      </td>
                      <td className="p-2">Medium</td>
                      <td className="p-2">Maximum security</td>
                    </tr>
                    <tr className="border-t">
                      <td className="p-2 font-medium">Email</td>
                      <td className="p-2">
                        <div className="flex items-center">
                          <XCircle className="h-4 w-4 text-red-600 mr-1" />
                          <span>Lower</span>
                        </div>
                      </td>
                      <td className="p-2">High</td>
                      <td className="p-2">Basic additional protection</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Data Protection</h3>
            <p className="mt-2 text-gray-700">
              How we protect your personal and financial information:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Encryption:</span> All data is encrypted both in transit and at rest using industry-standard protocols
              </li>
              <li>
                <span className="font-medium">Limited Data Collection:</span> We only collect information necessary to provide our services
              </li>
              <li>
                <span className="font-medium">No Sharing:</span> We never sell your data to third parties
              </li>
              <li>
                <span className="font-medium">Secure Servers:</span> Data is stored on servers with multiple layers of physical and digital security
              </li>
              <li>
                <span className="font-medium">Regular Audits:</span> We conduct security audits and penetration testing to identify and fix vulnerabilities
              </li>
            </ul>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Financial Security</h3>
            <p className="mt-2 text-gray-700">
              Your financial transactions and pool participation are protected by:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Trusted Payment Apps:</span> Contributions are made via established payment services (Venmo, PayPal, Zelle, Cash App)
              </li>
              <li>
                <span className="font-medium">Payment Tracking:</span> All contributions and payouts are tracked and verified in the app
              </li>
              <li>
                <span className="font-medium">Identity Verification:</span> Optional Stripe Identity verification helps establish trust among pool members
              </li>
              <li>
                <span className="font-medium">Audit Trail:</span> Complete record of all financial transactions for accountability
              </li>
              <li>
                <span className="font-medium">Member Confirmations:</span> Both members and administrators confirm payments for transparency
              </li>
            </ul>

            <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Tip:</span> Only join pools with people you know and trust. Verify payment details before sending, and always confirm your payments in the app.
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Privacy Controls</h3>
            <p className="mt-2 text-gray-700">
              Manage what information is visible to others:
            </p>
            <div className="mt-4 space-y-3">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-2">Profile Privacy Settings</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-700">Full name visibility</div>
                    <div>
                      <Badge className="bg-blue-50 text-blue-700">Within pools only</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-700">Email address</div>
                    <div>
                      <Badge className="bg-green-50 text-green-700">Private</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-700">Pool membership</div>
                    <div>
                      <Badge className="bg-gray-50 text-gray-700">Configurable</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-700">Contribution history</div>
                    <div>
                      <Badge className="bg-green-50 text-green-700">Pool members only</Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-700">
                Adjust your privacy settings by going to Profile → Settings → Privacy.
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Security Best Practices</h3>
            <p className="mt-2 text-gray-700">
              Follow these recommendations to keep your account secure:
            </p>
            <ul className="mt-4 space-y-4">
              <li className="flex">
                <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Use strong, unique passwords</p>
                  <p className="text-sm text-gray-700">Create a password that's at least 12 characters long with a mix of uppercase, lowercase, numbers, and symbols. Don't reuse passwords from other sites.</p>
                </div>
              </li>
              
              <li className="flex">
                <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Enable two-factor authentication</p>
                  <p className="text-sm text-gray-700">This adds a crucial second layer of security, even if your password is compromised.</p>
                </div>
              </li>
              
              <li className="flex">
                <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Keep your device and browser updated</p>
                  <p className="text-sm text-gray-700">Security updates often fix vulnerabilities that could be exploited.</p>
                </div>
              </li>
              
              <li className="flex">
                <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Be wary of phishing attempts</p>
                  <p className="text-sm text-gray-700">We'll never ask for your password via email. Always check the URL before entering login information.</p>
                </div>
              </li>
              
              <li className="flex">
                <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Log out from shared devices</p>
                  <p className="text-sm text-gray-700">Always log out when using public or shared computers and regularly review your active sessions.</p>
                </div>
              </li>
              
              <li className="flex">
                <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Regularly check your account activity</p>
                  <p className="text-sm text-gray-700">Review login history and transactions regularly to spot unauthorized access quickly.</p>
                </div>
              </li>
            </ul>
          </section>
        </div>

        <div className="flex justify-between mt-10 pt-4 border-t border-gray-200">
          <Link href="/help/documentation/payments">
            <Button
              variant="outline"
              className="flex items-center"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous: Payments & Finances
            </Button>
          </Link>
          <Link href="/help/documentation/settings">
            <Button
              className="flex items-center"
            >
              Next: Account Settings
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}