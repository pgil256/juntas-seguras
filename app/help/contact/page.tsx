'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ContactForm from '@/components/support/ContactForm';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MessageCircle, ChevronLeft, FileText, HelpCircle } from 'lucide-react';

// Mock user data - in a real app, this would come from authentication context
const mockUserData = {
  userId: 'user123',
  name: 'Maria Gonzalez',
  email: 'maria.gonzalez@example.com',
};

export default function ContactPage() {
  const router = useRouter();
  const [formSubmitted, setFormSubmitted] = useState(false);
  
  const handleFormSuccess = () => {
    setFormSubmitted(true);
    setTimeout(() => {
      router.push('/help');
    }, 2000);
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
            {/* Contact Form */}
            <div className="flex-1">
              <ContactForm
                userId={mockUserData.userId}
                userName={mockUserData.name}
                userEmail={mockUserData.email}
                onSuccess={handleFormSuccess}
                supportCategories={[
                  { value: 'general', label: 'General Question' },
                  { value: 'account', label: 'Account Issue' },
                  { value: 'pool', label: 'Pool Management' },
                  { value: 'payment', label: 'Payment Issue' },
                  { value: 'technical', label: 'Technical Problem' },
                  { value: 'feedback', label: 'Feedback & Suggestions' },
                  { value: 'security', label: 'Security Concern' },
                ]}
              />
            </div>
            
            {/* Support Information */}
            <div className="md:w-1/3">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold text-gray-800">Contact Information</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Multiple ways to get in touch with our support team
                  </p>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Mail className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-900">Email Support</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Our team typically responds within 24 hours
                      </p>
                      <a href="mailto:support@juntasseguras.com" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-800">
                        support@juntasseguras.com
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Phone className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-900">Phone Support</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Available Monday-Friday, 9am-5pm ET
                      </p>
                      <p className="mt-2 text-sm font-medium">+1 (555) 123-4567</p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <MessageCircle className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-900">Live Chat</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get instant help from our support team
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => alert('Live chat would open here')}
                      >
                        Start Chat
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <HelpCircle className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-900">Self-Service</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Find answers in our help documentation
                      </p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="mt-1 pl-0 text-blue-600"
                        onClick={() => router.push('/help')}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Browse Help Center
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Business Hours */}
              <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6">
                  <h3 className="text-sm font-medium text-gray-900">Business Hours</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Monday - Friday</span>
                      <span className="font-medium">9:00 AM - 8:00 PM ET</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Saturday</span>
                      <span className="font-medium">10:00 AM - 5:00 PM ET</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Sunday</span>
                      <span className="font-medium">Closed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}