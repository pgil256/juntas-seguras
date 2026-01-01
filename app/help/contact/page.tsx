'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ContactForm from '../../../components/support/ContactForm';
import { Button } from '../../../components/ui/button';
import { Mail, Phone, ChevronLeft, FileText, HelpCircle } from 'lucide-react';
import ClientOnly from '../../../components/ClientOnly';

// User data - in a real app, this would come from authentication context
const userData = {
  userId: '',
  name: '',
  email: '',
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
    <>
      <div className="flex flex-col md:flex-row gap-6">
            {/* Contact Form */}
            <div className="flex-1">
              <ClientOnly>
                <ContactForm
                  userId={userData.userId}
                  userName={userData.name}
                  userEmail={userData.email}
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
              </ClientOnly>
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
                      <a href="mailto:juntasseguras@gmail.com" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-800">
                        juntasseguras@gmail.com
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
                      <p className="mt-2 text-sm font-medium">+1 (570) 855-0384</p>
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
                      <ClientOnly>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="mt-1 pl-0 text-blue-600"
                          onClick={() => router.push('/help')}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Browse Help Center
                        </Button>
                      </ClientOnly>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
    </>
  );
}