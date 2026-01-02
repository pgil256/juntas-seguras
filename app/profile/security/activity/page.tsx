'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ActivityLogViewer from '../../../../components/security/ActivityLogViewer';
import { Button } from '../../../../components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function ActivityLogPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id || null;

  if (!userId) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-4 sm:px-0">
          <p className="text-gray-500">Please sign in to view your account activity.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-4 sm:px-0">
          <div className="mb-6">
            <Button
              variant="ghost"
              className="flex items-center text-gray-600 hover:text-gray-900"
              onClick={() => router.push('/profile')}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Profile
            </Button>
            
            <h1 className="text-2xl font-semibold text-gray-800 mt-4">Account Activity</h1>
            <p className="text-gray-500">
              View recent activity and security events for your account
            </p>
          </div>
          
          <div className="mt-6">
            <ActivityLogViewer userId={userId} />
          </div>
          
          <div className="mt-8 bg-gray-100 border border-gray-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Security Tips</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                <span>Regularly review your account activity for unauthorized actions</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                <span>If you notice any suspicious activity, change your password immediately</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                <span>Enable two-factor authentication for additional account security</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                <span>Don't share your account credentials with anyone</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}