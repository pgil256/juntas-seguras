// app/help/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  HelpCircle,
  ChevronDown,
  Mail,
  Phone,
  MessageCircle,
  FileText,
  User,
  DollarSign,
  CreditCard,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// At the top of app/help/page.tsx, just after imports
const Users = ({ className }: { className?: string }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
};

const Settings = ({ className }: { className?: string }) => {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
};

// FAQ data organized by categories
const faqData = {
  general: [
    {
      question: "What is Juntas Seguras?",
      answer:
        "Juntas Seguras is a platform that helps you create and manage savings pools with friends, family, or community members. It's based on the traditional 'tanda' or 'susu' concept where group members contribute regularly, and each member takes turns receiving the pool of money.",
    },
    {
      question: "How does a savings pool work?",
      answer:
        "Each member contributes a fixed amount on a regular schedule (weekly, bi-weekly, or monthly). The pooled amount is given to one member at a time in a predetermined order until all members have received their payout. This continues until the pool's duration ends.",
    },
    {
      question: "Is Juntas Seguras free to use?",
      answer:
        "Basic features are free for all users. We charge a small service fee of 1% on payouts to maintain the platform and ensure secure transactions. Premium features are available to subscribers at $5 per month.",
    },
    {
      question: "How safe is my information?",
      answer:
        "We use bank-level encryption to protect your personal and financial information. We also implement two-factor authentication, regular security audits, and strict access controls to ensure your data stays secure.",
    },
  ],
  account: [
    {
      question: "How do I create an account?",
      answer:
        "Click on 'Sign Up' on the homepage and follow the instructions. You'll need to provide your email address, create a password, and verify your email. For enhanced security, we recommend setting up two-factor authentication once your account is created.",
    },
    {
      question: "How can I reset my password?",
      answer:
        "Click on 'Forgot Password' on the login page. Enter your registered email address, and we'll send you a link to reset your password. If you don't receive the email, check your spam folder or contact our support team.",
    },
    {
      question: "Can I have multiple accounts?",
      answer:
        "No, each user is limited to one account. This helps maintain the integrity of our pools and ensures fair participation. If you need to change your email address, you can do so in your account settings.",
    },
    {
      question: "How do I delete my account?",
      answer:
        "To delete your account, go to Account Settings → Privacy, and click on 'Delete Account'. Note that you cannot delete your account if you have active pools or pending transactions.",
    },
  ],
  pools: [
    {
      question: "How do I create a new pool?",
      answer:
        "Click on the 'Create Pool' button from your dashboard. Follow the steps to set up the pool parameters, including the contribution amount, frequency, number of members, and duration. You can then invite members to join your pool.",
    },
    {
      question: "How many pools can I join?",
      answer:
        "You can join as many pools as you'd like, but we recommend carefully considering your financial capacity before joining multiple pools. Ensure you can meet all contribution commitments on time.",
    },
    {
      question: "How is the payout order determined?",
      answer:
        "By default, the payout order is randomly assigned when the pool starts. However, the pool administrator can adjust the order if all members agree. In some cases, members can request specific positions based on their needs.",
    },
    {
      question: "What happens if a member doesn't pay?",
      answer:
        "If a member misses a payment, they'll receive automatic reminders. If they continue to miss payments, the pool administrator can take action, which may include removing them from the pool. The system has safeguards to help ensure the integrity of the pool is maintained.",
    },
    {
      question: "Can I leave a pool once it's started?",
      answer:
        "You can leave a pool, but there are some restrictions to protect other members. If you've already received your payout, you must continue to make contributions until the end. If you haven't received a payout, you can leave and receive your contributed funds back, minus any applicable fees.",
    },
  ],
  payments: [
    {
      question: "What payment methods are accepted?",
      answer:
        "We accept bank transfers, debit cards, and major digital payment platforms like PayPal, Venmo, and Zelle. Credit cards are also accepted, but may include an additional processing fee of 2.5%.",
    },
    {
      question: "How often do I need to contribute?",
      answer:
        "Contribution frequency depends on how your pool is set up. Pools can be weekly, bi-weekly, or monthly. The system will automatically remind you when your contribution is due.",
    },
    {
      question: "Are there any fees for using Juntas Seguras?",
      answer:
        "Basic account features are free. We charge a 1% service fee on payouts to cover transaction costs and platform maintenance. Premium features require a subscription of $5 per month.",
    },
    {
      question: "What happens to my money between contributions and payouts?",
      answer:
        "All funds are held in a secure escrow account until they're distributed to the designated member according to the pool schedule. We never use pool funds for any other purpose.",
    },
  ],
  security: [
    {
      question: "How do you protect my financial information?",
      answer:
        "We use bank-level encryption (256-bit SSL) for all data transmission and storage. We don't store complete payment information on our servers. All transactions are processed through our secure payment partners.",
    },
    {
      question: "What if someone scams me in a pool?",
      answer:
        "We have multiple safeguards to prevent scams, including identity verification, payment protection, and dispute resolution. If you suspect fraudulent activity, contact our support team immediately, and we'll investigate.",
    },
    {
      question: "Should I join pools with people I don't know?",
      answer:
        "We recommend joining pools with people you know and trust. If you join public pools, review the pool history and member ratings carefully. Our secure payment system helps reduce risks, but personal trust is still important.",
    },
    {
      question: "How do you verify users' identities?",
      answer:
        "We use a combination of email verification, phone verification, and optional ID verification for enhanced security. For pools with higher contribution amounts, we require additional verification steps.",
    },
  ],
};

