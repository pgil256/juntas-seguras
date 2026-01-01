'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, FileText, Users, DollarSign, AlertTriangle, Scale, Ban } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import PageLayout from '../../components/PageLayout';

export default function TermsPage() {
  return (
    <PageLayout>
      <Card className="p-6 max-w-4xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
          </div>
          <p className="text-sm text-gray-500">Last updated: January 2025</p>

          <p className="text-gray-700">
            Welcome to Juntas Seguras. By accessing or using our platform, you agree to be bound by these Terms of Service. Please read them carefully before using our services.
          </p>

          <Separator />

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
            <p className="text-gray-700">
              By creating an account or using Juntas Seguras, you agree to these Terms of Service and our Privacy Policy. If you do not agree to these terms, you may not use our platform. You must be at least 18 years old to use this service.
            </p>
          </section>

          <Separator />

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">2. Description of Service</h2>
            <p className="text-gray-700">
              Juntas Seguras provides a platform for organizing and participating in community savings pools (also known as "tandas," "roscas," or "susus"). Our platform facilitates:
            </p>
            <ul className="list-disc pl-5 text-gray-700 space-y-2">
              <li>Creation and management of savings pools</li>
              <li>Tracking of contributions and payouts</li>
              <li>Communication between pool members</li>
              <li>Payment processing for contributions</li>
            </ul>
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">3. User Accounts</h2>
            </div>
            <ul className="list-disc pl-5 text-gray-700 space-y-2">
              <li>You must provide accurate and complete information when creating an account</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must notify us immediately of any unauthorized use of your account</li>
              <li>You may not share your account or allow others to access it</li>
              <li>We reserve the right to suspend or terminate accounts that violate these terms</li>
            </ul>
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">4. Pool Participation</h2>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">Creating Pools</h3>
                <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
                  <li>Pool organizers are responsible for setting clear terms and rules</li>
                  <li>Organizers must accurately represent pool terms to potential members</li>
                  <li>Organizers are responsible for managing the pool fairly and transparently</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">Joining Pools</h3>
                <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
                  <li>By joining a pool, you commit to making all required contributions on time</li>
                  <li>Review all pool terms carefully before joining</li>
                  <li>Understand that missing contributions affects all pool members</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">Contributions and Payouts</h3>
                <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
                  <li>Contributions must be made according to the pool schedule</li>
                  <li>Payouts are distributed according to the pool's predetermined order</li>
                  <li>Late or missed contributions may result in penalties as defined by pool rules</li>
                </ul>
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="flex items-center space-x-2">
              <Ban className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">5. Prohibited Activities</h2>
            </div>
            <p className="text-gray-700">You agree not to:</p>
            <ul className="list-disc pl-5 text-gray-700 space-y-2">
              <li>Use the platform for any illegal purpose or in violation of any laws</li>
              <li>Create fraudulent pools or misrepresent pool terms</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use automated systems to access the platform without permission</li>
              <li>Interfere with the proper functioning of the platform</li>
              <li>Engage in money laundering or other financial crimes</li>
              <li>Impersonate others or provide false information</li>
            </ul>
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">6. Risks and Disclaimers</h2>
            </div>

            <div className="p-4 bg-yellow-50 rounded-md border border-yellow-100">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Important:</span> Savings pools involve financial risk. Please read this section carefully.
              </p>
            </div>

            <ul className="list-disc pl-5 text-gray-700 space-y-2">
              <li>Juntas Seguras is a platform that facilitates savings pools but does not guarantee contributions from other members</li>
              <li>You participate in pools at your own risk</li>
              <li>We are not responsible for losses resulting from other members failing to contribute</li>
              <li>We do not provide financial, legal, or tax advice</li>
              <li>Past pool performance does not guarantee future results</li>
              <li>You should only participate with funds you can afford to have at risk</li>
            </ul>
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="flex items-center space-x-2">
              <Scale className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">7. Limitation of Liability</h2>
            </div>
            <p className="text-gray-700">
              To the maximum extent permitted by law, Juntas Seguras shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or other intangible losses, resulting from:
            </p>
            <ul className="list-disc pl-5 text-gray-700 space-y-2">
              <li>Your use or inability to use the platform</li>
              <li>Any conduct or content of other users</li>
              <li>Unauthorized access to your account or data</li>
              <li>Failed contributions or payouts by pool members</li>
              <li>Any errors, bugs, or service interruptions</li>
            </ul>
          </section>

          <Separator />

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">8. Dispute Resolution</h2>
            <p className="text-gray-700">
              For disputes between pool members, we encourage resolution through direct communication. We may provide mediation tools but are not obligated to resolve disputes. For disputes with Juntas Seguras, you agree to first attempt to resolve the issue informally by contacting our support team.
            </p>
          </section>

          <Separator />

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">9. Intellectual Property</h2>
            <p className="text-gray-700">
              The Juntas Seguras platform, including its design, features, and content, is owned by us and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works based on our platform without our written permission.
            </p>
          </section>

          <Separator />

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">10. Termination</h2>
            <p className="text-gray-700">
              We may suspend or terminate your account at any time for violations of these terms or for any other reason at our discretion. You may close your account at any time, subject to completing any outstanding pool obligations. Upon termination, your right to use the platform ceases immediately.
            </p>
          </section>

          <Separator />

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">11. Changes to Terms</h2>
            <p className="text-gray-700">
              We may modify these Terms of Service at any time. We will notify users of material changes via email or through the platform. Your continued use of the platform after changes take effect constitutes acceptance of the new terms.
            </p>
          </section>

          <Separator />

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">12. Contact</h2>
            <p className="text-gray-700">
              If you have questions about these Terms of Service, please contact us through our{' '}
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
