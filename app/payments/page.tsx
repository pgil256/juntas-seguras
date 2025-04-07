'use client';

import React, { useState } from 'react';
import {
  Download,
  Filter,
  ChevronDown,
  Search,
  DollarSign,
  PlusCircle
} from 'lucide-react';
import { PaymentProcessingModal } from '../../components/payments/PaymentProcessingModal';
import { PaymentMethodDialog } from '../../components/payments/PaymentMethodDialog';
import { PaymentMethodFormValues } from '../../components/payments/PaymentMethodForm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { usePaymentMethods } from '../../lib/hooks/usePaymentMethods';
import { PaymentDetails } from '../../types/payment';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function PaymentsPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/auth/signin?callbackUrl=/payments");
    },
  });
  
  const userId = session?.user?.id || '';
  
  // States for payment modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  
  // Use the payment methods hook
  const { 
    paymentMethods, 
    isLoading: isLoadingPaymentMethods, 
    error: paymentMethodsError,
    addPaymentMethod,
    removePaymentMethod,
    refreshPaymentMethods
  } = usePaymentMethods({ userId });
  
  // Payment details for the modal
  const paymentDetails: PaymentDetails = {
    poolName: 'N/A',
    amount: 0,
    dueDate: new Date().toISOString().split('T')[0],
    paymentMethods: paymentMethods,
  };

  // Payment modal handlers
  const handleAddPaymentMethod = () => {
    // Close payment modal and open payment method modal
    setShowPaymentModal(false);
    setShowPaymentMethodModal(true);
  };
  
  // Handle payment method addition
  const handlePaymentMethodSubmit = async (values: PaymentMethodFormValues) => {
    try {
      // Add payment method using the hook
      const result = await addPaymentMethod(values);
      
      if (result.success) {
        // Close method modal and reopen payment modal
        setShowPaymentMethodModal(false);
        setShowPaymentModal(true);
      } else {
        console.error('Failed to add payment method:', result.error);
        alert(`Failed to add payment method: ${result.error}`);
      }
    } catch (error) {
      console.error('Error adding payment method:', error);
    }
  };
  
  // Handle payment completion
  const handlePaymentComplete = async () => {
    // In a real implementation, this would update the transactions list
    setShowPaymentModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Payment Processing Modal */}
      <PaymentProcessingModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onAddPaymentMethod={handleAddPaymentMethod}
        paymentDetails={paymentDetails}
        userId={userId}
        poolId=""
        onPaymentComplete={handlePaymentComplete}
      />
      
      {/* Payment Method Dialog */}
      <PaymentMethodDialog
        isOpen={showPaymentMethodModal}
        onClose={() => {
          setShowPaymentMethodModal(false);
          // Reopen payment modal when closing payment method modal
          setShowPaymentModal(true);
        }}
        onSubmit={handlePaymentMethodSubmit}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-4 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">Payments</h2>
              <p className="mt-1 text-gray-500">
                Track and manage your contributions and payouts
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Button 
                variant="outline" 
                className="flex items-center"
                disabled={true}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button 
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center"
                disabled={true}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Make Payment
              </Button>
            </div>
          </div>
        </div>

        {/* Upcoming Payments */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Payments</CardTitle>
              <CardDescription>
                Scheduled contributions for current pools
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Empty state */}
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-blue-50 p-3 mb-4">
                  <PlusCircle className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No upcoming payments</h3>
                <p className="mt-2 text-gray-500 max-w-md">
                  You don't have any upcoming payments. Join or create a pool to start contributing.
                </p>
                <Button 
                  className="mt-4"
                  onClick={() => router.push('/create-pool')}
                >
                  Create a Pool
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>
                    All your payments and receipts
                  </CardDescription>
                </div>
                <div className="mt-4 md:mt-0 flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      disabled={true}
                    />
                  </div>
                  <div className="relative">
                    <button
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      disabled={true}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Empty state */}
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-gray-50 p-3 mb-4">
                  <DollarSign className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No transaction history</h3>
                <p className="mt-2 text-gray-500 max-w-md">
                  Your transaction history will appear here once you start making contributions or receive payments.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}