// Help categories for sidebar
const helpCategories = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: <User className="h-5 w-5 mr-2" />,
  },
  {
    id: "managing-pools",
    label: "Managing Pools",
    icon: <Users className="h-5 w-5 mr-2" />,
  },
  {
    id: "payments",
    label: "Payments & Finances",
    icon: <DollarSign className="h-5 w-5 mr-2" />,
  },
  {
    id: "invitations",
    label: "Invitations & Members",
    icon: <Mail className="h-5 w-5 mr-2" />,
  },
  {
    id: "troubleshooting",
    label: "Troubleshooting",
    icon: <AlertCircle className="h-5 w-5 mr-2" />,
  },
  {
    id: "account",
    label: "Account Settings",
    icon: <Settings className="h-5 w-5 mr-2" />,
  },
];

export default function HelpPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("getting-started");

  // Filter FAQs based on search query
  const filteredFaqs = searchQuery
    ? Object.values(faqData)
        .flat()
        .filter(
          (faq) =>
            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
        )
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-4 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">
                Help & Support
              </h2>
              <p className="mt-1 text-gray-500">
                Find answers to your questions and learn more about Juntas
                Seguras
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Button 
                variant="outline" 
                className="flex items-center"
                onClick={() => alert('Live chat would open here')}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Live Chat
              </Button>
              <Button 
                className="flex items-center"
                onClick={() => router.push('/help/support')}
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Support Tickets
              </Button>
            </div>
          </div>
        </div>

        <div className="relative mt-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search for answers..."
            className="pl-10 py-6 text-lg w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {searchQuery ? (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  Found {filteredFaqs.length} results for "{searchQuery}"
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredFaqs.length > 0 ? (
                  <Accordion type="single" collapsible className="space-y-4">
                    {filteredFaqs.map((faq, index) => (
                      <AccordionItem
                        key={index}
                        value={`search-result-${index}`}
                      >
                        <AccordionTrigger className="text-left">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent>
                          <p className="text-gray-700">{faq.answer}</p>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="text-center py-8">
                    <HelpCircle className="h-12 w-12 text-gray-300 mx-auto" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      No results found
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Try searching with different keywords or browse our help
                      categories
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* Quick Links */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="mt-4 text-lg font-medium">
                      Beginner's Guide
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      New to Juntas Seguras? Start here to learn the basics
                    </p>
                    <Button 
                      variant="link" 
                      className="mt-2"
                      onClick={() => router.push('/help/documentation')}
                    >
                      Read the guide
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-green-100 rounded-full">
                      <MessageCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="mt-4 text-lg font-medium">
                      Support Tickets
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Create a ticket or check the status of your existing tickets
                    </p>
                    <Button 
                      variant="link" 
                      className="mt-2"
                      onClick={() => router.push('/help/support')}
                    >
                      Manage tickets
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-purple-100 rounded-full">
                      <CreditCard className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="mt-4 text-lg font-medium">Payment Help</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Learn about payment methods, schedules, and
                      troubleshooting
                    </p>
                    <Button 
                      variant="link" 
                      className="mt-2"
                      onClick={() => router.push('/help/documentation?section=payments')}
                    >
                      Payment guide
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* FAQ Tabs */}
            <div className="mt-12">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">
                Frequently Asked Questions
              </h3>

              <Tabs defaultValue="general">
                <TabsList className="mb-6">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="account">Account</TabsTrigger>
                  <TabsTrigger value="pools">Pools</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>

                {Object.entries(faqData).map(([category, questions]) => (
                  <TabsContent key={category} value={category}>
                    <Card>
                      <CardContent className="pt-6">
                        <Accordion
                          type="single"
                          collapsible
                          className="space-y-4"
                        >
                          {questions.map((faq, index) => (
                            <AccordionItem key={index} value={`faq-${index}`}>
                              <AccordionTrigger className="text-left">
                                {faq.question}
                              </AccordionTrigger>
                              <AccordionContent>
                                <p className="text-gray-700">{faq.answer}</p>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            {/* Help Center Section */}
            <div className="mt-12">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">
                Help Center
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Sidebar */}
                <div className="md:col-span-3">
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 border-b">
                      <h4 className="font-medium text-gray-900">
                        Help Categories
                      </h4>
                    </div>
                    <ul>
                      {helpCategories.map((category) => (
                        <li key={category.id}>
                          <button
                            className={`w-full text-left px-4 py-3 flex items-center hover:bg-gray-50 ${
                              selectedCategory === category.id
                                ? "bg-blue-50 text-blue-700"
                                : ""
                            }`}
                            onClick={() => setSelectedCategory(category.id)}
                          >
                            {category.icon}
                            {category.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Content */}
                <div className="md:col-span-9">
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {
                          helpCategories.find((c) => c.id === selectedCategory)
                            ?.label
                        }
                      </CardTitle>
                      <CardDescription>
                        Detailed guides and tutorials to help you get the most
                        out of Juntas Seguras
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {selectedCategory === "getting-started" && (
                          <>
                            <h3 className="text-lg font-medium text-gray-900">
                              Welcome to Juntas Seguras
                            </h3>
                            <p className="text-gray-700">
                              Juntas Seguras makes it easy to create and manage
                              savings pools with people you trust. This guide
                              will help you get started with the platform and
                              understand how it works.
                            </p>

                            <h4 className="text-md font-medium text-gray-900 mt-4">
                              Step 1: Create Your Account
                            </h4>
                            <p className="text-gray-700">
                              Sign up with your email address and set up your
                              profile. We recommend adding a profile picture and
                              verifying your phone number to build trust with
                              other members.
                            </p>

                            <h4 className="text-md font-medium text-gray-900 mt-4">
                              Step 2: Create or Join a Pool
                            </h4>
                            <p className="text-gray-700">
                              You can create your own pool and invite members,
                              or join an existing pool if you've received an
                              invitation. When creating a pool, you'll need to
                              set the contribution amount, frequency, and
                              duration.
                            </p>

                            <h4 className="text-md font-medium text-gray-900 mt-4">
                              Step 3: Set Up Your Payment Method
                            </h4>
                            <p className="text-gray-700">
                              Add a payment method to your account to make
                              regular contributions. We support bank transfers,
                              debit cards, and various digital payment
                              platforms.
                            </p>

                            <div className="mt-6">
                              <Button className="flex items-center">
                                <FileText className="h-4 w-4 mr-2" />
                                Download Full Guide (PDF)
                              </Button>
                            </div>
                          </>
                        )}

                        {selectedCategory !== "getting-started" && (
                          <div className="text-center py-8">
                            <FileText className="h-12 w-12 text-gray-300 mx-auto" />
                            <h3 className="mt-4 text-lg font-medium text-gray-900">
                              Help Guide
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                              Detailed help content for this category is being
                              developed. Please check back soon or contact our
                              support team for assistance.
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Contact section */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900">
              Still need help?
            </h3>
            <p className="mt-2 text-gray-600">
              Our support team is ready to assist you with any questions or
              issues
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm flex items-center">
                <Mail className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Email Support
                  </div>
                  <div className="text-sm text-gray-500">
                    support@juntasseguras.com
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm flex items-center">
                <Phone className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Phone Support
                  </div>
                  <div className="text-sm text-gray-500">+1 (555) 123-4567</div>
                </div>
              </div>
              <Button 
                className="bg-white p-4 rounded-lg shadow-sm flex items-center hover:bg-blue-50 h-auto"
                variant="ghost"
                onClick={() => router.push('/help/support')}
              >
                <HelpCircle className="h-5 w-5 text-blue-600 mr-3" />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">
                    Support Tickets
                  </div>
                  <div className="text-sm text-gray-500">
                    Create or track your tickets
                  </div>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

