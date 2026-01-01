'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Shield, Eye, Database, Share2, Cookie, Mail } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import PageLayout from '../../components/PageLayout';

export default function PrivacyPage() {
  return (
    <PageLayout>
      <Card className="p-6 max-w-4xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          </div>
          <p className="text-sm text-gray-500">Last updated: January 2025</p>

          <p className="text-gray-700">
            At Juntas Seguras, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our community savings pool platform.
          </p>

          <Separator />

          <section className="space-y-4">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Information We Collect</h2>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">Personal Information</h3>
                <p className="mt-1 text-gray-700">
                  When you register for an account, we collect:
                </p>
                <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
                  <li>Name and email address</li>
                  <li>Phone number (optional)</li>
                  <li>Profile information you choose to provide</li>
                  <li>Authentication credentials (stored securely)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">Financial Information</h3>
                <p className="mt-1 text-gray-700">
                  To facilitate pool contributions and payouts, we may collect:
                </p>
                <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
                  <li>Payment method details (processed through secure third-party providers)</li>
                  <li>Transaction history within the platform</li>
                  <li>Contribution and payout records</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">Usage Information</h3>
                <p className="mt-1 text-gray-700">
                  We automatically collect certain information when you use our platform:
                </p>
                <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
                  <li>Device information and browser type</li>
                  <li>IP address and general location</li>
                  <li>Pages visited and features used</li>
                  <li>Login times and session duration</li>
                </ul>
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">How We Use Your Information</h2>
            </div>

            <p className="text-gray-700">We use the information we collect to:</p>
            <ul className="list-disc pl-5 text-gray-700 space-y-2">
              <li>Create and manage your account</li>
              <li>Facilitate participation in savings pools</li>
              <li>Process contributions and distribute payouts</li>
              <li>Send important notifications about your pools and account</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Improve our platform and develop new features</li>
              <li>Detect and prevent fraud or unauthorized activities</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="flex items-center space-x-2">
              <Share2 className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Information Sharing</h2>
            </div>

            <p className="text-gray-700">We do not sell your personal information. We may share your information only in the following circumstances:</p>
            <ul className="list-disc pl-5 text-gray-700 space-y-2">
              <li><span className="font-medium">With Pool Members:</span> Your name and contribution status may be visible to other members of pools you join</li>
              <li><span className="font-medium">Service Providers:</span> We work with trusted third parties who help us operate our platform (payment processors, hosting providers)</li>
              <li><span className="font-medium">Legal Requirements:</span> When required by law, court order, or government request</li>
              <li><span className="font-medium">Protection:</span> To protect the rights, property, or safety of Juntas Seguras, our users, or others</li>
            </ul>
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Data Security</h2>
            </div>

            <p className="text-gray-700">
              We implement appropriate technical and organizational measures to protect your personal information:
            </p>
            <ul className="list-disc pl-5 text-gray-700 space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication with optional two-factor authentication</li>
              <li>Regular security assessments and updates</li>
              <li>Limited access to personal data by authorized personnel only</li>
              <li>Secure payment processing through PCI-compliant providers</li>
            </ul>
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="flex items-center space-x-2">
              <Cookie className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Cookies and Tracking</h2>
            </div>

            <p className="text-gray-700">
              We use essential cookies to maintain your session and remember your preferences. We may also use analytics cookies to understand how users interact with our platform. You can control cookie settings through your browser.
            </p>
          </section>

          <Separator />

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Your Rights</h2>

            <p className="text-gray-700">Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-5 text-gray-700 space-y-2">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to or restrict certain processing</li>
              <li>Data portability</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>
            <p className="text-gray-700 mt-2">
              To exercise these rights, please contact us through the Help Center or email us directly.
            </p>
          </section>

          <Separator />

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Data Retention</h2>
            <p className="text-gray-700">
              We retain your personal information for as long as your account is active or as needed to provide you services. We may retain certain information as required by law or for legitimate business purposes, such as resolving disputes or enforcing our agreements.
            </p>
          </section>

          <Separator />

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Changes to This Policy</h2>
            <p className="text-gray-700">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.
            </p>
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Contact Us</h2>
            </div>
            <p className="text-gray-700">
              If you have questions about this Privacy Policy or our privacy practices, please contact us through our{' '}
              <Link href="/help/contact" className="text-blue-600 hover:underline">
                Help Center
              </Link>.
            </p>
          </section>

          <div className="mt-10 pt-4 border-t border-gray-200">
            <Link href="/">
              <Button variant="outline" className="flex items-center">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </PageLayout>
  );
}
