'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, DollarSign, AlertCircle, Clock, CheckCircle, Smartphone } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Card } from '../../../../components/ui/card';
import { Separator } from '../../../../components/ui/separator';

export default function PaymentsDocumentationPage() {
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Payments & Finances</h2>
        <p className="text-gray-700">
          Learn about setting up payment methods, making contributions, and receiving payouts from your savings pools.
        </p>

        <div className="space-y-6 mt-8">
          <section>
            <h3 className="text-xl font-semibold text-gray-900">Payment Methods for Contributions</h3>
            <p className="mt-2 text-gray-700">
              Juntas Seguras uses peer-to-peer payment apps for contributions. Pool administrators select which methods to accept:
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-start">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <Smartphone className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Venmo</h4>
                  <p className="text-sm text-gray-700 mt-1">
                    Send contributions via Venmo to the pool administrator. Quick and easy for most users.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-start">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <Smartphone className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Cash App</h4>
                  <p className="text-sm text-gray-700 mt-1">
                    Use your Cash App $cashtag for instant transfers to the pool administrator.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-start">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <Smartphone className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">PayPal</h4>
                  <p className="text-sm text-gray-700 mt-1">
                    Send via PayPal using the administrator's PayPal.me link or email address.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-start">
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <Smartphone className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Zelle</h4>
                  <p className="text-sm text-gray-700 mt-1">
                    Transfer directly from your bank using Zelle. Scan the admin's QR code for easy sending.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Note:</span> Contribution amounts range from $1 to $20 per period. After sending your contribution, confirm the payment in the app so the administrator can track it.
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Payout Methods</h3>
            <p className="mt-2 text-gray-700">
              When it's your turn to receive the pool payout, the administrator will send funds using your preferred payment method:
            </p>

            <div className="mt-4 space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <Smartphone className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Payout Methods</h4>
                    <p className="text-sm text-gray-700 mt-1">
                      Save your payment app details so administrators know where to send your payout:
                    </p>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="text-center p-2 bg-blue-50 rounded-md">
                        <span className="text-sm font-medium text-blue-700">Venmo</span>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded-md">
                        <span className="text-sm font-medium text-blue-700">PayPal</span>
                      </div>
                      <div className="text-center p-2 bg-purple-50 rounded-md">
                        <span className="text-sm font-medium text-purple-700">Zelle</span>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded-md">
                        <span className="text-sm font-medium text-green-700">Cash App</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Pool administrators will send payouts using your provided details. Zelle users can upload a QR code for easy payments.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Setting Up Payout Methods</h3>
            <p className="mt-2 text-gray-700">
              Follow these steps to set up your payout method so administrators know where to send your winnings:
            </p>
            <ol className="mt-2 space-y-3 text-gray-700 list-decimal pl-5">
              <li>
                <span className="font-medium">Access Settings:</span> Go to Settings → Payout Method
              </li>
              <li>
                <span className="font-medium">Add Your Details:</span> Enter your username/handle for Venmo, Cash App, PayPal, or Zelle
              </li>
              <li>
                <span className="font-medium">Upload Zelle QR (Optional):</span> If you use Zelle, you can upload your QR code for easy payments
              </li>
              <li>
                <span className="font-medium">Set Preferred Method:</span> Choose which method you'd like to be your default for payouts
              </li>
            </ol>

            <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Tip:</span> You can save multiple payout methods and set a preferred one. Pool administrators will see your details when it's time to send your payout.
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Making Contributions</h3>
            <p className="mt-2 text-gray-700">
              Contributing to your pools is straightforward:
            </p>

            <div className="mt-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-2">How to Contribute</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs font-medium text-blue-600">1</span>
                    </div>
                    <span>Receive a reminder notification when your contribution is due</span>
                  </li>
                  <li className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs font-medium text-blue-600">2</span>
                    </div>
                    <span>Go to the pool page to view the administrator's payment details</span>
                  </li>
                  <li className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs font-medium text-blue-600">3</span>
                    </div>
                    <span>Send your contribution via Venmo, Cash App, PayPal, or Zelle</span>
                  </li>
                  <li className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs font-medium text-blue-600">4</span>
                    </div>
                    <span>Confirm your payment in the app so the admin can track it</span>
                  </li>
                  <li className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs font-medium text-blue-600">5</span>
                    </div>
                    <span>The administrator will verify receipt of your payment</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Tip:</span> Pay on time to maintain your good standing in the pool. The system sends automatic reminders before payments are due.
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Receiving Payouts</h3>
            <p className="mt-2 text-gray-700">
              When it's your turn to receive the pool amount:
            </p>
            <ol className="mt-2 space-y-3 text-gray-700 list-decimal pl-5">
              <li>
                <span className="font-medium">Payout Notification:</span> You'll receive a notification when your payout is scheduled
              </li>
              <li>
                <span className="font-medium">All Contributions Received:</span> The pool admin will process your payout once all members have contributed for the round
              </li>
              <li>
                <span className="font-medium">Payout Processing:</span> The administrator sends funds via your preferred payment app (Venmo, PayPal, Zelle, or Cash App)
              </li>
              <li>
                <span className="font-medium">Confirmation:</span> The administrator marks the payout as complete in the system
              </li>
            </ol>

            <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Payout Status Indicators</h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 mr-3">
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Pending</p>
                    <p className="text-xs text-gray-500">Waiting for all contributions to be received</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 mr-3">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Processing</p>
                    <p className="text-xs text-gray-500">Funds are being transferred to your account</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 mr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Completed</p>
                    <p className="text-xs text-gray-500">Funds have been successfully transferred</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Early Payout Requests</h3>
            <p className="mt-2 text-gray-700">
              Need your payout earlier than your scheduled position? You can request an early payout:
            </p>
            <ul className="mt-2 space-y-2 text-gray-700 list-disc pl-5">
              <li>Go to your pool page and find the "Request Early Payout" option</li>
              <li>Submit your request with a reason</li>
              <li>The pool administrator will review and approve/deny the request</li>
              <li>If approved, you'll swap positions with the original recipient</li>
            </ul>
            <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-100">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Note:</span> Early payout requests are subject to pool administrator approval. Make sure to communicate with your pool members about any scheduling changes.
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Payment History & Records</h3>
            <p className="mt-2 text-gray-700">
              Tracking your financial transactions is easy with Juntas Seguras:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Transaction History:</span> View all your contributions and received payouts in your dashboard
              </li>
              <li>
                <span className="font-medium">Pool Records:</span> Each pool page shows the complete history of contributions and payouts
              </li>
              <li>
                <span className="font-medium">Audit Trail:</span> All financial actions are logged for transparency
              </li>
            </ul>

            <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-100">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  While Juntas Seguras provides financial records, we recommend consulting with a tax professional regarding any tax implications of your pool participation.
                </p>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Payment Security</h3>
            <p className="mt-2 text-gray-700">
              Your account and information are protected by multiple security measures:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Peer-to-Peer Payments:</span> Contributions are sent directly between members using trusted payment apps
              </li>
              <li>
                <span className="font-medium">Payment Tracking:</span> All contributions and payouts are tracked in the app for transparency
              </li>
              <li>
                <span className="font-medium">Two-Factor Authentication:</span> Required for all users to protect accounts
              </li>
              <li>
                <span className="font-medium">Identity Verification:</span> Optional Stripe Identity verification helps build trust among pool members
              </li>
              <li>
                <span className="font-medium">Audit Trail:</span> All financial actions are logged for accountability
              </li>
            </ul>
          </section>
        </div>

        <div className="flex justify-between mt-10 pt-4 border-t border-gray-200">
          <Link href="/help/documentation/pools">
            <Button
              variant="outline"
              className="flex items-center"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous: Savings Pools
            </Button>
          </Link>
          <Link href="/help/documentation/security">
            <Button
              className="flex items-center"
            >
              Next: Security
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
