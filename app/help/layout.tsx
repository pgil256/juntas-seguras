'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Home, 
  HelpCircle, 
  Book, 
  Mail, 
  MessageSquare
} from 'lucide-react';
import PageLayout from '../../components/PageLayout';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import ClientOnly from '../../components/ClientOnly';

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pathname, setPathname] = useState('');
  
  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

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
          
          <div className="mb-6">
            <ul className="flex flex-row list-none space-x-2">
              {helpNavItems.map((item) => (
                <li key={item.href} className="inline-block">
                  <ClientOnly>
                    <Link href={item.href}>
                      <Button
                        variant={isActive(item.href) ? "default" : "ghost"}
                        className={`flex items-center ${isActive(item.href) ? "" : "text-gray-700"}`}
                      >
                        {item.icon}
                        {item.label}
                      </Button>
                    </Link>
                  </ClientOnly>
                </li>
              ))}
            </ul>
          </div>
          
          <Separator className="my-4" />
          
          {children}
        </div>
      </div>
    </PageLayout>
  );
}