'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, CreditCard, DollarSign, Calendar, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Card } from '../../../../components/ui/card';
import { Separator } from '../../../../components/ui/separator';
import { Badge } from '../../../../components/ui/badge';

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
            <h3 className="text-xl font-semibold text-gray-900">Payment Methods</h3>
            <p className="mt-2 text-gray-700">
              Juntas Seguras supports multiple secure payment options to match your preferences:
            </p>
            
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-start">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Bank Account</h4>
                  <p className="text-sm text-gray-700 mt-1">
                    Connect your bank account for direct deposits and withdrawals. Most secure for regular payments.
                  </p>
                  <Badge className="mt-2 bg-blue-50 text-blue-700 hover:bg-blue-100">Recommended</Badge>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-start">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <CreditCard className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Debit Card</h4>
                  <p className="text-sm text-gray-700 mt-1">
                    Link a debit card for convenient payments. Good for quick setup and flexibility.
                  </p>
                  <Badge className="mt-2 bg-gray-50 text-gray-700 hover:bg-gray-100">No fees</Badge>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-start">
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <DollarSign className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Digital Payment Services</h4>
                  <p className="text-sm text-gray-700 mt-1">
                    Connect PayPal, Venmo, or Zelle for alternative payment options.
                  </p>
                  <Badge className="mt-2 bg-gray-50 text-gray-700 hover:bg-gray-100">Varies by service</Badge>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-start">
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <CreditCard className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Credit Card</h4>
                  <p className="text-sm text-gray-700 mt-1">
                    Use credit cards when other methods aren't available. Higher processing fees apply.
                  </p>
                  <Badge className="mt-2 bg-red-50 text-red-700 hover:bg-red-100">2.5% fee</Badge>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-100">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Important:</span> For security reasons, Juntas Seguras doesn't store your complete payment information. All transactions are processed through our secure payment partners.
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Setting Up Payment Methods</h3>
            <p className="mt-2 text-gray-700">
              Follow these steps to add a payment method to your account:
            </p>
            <ol className="mt-2 space-y-3 text-gray-700 list-decimal pl-5">
              <li>
                <span className="font-medium">Access Payment Settings:</span> Go to Settings → Payment Methods
              </li>
              <li>
                <span className="font-medium">Add New Method:</span> Click "Add Payment Method" and select the type
              </li>
              <li>
                <span className="font-medium">Enter Details:</span> Provide the required information for your selected payment method
              </li>
              <li>
                <span className="font-medium">Verification:</span> Complete any verification steps required by the payment provider
              </li>
              <li>
                <span className="font-medium">Set Default:</span> Optionally set this method as your default for automatic payments
              </li>
            </ol>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Making Contributions</h3>
            <p className="mt-2 text-gray-700">
              Contributing to your pools is simple and can be automated:
            </p>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-2">Manual Contributions</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs font-medium text-blue-600">1</span>
                    </div>
                    <span>Receive notification when payment is due</span>
                  </li>
                  <li className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs font-medium text-blue-600">2</span>
                    </div>
                    <span>Go to the pool page and click "Make Payment"</span>
                  </li>
                  <li className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs font-medium text-blue-600">3</span>
                    </div>
                    <span>Select your payment method</span>
                  </li>
                  <li className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs font-medium text-blue-600">4</span>
                    </div>
                    <span>Confirm the transaction</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-2">Automatic Contributions</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs font-medium text-green-600">1</span>
                    </div>
                    <span>Go to pool settings and select "Auto-pay"</span>
                  </li>
                  <li className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs font-medium text-green-600">2</span>
                    </div>
                    <span>Choose your preferred payment method</span>
                  </li>
                  <li className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs font-medium text-green-600">3</span>
                    </div>
                    <span>Set payment schedule (on due date or X days before)</span>
                  </li>
                  <li className="flex items-start">
                    <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs font-medium text-green-600">4</span>
                    </div>
                    <span>Receive confirmations when payments process</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Tip:</span> Setting up automatic payments ensures you never miss a contribution deadline, maintaining your good standing in the pool.
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
                <span className="font-medium">Confirm Receipt Method:</span> Verify or update your preferred payout method
              </li>
              <li>
                <span className="font-medium">Processing Time:</span> Funds typically arrive within 1-3 business days, depending on your selected method
              </li>
              <li>
                <span className="font-medium">Confirmation:</span> You'll receive a confirmation when the funds are sent
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
                    <p className="font-medium text-sm">Scheduled</p>
                    <p className="text-xs text-gray-500">Your payout is scheduled but not yet processed</p>
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
            <h3 className="text-xl font-semibold text-gray-900">Payment History & Records</h3>
            <p className="mt-2 text-gray-700">
              Tracking your financial transactions is easy with Juntas Seguras:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Transaction History:</span> View all your contributions and received payouts
              </li>
              <li>
                <span className="font-medium">Receipts:</span> Download PDF receipts for any transaction
              </li>
              <li>
                <span className="font-medium">Financial Reports:</span> Generate statements by date range, pool, or transaction type
              </li>
              <li>
                <span className="font-medium">Tax Documentation:</span> Access year-end summaries for tax purposes
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
              Your financial information is protected by multiple security measures:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Encryption:</span> Bank-level encryption for all payment data
              </li>
              <li>
                <span className="font-medium">Tokenization:</span> Payment details are tokenized, not stored directly
              </li>
              <li>
                <span className="font-medium">Secure Processing:</span> All transactions use PCI-compliant payment processors
              </li>
              <li>
                <span className="font-medium">Fraud Protection:</span> Automated systems detect and prevent suspicious activity
              </li>
              <li>
                <span className="font-medium">Two-Factor Authentication:</span> Required for all significant financial transactions
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