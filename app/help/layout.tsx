'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  HelpCircle, 
  Book, 
  Mail, 
  MessageSquare
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Define help navigation items
  const helpNavItems = [
    { 
      href: '/help', 
      label: 'Help Center',
      icon: <Home className="h-4 w-4 mr-2" />
    },
    { 
      href: '/help/documentation', 
      label: 'Documentation',
      icon: <Book className="h-4 w-4 mr-2" />
    },
    { 
      href: '/help/contact', 
      label: 'Contact Us',
      icon: <Mail className="h-4 w-4 mr-2" />
    },
    { 
      href: '/help/support', 
      label: 'Support Tickets',
      icon: <MessageSquare className="h-4 w-4 mr-2" />
    },
  ];

  // Helper to determine if a link is active
  const isActive = (path: string) => pathname === path;

  return (
    <PageLayout>
      <div className="bg-gradient-to-b from-blue-50 to-white pt-6 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center mb-4">
            <HelpCircle className="h-6 w-6 text-blue-600 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center mb-6 gap-3 sm:gap-1">
            {helpNavItems.map((item) => (
              <Link href={item.href} key={item.href}>
                <Button
                  variant={isActive(item.href) ? "default" : "ghost"}
                  className={`flex items-center ${isActive(item.href) ? "" : "text-gray-700"}`}
                >
                  {item.icon}
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
          
          <Separator className="my-4" />
          
          {children}
        </div>
      </div>
    </PageLayout>
  );
}