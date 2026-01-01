'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientComponentBoundary from '../../ClientComponentBoundary';
import { Button } from '../../../components/ui/button';
import { ChevronLeft, ChevronRight, FileText, Book, Search, Download } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';

// Help categories for sidebar
const helpCategories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of using Juntas Seguras',
  },
  {
    id: 'account-management',
    title: 'Account Management',
    description: 'Managing your account settings and profile',
  },
  {
    id: 'creating-pools',
    title: 'Creating Pools',
    description: 'How to set up and manage savings pools',
  },
  {
    id: 'managing-members',
    title: 'Managing Members',
    description: 'Adding and managing pool members',
  },
  {
    id: 'payments',
    title: 'Payments & Finances',
    description: 'Payment methods, contributions, and payouts',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Setting up and managing notifications',
  },
  {
    id: 'security',
    title: 'Security Features',
    description: 'Protecting your account and transactions',
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'Solutions to common issues',
  },
];

// Documentation page component
export default function DocumentationPage() {
  const router = useRouter();
  const [selectedSection, setSelectedSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <ClientComponentBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-4 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">Help Documentation</h2>
              <p className="mt-1 text-gray-500">Detailed guides to help you use Juntas Seguras effectively</p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Button
                variant="outline"
                onClick={() => router.push('/help')}
                className="flex items-center"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Help Center
              </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search documentation..."
            className="pl-10 py-6 text-lg w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            key="doc-search-input"
          />
        </div>

        {/* Main content grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h3 className="font-medium text-gray-900">Categories</h3>
              </div>
              <nav className="space-y-1 p-2">
                {helpCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedSection(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      selectedSection === category.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{category.title}</div>
                    <div className="text-sm text-gray-500 truncate">{category.description}</div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main content */}
          <div className="md:col-span-3">
            <Card>
              <CardContent className="pt-6">
                {selectedSection === 'getting-started' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Getting Started with Juntas Seguras</h2>
                    <p className="text-gray-700">
                      Welcome to Juntas Seguras! This guide will help you get started with our platform for creating and managing savings pools with friends, family, or community members.
                    </p>

                    <div className="space-y-6 mt-8">
                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">What is Juntas Seguras?</h3>
                        <p className="mt-2 text-gray-700">
                          Juntas Seguras is a digital platform based on the traditional "tanda" or "susu" concept — a group savings method where members contribute regularly to a pool, and each member takes turns receiving the total pool amount. Our platform makes this process secure, transparent, and easy to manage.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">How to Create Your Account</h3>
                        <ol className="mt-2 space-y-3 text-gray-700 list-decimal pl-5">
                          <li>
                            <span className="font-medium">Sign Up:</span> Visit the homepage and click on "Sign Up". Enter your email address, create a password, and provide your basic information.
                          </li>
                          <li>
                            <span className="font-medium">Verify Your Email:</span> Check your inbox for a verification email and click the confirmation link.
                          </li>
                          <li>
                            <span className="font-medium">Complete Your Profile:</span> Add a profile picture and verify your phone number to build trust with other pool members.
                          </li>
                          <li>
                            <span className="font-medium">Set Up Security:</span> We highly recommend enabling two-factor authentication for added security.
                          </li>
                        </ol>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Your First Savings Pool</h3>
                        <p className="mt-2 text-gray-700">
                          You can either create your own pool or join an existing one:
                        </p>
                        <h4 className="mt-4 text-lg font-medium text-gray-900">Creating a Pool</h4>
                        <ol className="mt-2 space-y-3 text-gray-700 list-decimal pl-5">
                          <li>Click on "Create Pool" from your dashboard</li>
                          <li>Enter the pool details: name, description, contribution amount, and frequency</li>
                          <li>Set the number of members and pool duration</li>
                          <li>Invite members via email or share the pool link</li>
                        </ol>
                        
                        <h4 className="mt-4 text-lg font-medium text-gray-900">Joining a Pool</h4>
                        <ol className="mt-2 space-y-3 text-gray-700 list-decimal pl-5">
                          <li>Click on the invitation link you received</li>
                          <li>Review the pool details and terms</li>
                          <li>Set up your payment method</li>
                          <li>Confirm your participation</li>
                        </ol>
                      </section>
                    </div>
                  </div>
                )}

                {selectedSection === 'account-management' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Account Management</h2>
                    <p className="text-gray-700">
                      Learn how to manage your Juntas Seguras account, update your profile information, and customize your settings.
                    </p>

                    <div className="space-y-6 mt-8">
                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Your Profile Information</h3>
                        <p className="mt-2 text-gray-700">
                          Your profile helps build trust with other members. Keep your information up to date and complete to establish credibility within the community.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Security Settings</h3>
                        <p className="mt-2 text-gray-700">
                          Protect your account with strong security measures such as two-factor authentication, regular password updates, and activity monitoring.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Notification Preferences</h3>
                        <p className="mt-2 text-gray-700">
                          Customize how and when you receive notifications about payments, pool activities, and system announcements to stay informed without being overwhelmed.
                        </p>
                      </section>
                    </div>
                  </div>
                )}

                {selectedSection === 'creating-pools' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Creating and Managing Pools</h2>
                    <p className="text-gray-700">
                      Learn how to create, customize, and effectively manage your savings pools.
                    </p>

                    <div className="space-y-6 mt-8">
                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Creating Your First Pool</h3>
                        <p className="mt-2 text-gray-700">
                          Set up a new savings pool by defining the contribution amount, frequency, member count, and other parameters to match your group's needs.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Pool Types and Settings</h3>
                        <p className="mt-2 text-gray-700">
                          Explore different pool configurations, including standard pools, variable contribution pools, emergency fund pools, and goal-based pools.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Managing Your Pool</h3>
                        <p className="mt-2 text-gray-700">
                          Use the administrator tools to oversee payments, adjust settings, communicate with members, and handle any issues that arise during the pool's lifetime.
                        </p>
                      </section>
                    </div>
                  </div>
                )}

                {selectedSection === 'managing-members' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Managing Pool Members</h2>
                    <p className="text-gray-700">
                      Learn how to invite members, manage their roles, and handle member-related activities in your savings pools.
                    </p>

                    <div className="space-y-6 mt-8">
                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Inviting Members</h3>
                        <p className="mt-2 text-gray-700">
                          Send invitations through various methods and track their status to build your pool membership efficiently.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Member Roles and Permissions</h3>
                        <p className="mt-2 text-gray-700">
                          Understand the different roles members can have, from administrators to regular participants, and the capabilities associated with each role.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Handling Member Exits</h3>
                        <p className="mt-2 text-gray-700">
                          Learn the proper procedures for when members need to leave the pool before completion, including financial implications and replacement options.
                        </p>
                      </section>
                    </div>
                  </div>
                )}

                {selectedSection === 'payments' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Payments & Finances</h2>
                    <p className="text-gray-700">
                      Learn about payment methods, contribution schedules, payout processes, and financial management features.
                    </p>

                    <div className="space-y-6 mt-8">
                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Payment Methods</h3>
                        <p className="mt-2 text-gray-700">
                          Set up and manage different payment methods to make contributions and receive payouts smoothly and securely.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Making Contributions</h3>
                        <p className="mt-2 text-gray-700">
                          Understand how to make regular contributions on time, set up automatic payments, and handle any payment-related issues.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Receiving Payouts</h3>
                        <p className="mt-2 text-gray-700">
                          Learn about the payout process, how to request your funds when it's your turn, and the various ways to receive your money.
                        </p>
                      </section>
                    </div>
                  </div>
                )}

                {selectedSection === 'notifications' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
                    <p className="text-gray-700">
                      Learn how to manage alerts and stay informed about all activities related to your pools.
                    </p>

                    <div className="space-y-6 mt-8">
                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Types of Notifications</h3>
                        <p className="mt-2 text-gray-700">
                          Understand the different types of notifications you can receive, from payment reminders to pool updates and system announcements.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Customizing Notification Settings</h3>
                        <p className="mt-2 text-gray-700">
                          Configure your notification preferences to receive alerts through your preferred channels (email, in-app) and with your preferred frequency.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Managing Notification Volume</h3>
                        <p className="mt-2 text-gray-700">
                          Learn strategies for handling notifications efficiently, especially if you're a member of multiple pools or have various roles.
                        </p>
                      </section>
                    </div>
                  </div>
                )}

                {selectedSection === 'security' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Security Features</h2>
                    <p className="text-gray-700">
                      Learn about the security features available to protect your account and transactions on Juntas Seguras.
                    </p>

                    <div className="space-y-6 mt-8">
                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Two-Factor Authentication</h3>
                        <p className="mt-2 text-gray-700">
                          Add an extra layer of security to your account by requiring a second verification step during login, using authentication apps or email.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Account Activity Monitoring</h3>
                        <p className="mt-2 text-gray-700">
                          Keep track of all actions taken on your account, identify suspicious activities, and take immediate action if needed.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Payment Protection</h3>
                        <p className="mt-2 text-gray-700">
                          Understand how your financial information and transactions are protected with encryption, secure processing, and fraud monitoring.
                        </p>
                      </section>
                    </div>
                  </div>
                )}

                {selectedSection === 'troubleshooting' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Troubleshooting</h2>
                    <p className="text-gray-700">
                      Solutions to common issues and guidance for resolving problems with Juntas Seguras.
                    </p>

                    <div className="space-y-6 mt-8">
                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Account Access Issues</h3>
                        <p className="mt-2 text-gray-700">
                          Resolve problems with logging in, forgotten passwords, two-factor authentication, and account recovery.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Payment Problems</h3>
                        <p className="mt-2 text-gray-700">
                          Find solutions for failed contributions, delayed payouts, payment method issues, and discrepancies in financial transactions.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-semibold text-gray-900">Pool Management Challenges</h3>
                        <p className="mt-2 text-gray-700">
                          Address issues related to inviting members, changing pool settings, tracking contributions, and resolving disputes between members.
                        </p>
                      </section>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </ClientComponentBoundary>
  );
}