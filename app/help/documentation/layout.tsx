'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ClientComponentBoundary from '../../ClientComponentBoundary';
import { 
  FileText, 
  User, 
  Users, 
  DollarSign, 
  Settings, 
  Shield, 
  Terminal, 
  AlertCircle 
} from 'lucide-react';
import { Button } from '../../../components/ui/button';

export default function HelpDocumentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Define documentation section items
  const docSections = [
    { 
      id: 'getting-started',
      href: '/help/documentation', 
      label: 'Getting Started',
      icon: <FileText className="h-4 w-4 mr-2" />
    },
    { 
      id: 'account',
      href: '/help/documentation/account', 
      label: 'Account Management',
      icon: <User className="h-4 w-4 mr-2" />
    },
    { 
      id: 'pools',
      href: '/help/documentation/pools', 
      label: 'Savings Pools',
      icon: <Users className="h-4 w-4 mr-2" />
    },
    { 
      id: 'payments',
      href: '/help/documentation/payments', 
      label: 'Payments & Finances',
      icon: <DollarSign className="h-4 w-4 mr-2" />
    },
    { 
      id: 'security',
      href: '/help/documentation/security', 
      label: 'Security',
      icon: <Shield className="h-4 w-4 mr-2" />
    },
    { 
      id: 'settings',
      href: '/help/documentation/settings', 
      label: 'Account Settings',
      icon: <Settings className="h-4 w-4 mr-2" />
    },
    { 
      id: 'troubleshooting',
      href: '/help/documentation/troubleshooting', 
      label: 'Troubleshooting',
      icon: <AlertCircle className="h-4 w-4 mr-2" />
    },
    { 
      id: 'technical',
      href: '/help/documentation/technical', 
      label: 'Technical Guide',
      icon: <Terminal className="h-4 w-4 mr-2" />
    },
  ];

  // Helper to determine if a link is active
  const isActive = (path: string) => pathname === path;

  return (
    <ClientComponentBoundary>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar navigation */}
      <div className="md:w-1/4 lg:w-1/5">
        <div className="bg-white rounded-lg shadow overflow-hidden sticky top-20">
          <div className="p-4 border-b">
            <h3 className="font-medium text-gray-900">Documentation</h3>
            <p className="text-sm text-gray-500 mt-1">
              Complete guide to using Juntas Seguras
            </p>
          </div>
          <nav className="p-2">
            {docSections.map((section) => (
              <Link href={section.href} key={section.id}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-sm mb-1 ${
                    isActive(section.href) 
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {section.icon}
                  {section.label}
                </Button>
              </Link>
            ))}
          </nav>
          <div className="p-4 bg-gray-50 border-t">
            <Link href="/help/contact">
              <Button variant="outline" className="w-full text-sm">
                Need More Help?
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="md:w-3/4 lg:w-4/5">
        {children}
      </div>
      </div>
    </ClientComponentBoundary>
  );
}