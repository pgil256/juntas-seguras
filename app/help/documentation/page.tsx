'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileText, Book, Search, Download } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Documentation page component
export default function DocumentationPage() {
  const router = useRouter();
  const [selectedSection, setSelectedSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  // Help documentation sections
  const documentationSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Learn the basics of using Juntas Seguras',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      id: 'account-management',
      title: 'Account Management',
      description: 'Managing your account settings and profile',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      id: 'creating-pools',
      title: 'Creating Pools',
      description: 'How to set up and manage savings pools',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      id: 'managing-members',
      title: 'Managing Members',
      description: 'Adding and managing pool members',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      id: 'payments',
      title: 'Payments & Finances',
      description: 'Payment methods, contributions, and payouts',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Setting up and managing notifications',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      id: 'security',
      title: 'Security Features',
      description: 'Protecting your account and transactions',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      description: 'Solutions to common issues',
      icon: <FileText className="h-5 w-5" />,
    },
  ];

  // Content for each documentation section
  const documentationContent = {
    'getting-started': (
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
            <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Tip:</span> A complete profile with a photo helps build trust within your savings pools. Members are more likely to join pools with verified users.
              </p>
            </div>
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

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Making Contributions</h3>
            <p className="mt-2 text-gray-700">
              Depending on your pool's settings, you'll need to make regular contributions:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>You'll receive notifications when payments are due</li>
              <li>Contributions can be made via bank transfer, debit card, or digital payment platforms</li>
              <li>The system tracks all contributions and payouts for complete transparency</li>
              <li>You can set up automatic payments to ensure you never miss a contribution</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Getting Support</h3>
            <p className="mt-2 text-gray-700">
              If you need help at any point, there are several ways to get assistance:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>Browse our <a href="/help" className="text-blue-600 hover:underline">Help Center</a> for answers to common questions</li>
              <li>Contact our support team via <a href="/help/contact" className="text-blue-600 hover:underline">email or contact form</a></li>
              <li>Use the live chat feature during business hours</li>
              <li>Check out our <a href="#" className="text-blue-600 hover:underline">video tutorials</a> for visual guidance</li>
            </ul>
          </section>
        </div>

        <div className="flex justify-between mt-10 pt-4 border-t border-gray-200">
          <div>
            {/* No previous on first page */}
          </div>
          <Button 
            onClick={() => setSelectedSection('account-management')}
            className="flex items-center"
          >
            Next: Account Management
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    ),

    'account-management': (
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
          </section>

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
          </section>

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

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Payment Methods</h3>
            <p className="mt-2 text-gray-700">
              Manage your payment methods for contributions and payouts:
            </p>
            <ol className="mt-2 space-y-3 text-gray-700 list-decimal pl-5">
              <li>
                <span className="font-medium">Add Payment Method:</span> Go to "Settings" → "Payment Methods" → "Add Method"
              </li>
              <li>
                <span className="font-medium">Supported Methods:</span> Add bank accounts, debit cards, or connect to digital payment platforms
              </li>
              <li>
                <span className="font-medium">Default Method:</span> Set your preferred default payment method for automatic contributions
              </li>
              <li>
                <span className="font-medium">Remove Method:</span> Delete payment methods that are no longer used
              </li>
            </ol>
          </section>

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
          </section>
        </div>

        <div className="flex justify-between mt-10 pt-4 border-t border-gray-200">
          <Button 
            onClick={() => setSelectedSection('getting-started')}
            variant="outline"
            className="flex items-center"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous: Getting Started
          </Button>
          <Button 
            onClick={() => setSelectedSection('creating-pools')}
            className="flex items-center"
          >
            Next: Creating Pools
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    ),

    'creating-pools': (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Creating and Managing Pools</h2>
        <p className="text-gray-700">
          Learn how to create, customize, and effectively manage your savings pools.
        </p>

        <div className="space-y-6 mt-8">
          <section>
            <h3 className="text-xl font-semibold text-gray-900">Creating Your First Pool</h3>
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

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Pool Types and Settings</h3>
            <p className="mt-2 text-gray-700">
              Juntas Seguras offers several types of pools to meet different needs:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Standard Pool:</span> Equal contributions and payouts with a predetermined order
              </li>
              <li>
                <span className="font-medium">Variable Contribution Pool:</span> Members can contribute different amounts, with payouts proportional to contributions
              </li>
              <li>
                <span className="font-medium">Emergency Fund Pool:</span> Contributions are made regularly, but funds are only withdrawn for emergencies with group approval
              </li>
              <li>
                <span className="font-medium">Goal-Based Pool:</span> Focused on saving for a specific shared goal, like a group vacation
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Managing Your Pool</h3>
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
                <span className="font-medium">Communication:</span> Send announcements and messages to pool members
              </li>
              <li>
                <span className="font-medium">Pool Settings:</span> Adjust pool parameters if necessary, with member approval
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Pool Analytics</h3>
            <p className="mt-2 text-gray-700">
              Gain insights into your pool's performance and member activity:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Payment History:</span> Track all contributions and payouts over time
              </li>
              <li>
                <span className="font-medium">Member Activity:</span> Monitor member participation and payment timeliness
              </li>
              <li>
                <span className="font-medium">Pool Progress:</span> Visualize progress toward completion
              </li>
              <li>
                <span className="font-medium">Financial Reports:</span> Generate detailed reports for record-keeping
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Handling Issues</h3>
            <p className="mt-2 text-gray-700">
              Tips for addressing common challenges in pool management:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Late Payments:</span> Send automatic reminders and establish clear consequences
              </li>
              <li>
                <span className="font-medium">Member Withdrawal:</span> Have a process for handling members who need to leave
              </li>
              <li>
                <span className="font-medium">Payout Disputes:</span> Use the platform's resolution tools to address disagreements
              </li>
              <li>
                <span className="font-medium">Pool Modification:</span> Follow the established process for changing pool terms
              </li>
            </ul>
            <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-100">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Important:</span> Clearly communicate pool rules and expectations at the beginning. Having written guidelines helps prevent misunderstandings later.
              </p>
            </div>
          </section>
        </div>

        <div className="flex justify-between mt-10 pt-4 border-t border-gray-200">
          <Button 
            onClick={() => setSelectedSection('account-management')}
            variant="outline"
            className="flex items-center"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous: Account Management
          </Button>
          <Button 
            onClick={() => setSelectedSection('managing-members')}
            className="flex items-center"
          >
            Next: Managing Members
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    ),
    
    // More sections would be defined here...
    'managing-members': (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Managing Pool Members</h2>
        <p className="text-gray-700">
          Learn how to invite members, manage their roles, and handle member-related activities in your savings pools.
        </p>

        <div className="space-y-6 mt-8">
          <section>
            <h3 className="text-xl font-semibold text-gray-900">Inviting Members</h3>
            <p className="mt-2 text-gray-700">
              There are several ways to add members to your pool:
            </p>
            <ol className="mt-2 space-y-3 text-gray-700 list-decimal pl-5">
              <li>
                <span className="font-medium">Email Invitations:</span> Send direct invitations to members' email addresses
              </li>
              <li>
                <span className="font-medium">Shareable Link:</span> Generate a joining link that you can share via messaging apps or social media
              </li>
              <li>
                <span className="font-medium">QR Code:</span> Share a scannable QR code that takes users directly to your pool
              </li>
              <li>
                <span className="font-medium">In-App Search:</span> Find existing Juntas Seguras users by name or email
              </li>
            </ol>
            <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Tip:</span> When inviting members, include a personal message explaining the pool's purpose and why you'd like them to join. This increases acceptance rates.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Member Roles and Permissions</h3>
            <p className="mt-2 text-gray-700">
              Different roles have different capabilities within the pool:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Administrator:</span> Full control over pool settings, member management, and financial operations
              </li>
              <li>
                <span className="font-medium">Co-Administrator:</span> Can help manage the pool but with limited ability to change core settings
              </li>
              <li>
                <span className="font-medium">Member:</span> Can view pool information, make contributions, and receive payouts
              </li>
              <li>
                <span className="font-medium">Pending Member:</span> Has been invited but hasn't completed the joining process
              </li>
            </ul>
            <p className="mt-4 text-gray-700">
              To change a member's role, go to the Members tab, select the member, and use the "Change Role" option.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Managing the Payout Order</h3>
            <p className="mt-2 text-gray-700">
              You can organize the payout schedule in several ways:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Random Assignment:</span> The system randomly assigns positions to members
              </li>
              <li>
                <span className="font-medium">Manual Assignment:</span> As the administrator, you can assign specific positions
              </li>
              <li>
                <span className="font-medium">First-Come-First-Served:</span> Members select their positions when they join
              </li>
              <li>
                <span className="font-medium">Need-Based:</span> Members can request specific positions based on financial needs
              </li>
            </ul>
            <p className="mt-4 text-gray-700">
              To modify the payout order, go to the Pool Settings → Payout Schedule and use the reordering tools.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Handling Member Exits</h3>
            <p className="mt-2 text-gray-700">
              Sometimes members need to leave the pool before it's completed:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Voluntary Exit (Pre-Payout):</span> If a member hasn't received their payout, they can exit and receive their contributions back
              </li>
              <li>
                <span className="font-medium">Voluntary Exit (Post-Payout):</span> If a member has already received their payout, they're obligated to continue contributions
              </li>
              <li>
                <span className="font-medium">Replacement:</span> Find a new member to take over the departing member's position
              </li>
              <li>
                <span className="font-medium">Administrator Removal:</span> Remove non-compliant members after appropriate warnings
              </li>
            </ul>
            <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-100">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Important:</span> Clearly establish exit rules before the pool begins. Document these in the pool's terms to avoid disputes later.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Member Communication</h3>
            <p className="mt-2 text-gray-700">
              Maintain clear communication with pool members:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Pool Chat:</span> Use the built-in messaging system for group discussions
              </li>
              <li>
                <span className="font-medium">Announcements:</span> Send important updates to all members simultaneously
              </li>
              <li>
                <span className="font-medium">Payment Reminders:</span> Automatically notify members of upcoming contribution deadlines
              </li>
              <li>
                <span className="font-medium">Direct Messages:</span> Communicate privately with individual members
              </li>
            </ul>
          </section>
        </div>

        <div className="flex justify-between mt-10 pt-4 border-t border-gray-200">
          <Button 
            onClick={() => setSelectedSection('creating-pools')}
            variant="outline"
            className="flex items-center"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous: Creating Pools
          </Button>
          <Button 
            onClick={() => setSelectedSection('payments')}
            className="flex items-center"
          >
            Next: Payments & Finances
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    ),

    'payments': (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Payments & Finances</h2>
        <p className="text-gray-700">
          Learn about payment methods, contribution schedules, payout processes, and financial management features.
        </p>

        <div className="space-y-6 mt-8">
          <section>
            <h3 className="text-xl font-semibold text-gray-900">Payment Methods</h3>
            <p className="mt-2 text-gray-700">
              Juntas Seguras supports multiple payment options:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Bank Transfers:</span> Connect your bank account for direct deposits and withdrawals
              </li>
              <li>
                <span className="font-medium">Debit Cards:</span> Link a debit card for quick payments
              </li>
              <li>
                <span className="font-medium">Digital Payment Platforms:</span> Connect services like PayPal, Venmo, or Zelle
              </li>
              <li>
                <span className="font-medium">Credit Cards:</span> Available but with a small processing fee
              </li>
            </ul>
            <p className="mt-4 text-gray-700">
              To add or manage payment methods, go to Settings → Payment Methods.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Making Contributions</h3>
            <p className="mt-2 text-gray-700">
              Contributing to your pools is simple:
            </p>
            <ol className="mt-2 space-y-3 text-gray-700 list-decimal pl-5">
              <li>
                <span className="font-medium">Manual Payments:</span> Make contributions through the app when you receive a reminder
              </li>
              <li>
                <span className="font-medium">Automatic Payments:</span> Set up recurring payments to ensure you never miss a contribution
              </li>
              <li>
                <span className="font-medium">Early Contributions:</span> Pay ahead of schedule if you prefer
              </li>
              <li>
                <span className="font-medium">Late Payments:</span> Make overdue payments with any applicable late fees
              </li>
            </ol>
            <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Tip:</span> Set up automatic payments to avoid late contributions. You can schedule them to occur a few days before the deadline for peace of mind.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Receiving Payouts</h3>
            <p className="mt-2 text-gray-700">
              When it's your turn to receive the pool funds:
            </p>
            <ol className="mt-2 space-y-3 text-gray-700 list-decimal pl-5">
              <li>
                <span className="font-medium">Payout Notification:</span> You'll receive a notification when your payout is ready
              </li>
              <li>
                <span className="font-medium">Payout Method:</span> Select your preferred method to receive funds
              </li>
              <li>
                <span className="font-medium">Processing Time:</span> Funds typically arrive within 1-3 business days, depending on your selected method
              </li>
              <li>
                <span className="font-medium">Confirmation:</span> Acknowledge receipt of your payout in the app
              </li>
            </ol>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Tracking Financial Activity</h3>
            <p className="mt-2 text-gray-700">
              Keep track of all your financial transactions:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Transaction History:</span> View a complete record of all contributions and payouts
              </li>
              <li>
                <span className="font-medium">Pool Balance:</span> See the current balance of each pool you're participating in
              </li>
              <li>
                <span className="font-medium">Upcoming Payments:</span> View calendar of future contributions and payouts
              </li>
              <li>
                <span className="font-medium">Financial Reports:</span> Generate statements for personal records or tax purposes
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Managing Fees</h3>
            <p className="mt-2 text-gray-700">
              Understanding the fee structure:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Platform Fee:</span> A small service fee (1%) is applied to pool payouts
              </li>
              <li>
                <span className="font-medium">Payment Processing Fees:</span> Some payment methods may incur additional fees from the provider
              </li>
              <li>
                <span className="font-medium">Late Payment Fees:</span> Pools can set custom late payment penalties
              </li>
              <li>
                <span className="font-medium">Premium Features:</span> Some advanced features require a subscription ($5/month)
              </li>
            </ul>
            <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-100">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Note:</span> All fees are transparently displayed before you confirm any transaction.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Security Measures</h3>
            <p className="mt-2 text-gray-700">
              Your financial information is protected by:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Encryption:</span> Bank-level encryption for all financial data
              </li>
              <li>
                <span className="font-medium">Secure Processing:</span> PCI-compliant payment processing
              </li>
              <li>
                <span className="font-medium">Verification:</span> Identity verification for large transactions
              </li>
              <li>
                <span className="font-medium">Escrow Protection:</span> All pool funds are held in secure escrow until distribution
              </li>
            </ul>
          </section>
        </div>

        <div className="flex justify-between mt-10 pt-4 border-t border-gray-200">
          <Button 
            onClick={() => setSelectedSection('managing-members')}
            variant="outline"
            className="flex items-center"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous: Managing Members
          </Button>
          <Button 
            onClick={() => setSelectedSection('security')}
            className="flex items-center"
          >
            Next: Security Features
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    ),

    'security': (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Security Features</h2>
        <p className="text-gray-700">
          Learn about the security features available to protect your account and transactions on Juntas Seguras.
        </p>

        <div className="space-y-6 mt-8">
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
                <span className="font-medium">Authentication Methods:</span> Choose between app-based, SMS, or email verification
              </li>
              <li>
                <span className="font-medium">App-Based 2FA:</span> Use authentication apps like Google Authenticator or Authy
              </li>
              <li>
                <span className="font-medium">Backup Codes:</span> Generate and safely store backup codes for emergency access
              </li>
            </ol>
            <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Recommendation:</span> App-based 2FA provides the strongest security. SMS and email methods are convenient but slightly less secure.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Account Activity Logging</h3>
            <p className="mt-2 text-gray-700">
              Monitor account activity to detect unauthorized access:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Activity Log:</span> View a detailed record of all account actions
              </li>
              <li>
                <span className="font-medium">Login History:</span> See when and where your account was accessed
              </li>
              <li>
                <span className="font-medium">Device Management:</span> Review and manage devices with access to your account
              </li>
              <li>
                <span className="font-medium">Suspicious Activity Alerts:</span> Receive notifications about unusual login attempts
              </li>
            </ul>
            <p className="mt-4 text-gray-700">
              To view your activity log, go to Profile → Security → Account Activity.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Password Security</h3>
            <p className="mt-2 text-gray-700">
              Best practices for account password protection:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Strong Passwords:</span> Use a combination of letters, numbers, and special characters
              </li>
              <li>
                <span className="font-medium">Regular Updates:</span> Change your password every 3-6 months
              </li>
              <li>
                <span className="font-medium">Password Reset:</span> Use the "Forgot Password" feature if you suspect compromise
              </li>
              <li>
                <span className="font-medium">Unique Passwords:</span> Don't reuse passwords from other websites
              </li>
            </ul>
            <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-100">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Security Tip:</span> Consider using a password manager to generate and store complex, unique passwords for all your accounts.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Financial Security</h3>
            <p className="mt-2 text-gray-700">
              How we protect your financial information and transactions:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Encryption:</span> All financial data is encrypted with bank-level security
              </li>
              <li>
                <span className="font-medium">Secure Payments:</span> PCI-compliant payment processing
              </li>
              <li>
                <span className="font-medium">Transaction Verification:</span> Critical transactions require additional verification
              </li>
              <li>
                <span className="font-medium">Fraud Monitoring:</span> Automated systems detect and prevent suspicious transactions
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Privacy Controls</h3>
            <p className="mt-2 text-gray-700">
              Manage what information is visible to others:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Profile Privacy:</span> Control which profile details are visible to other users
              </li>
              <li>
                <span className="font-medium">Pool Visibility:</span> Choose whether your pools appear in public listings
              </li>
              <li>
                <span className="font-medium">Activity Sharing:</span> Decide if your pool activities can be seen by others
              </li>
              <li>
                <span className="font-medium">Data Management:</span> Review and manage your personal data
              </li>
            </ul>
            <p className="mt-4 text-gray-700">
              Adjust your privacy settings by going to Profile → Settings → Privacy.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Security Best Practices</h3>
            <p className="mt-2 text-gray-700">
              Additional recommendations to keep your account secure:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Suspicious Communications:</span> Be wary of unexpected emails or messages about your account
              </li>
              <li>
                <span className="font-medium">Public Networks:</span> Avoid accessing your account on public Wi-Fi networks
              </li>
              <li>
                <span className="font-medium">Device Security:</span> Keep your devices password-protected and updated
              </li>
              <li>
                <span className="font-medium">Account Review:</span> Regularly check your account activity for unauthorized changes
              </li>
              <li>
                <span className="font-medium">Contact Information:</span> Keep your email and phone number up to date for recovery purposes
              </li>
            </ul>
          </section>
        </div>

        <div className="flex justify-between mt-10 pt-4 border-t border-gray-200">
          <Button 
            onClick={() => setSelectedSection('payments')}
            variant="outline"
            className="flex items-center"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous: Payments & Finances
          </Button>
          <Button 
            onClick={() => setSelectedSection('troubleshooting')}
            className="flex items-center"
          >
            Next: Troubleshooting
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    ),

    'troubleshooting': (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Troubleshooting</h2>
        <p className="text-gray-700">
          Solutions to common issues and guidance for resolving problems with Juntas Seguras.
        </p>

        <div className="space-y-6 mt-8">
          <section>
            <h3 className="text-xl font-semibold text-gray-900">Account Access Issues</h3>
            <p className="mt-2 text-gray-700">
              Solutions for problems with logging in:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Forgotten Password:</span> Use the "Forgot Password" link on the login screen to reset your password via email
              </li>
              <li>
                <span className="font-medium">2FA Issues:</span> Use your backup codes if you can't access your authentication device. Contact support if you've lost both
              </li>
              <li>
                <span className="font-medium">Email Access Lost:</span> Contact support with proof of identity to recover your account
              </li>
              <li>
                <span className="font-medium">Account Locked:</span> Accounts may be temporarily locked after multiple failed login attempts. Wait 30 minutes or contact support
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Payment Problems</h3>
            <p className="mt-2 text-gray-700">
              Resolving issues with contributions and payouts:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Failed Contributions:</span> Check your payment method's balance and information. Try an alternative payment method if needed
              </li>
              <li>
                <span className="font-medium">Delayed Payouts:</span> Payouts typically process within 1-3 business days. If it's been longer, check the status in your account or contact support
              </li>
              <li>
                <span className="font-medium">Payment Method Issues:</span> Ensure your payment information is current and valid. Remove and re-add payment methods if necessary
              </li>
              <li>
                <span className="font-medium">Incorrect Amounts:</span> Immediately report any discrepancies in contribution or payout amounts to support
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Pool Management Challenges</h3>
            <p className="mt-2 text-gray-700">
              Solutions for issues with pool administration:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Member Not Joining:</span> Verify the invitation was sent correctly. Resend invitations or try an alternative method like a shareable link
              </li>
              <li>
                <span className="font-medium">Pool Settings Changes:</span> Most settings can only be changed before the pool starts or with unanimous member approval. Contact support for specific situations
              </li>
              <li>
                <span className="font-medium">Member Contribution Issues:</span> Use the reminder system to notify members of due payments. Consider enabling automatic payments for consistent members
              </li>
              <li>
                <span className="font-medium">Member Disputes:</span> Use the built-in messaging system to resolve minor issues. For significant disputes, contact support for mediation
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">App Performance Issues</h3>
            <p className="mt-2 text-gray-700">
              Troubleshooting technical problems:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">App Crashes:</span> Ensure your device's operating system is up to date. Try closing and reopening the app, or log out and log back in
              </li>
              <li>
                <span className="font-medium">Slow Performance:</span> Check your internet connection. Clear your browser cache if using the web version
              </li>
              <li>
                <span className="font-medium">Notification Issues:</span> Verify notification settings are enabled both in the app and on your device
              </li>
              <li>
                <span className="font-medium">Data Not Loading:</span> Refresh the page or restart the app. Check your internet connection stability
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900">Contacting Support</h3>
            <p className="mt-2 text-gray-700">
              When to reach out and what information to provide:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">When to Contact Support:</span> Reach out if you've tried the suggested troubleshooting steps and still have issues
              </li>
              <li>
                <span className="font-medium">Support Channels:</span> Email, in-app chat, contact form, or phone support during business hours
              </li>
              <li>
                <span className="font-medium">Information to Provide:</span> Include your username, the specific issue, steps you've already tried, and any error messages
              </li>
              <li>
                <span className="font-medium">Response Time:</span> Support typically responds within 24 hours. For urgent payment or security issues, use the priority support option
              </li>
            </ul>
            <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Tip:</span> Screenshots or screen recordings of the issue can significantly help support diagnose and resolve your problem faster.
              </p>
            </div>
          </section>
        </div>

        <div className="flex justify-between mt-10 pt-4 border-t border-gray-200">
          <Button 
            onClick={() => setSelectedSection('security')}
            variant="outline"
            className="flex items-center"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous: Security Features
          </Button>
          <Button 
            onClick={() => router.push('/help')}
            className="flex items-center"
          >
            Return to Help Center
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  };

  // Function to filter documentation sections based on search query
  const filterSections = () => {
    if (!searchQuery.trim()) return documentationSections;
    
    return documentationSections.filter(section => 
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-4 sm:px-0">
          <div className="mb-6">
            <Button
              variant="ghost"
              className="flex items-center text-gray-600 hover:text-gray-900"
              onClick={() => router.push('/help')}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Help Center
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar */}
            <div className="md:w-1/4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <Book className="h-5 w-5 mr-2" />
                    Documentation
                  </CardTitle>
                  <CardDescription>
                    Comprehensive guides for Juntas Seguras
                  </CardDescription>
                  <div className="mt-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search documents..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    {filterSections().map((section) => (
                      <Button
                        key={section.id}
                        variant="ghost"
                        className={`w-full justify-start ${
                          selectedSection === section.id
                            ? 'bg-blue-50 text-blue-700'
                            : ''
                        }`}
                        onClick={() => setSelectedSection(section.id)}
                      >
                        {section.icon}
                        <span className="ml-2">{section.title}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
                <div className="p-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full flex items-center"
                    onClick={() => window.open('/docs/juntas-seguras-user-guide.pdf', '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF Guide
                  </Button>
                </div>
              </Card>
            </div>

            {/* Main Content */}
            <div className="md:w-3/4">
              <Card className="p-6">
                {documentationContent[selectedSection]}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}