'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Users, Calendar, DollarSign, Shuffle, Settings } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Card } from '../../../../components/ui/card';
import { Separator } from '../../../../components/ui/separator';

export default function PoolsDocumentationPage() {
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Savings Pools</h2>
        <p className="text-gray-700">
          Learn how to create, join, and manage savings pools with Juntas Seguras.
        </p>

        <div className="space-y-6 mt-8">
          <section>
            <h3 className="text-xl font-semibold text-gray-900">What is a Savings Pool?</h3>
            <p className="mt-2 text-gray-700">
              A savings pool (also known as a tanda, susu, or rotating savings club) is a group of individuals who agree to contribute a fixed amount of money on a regular schedule. Each member takes a turn receiving the full pool amount. This continues until all members have received their payout.
            </p>
            
            <div className="my-6 bg-blue-50 p-4 rounded-md border border-blue-100">
              <h4 className="text-md font-medium text-blue-800 mb-2">How Pools Work</h4>
              <div className="space-y-2 text-sm text-blue-700">
                <p>1. A group of people agree to save together</p>
                <p>2. Each person contributes the same amount regularly (e.g., $50 weekly)</p>
                <p>3. One member receives the total pool each cycle</p>
                <p>4. Cycles continue until all members have received a payout</p>
                <p>5. The pool may continue for another round once complete</p>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Creating a Pool</h3>
            <p className="mt-2 text-gray-700">
              Follow these steps to create a new savings pool:
            </p>
            <ol className="mt-2 space-y-3 text-gray-700 list-decimal pl-5">
              <li>
                <span className="font-medium">Start the Process:</span> From your dashboard, click the "Create Pool" button
              </li>
              <li>
                <span className="font-medium">Basic Information:</span> Enter a name and description for your pool
              </li>
              <li>
                <span className="font-medium">Contribution Details:</span> Set the contribution amount and frequency (weekly, bi-weekly, monthly)
              </li>
              <li>
                <span className="font-medium">Membership:</span> Set the maximum number of members and whether the pool is public or invitation-only
              </li>
              <li>
                <span className="font-medium">Payout Schedule:</span> Choose how the payout order will be determined (random, fixed, or by request)
              </li>
              <li>
                <span className="font-medium">Rules and Terms:</span> Establish any additional rules or requirements for members
              </li>
            </ol>
            <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Tip:</span> Start with smaller contribution amounts and trusted members for your first pool. As you gain experience, you can create larger pools with more members.
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Pool Types</h3>
            <p className="mt-2 text-gray-700">
              Juntas Seguras offers several types of pools to meet different needs:
            </p>
            
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center mb-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">Standard Pool</h4>
                </div>
                <p className="text-sm text-gray-700">
                  Equal contributions and payouts with a predetermined order. Most common and straightforward format.
                </p>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center mb-2">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center mr-2">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">Variable Contribution</h4>
                </div>
                <p className="text-sm text-gray-700">
                  Members can contribute different amounts, with payouts proportional to contributions. Good for groups with varying income.
                </p>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center mb-2">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">Emergency Fund</h4>
                </div>
                <p className="text-sm text-gray-700">
                  Contributions are made regularly, but funds are only withdrawn for emergencies with group approval.
                </p>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center mb-2">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center mr-2">
                    <Settings className="h-4 w-4 text-orange-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">Goal-Based</h4>
                </div>
                <p className="text-sm text-gray-700">
                  Focused on saving for a specific shared goal, like a group vacation or community project.
                </p>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Pool Administration</h3>
            <p className="mt-2 text-gray-700">
              As a pool administrator, you have several tools to manage your pool effectively:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Dashboard:</span> View pool status, upcoming payments, and recent activity
              </li>
              <li>
                <span className="font-medium">Member Management:</span> Add, remove, or replace members as needed
              </li>
              <li>
                <span className="font-medium">Payment Tracking:</span> Monitor contributions and send reminders to members
              </li>
              <li>
                <span className="font-medium">Payout Management:</span> Schedule and confirm payouts to members
              </li>
              <li>
                <span className="font-medium">Discussions:</span> Start discussion threads with @mentions to communicate with specific members or the whole group
              </li>
              <li>
                <span className="font-medium">Payment Reminders:</span> Configure automatic reminder emails for upcoming contributions
              </li>
              <li>
                <span className="font-medium">Pool Settings:</span> Adjust pool parameters if necessary, with member approval
              </li>
            </ul>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Joining a Pool</h3>
            <p className="mt-2 text-gray-700">
              You can join a pool in several ways:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Direct Invitation:</span> Accept an invitation sent to your email
              </li>
              <li>
                <span className="font-medium">Invitation Link:</span> Click on a link shared by a pool administrator
              </li>
              <li>
                <span className="font-medium">Pool Directory:</span> Browse public pools and request to join
              </li>
            </ul>
            
            <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-100">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Important:</span> Before joining a pool, carefully review the contribution amount, frequency, and total duration to ensure you can meet all financial commitments.
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Pool Analytics</h3>
            <p className="mt-2 text-gray-700">
              Track your pool's performance with detailed analytics:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Contribution History:</span> View a complete record of all payments made
              </li>
              <li>
                <span className="font-medium">Payout Schedule:</span> See upcoming and past payouts
              </li>
              <li>
                <span className="font-medium">Member Performance:</span> Track on-time payments and participation
              </li>
              <li>
                <span className="font-medium">Financial Reports:</span> Generate reports for personal record-keeping
              </li>
            </ul>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-md font-medium text-gray-900 mb-3">Sample Pool Timeline</h4>
              <div className="relative">
                <div className="absolute top-0 bottom-0 left-4 w-0.5 bg-gray-200"></div>
                <div className="space-y-6 relative">
                  <div className="flex items-start">
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 z-10">
                      <DollarSign className="h-4 w-4 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="font-medium text-gray-900">Round 1: Maria's Payout</p>
                      <p className="text-sm text-gray-500">February 15, 2026</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 z-10">
                      <DollarSign className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="ml-4">
                      <p className="font-medium text-gray-900">Round 2: Carlos's Payout</p>
                      <p className="text-sm text-gray-500">March 15, 2026</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 z-10">
                      <DollarSign className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="ml-4">
                      <p className="font-medium text-gray-900">Round 3: Ana's Payout</p>
                      <p className="text-sm text-gray-500">April 15, 2026</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex justify-between mt-10 pt-4 border-t border-gray-200">
          <Link href="/help/documentation/account">
            <Button
              variant="outline"
              className="flex items-center"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous: Account Management
            </Button>
          </Link>
          <Link href="/help/documentation/payments">
            <Button
              className="flex items-center"
            >
              Next: Payments & Finances
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}