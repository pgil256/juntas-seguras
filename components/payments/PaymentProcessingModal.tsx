'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Building, DollarSign, Loader2, AlertCircle, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePayments } from '@/lib/hooks/usePayments';
import { PaymentDetails, PaymentMethod } from '@/types/payment';

// Type definitions
interface PaymentProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPaymentMethod: () => void;
  paymentDetails: PaymentDetails;
  userId: string;
  poolId: string;
  onPaymentComplete?: () => void;
}

// Payment processing states
type ProcessingState = 'initial' | 'processing' | 'success' | 'error';

export function PaymentProcessingModal({
  isOpen,
  onClose,
  onAddPaymentMethod,
  paymentDetails,
  userId,
  poolId,
  onPaymentComplete,
}: PaymentProcessingModalProps) {
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [processingState, setProcessingState] = useState<ProcessingState>('initial');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Use the payments hook
  const { processPayment, isProcessing } = usePayments({ userId });

  // Set the default payment method when modal opens
  useEffect(() => {
    if (isOpen && paymentDetails.paymentMethods.length > 0) {
      const defaultMethod = paymentDetails.paymentMethods.find(method => method.isDefault);
      if (defaultMethod) {
        setSelectedMethodId(defaultMethod.id);
      } else {
        setSelectedMethodId(paymentDetails.paymentMethods[0].id);
      }
    }
  }, [isOpen, paymentDetails.paymentMethods]);

  // Calculate minimum scheduled date (tomorrow)
  const getMinScheduledDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getPaymentMethodIcon = (type: string) => {
    return type === 'card' ? (
      <CreditCard className="h-5 w-5 text-gray-600" />
    ) : (
      <Building className="h-5 w-5 text-gray-600" />
    );
  };

  const handlePaymentSubmit = async () => {
    if (!selectedMethodId) return;
    
    setProcessingState('processing');
    setErrorMessage('');
    
    try {
      const result = await processPayment(
        poolId,
        paymentDetails.amount,
        selectedMethodId,
        scheduleForLater,
        scheduleForLater ? scheduledDate : undefined
      );
      
      if (result.success) {
        setProcessingState('success');
        
        // Auto-close after success
        setTimeout(() => {
          handleClose();
          if (onPaymentComplete) {
            onPaymentComplete();
          }
        }, 2000);
      } else {
        setProcessingState('error');
        setErrorMessage(result.error || 'Payment processing failed. Please try again.');
      }
    } catch (error: any) {
      setProcessingState('error');
      setErrorMessage('An unexpected error occurred. Please try again later.');
      console.error('Payment error:', error);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setProcessingState('initial');
    setErrorMessage('');
    setScheduleForLater(false);
    setScheduledDate('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Make Payment</DialogTitle>
          <DialogDescription>
            Pay your contribution to {paymentDetails.poolName}
          </DialogDescription>
        </DialogHeader>
        
        {processingState === 'initial' && (
          <>
            <div className="py-4 space-y-6">
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">Amount</span>
                  <span className="text-lg font-semibold">
                    {formatCurrency(paymentDetails.amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Due Date</span>
                  <span className="text-sm text-gray-700">
                    {formatDate(paymentDetails.dueDate)}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-base">Payment Method</Label>
                {paymentDetails.paymentMethods.length > 0 ? (
                  <RadioGroup
                    value={selectedMethodId?.toString() || ''}
                    onValueChange={(value) => setSelectedMethodId(parseInt(value))}
                    className="mt-3 space-y-3"
                  >
                    {paymentDetails.paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value={method.id.toString()} id={`method-${method.id}`} />
                          <Label htmlFor={`method-${method.id}`} className="flex items-center cursor-pointer">
                            {getPaymentMethodIcon(method.type)}
                            <div className="ml-3">
                              <div className="font-medium">{method.name}</div>
                              <div className="text-sm text-gray-500">
                                {method.type === 'card' ? 'Card' : 'Account'} ending in {method.last4}
                              </div>
                            </div>
                          </Label>
                        </div>
                        {method.isDefault && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="mt-3 text-center py-6 border border-dashed rounded-md">
                    <p className="text-gray-500 mb-3">No payment methods available</p>
                    <Button variant="outline" onClick={onAddPaymentMethod}>
                      Add Payment Method
                    </Button>
                  </div>
                )}

                {paymentDetails.paymentMethods.length > 0 && (
                  <Button 
                    variant="outline" 
                    className="mt-3" 
                    onClick={onAddPaymentMethod}
                  >
                    + Add New Payment Method
                  </Button>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="scheduleForLater"
                    checked={scheduleForLater}
                    onChange={() => setScheduleForLater(!scheduleForLater)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <Label htmlFor="scheduleForLater" className="ml-2">
                    Schedule for later
                  </Label>
                </div>
                
                {scheduleForLater && (
                  <div className="mt-2">
                    <Label htmlFor="scheduledDate">Payment Date</Label>
                    <input
                      type="date"
                      id="scheduledDate"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={getMinScheduledDate()}
                      max={paymentDetails.dueDate}
                      className="w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handlePaymentSubmit}
                disabled={!selectedMethodId || (scheduleForLater && !scheduledDate)}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                {scheduleForLater ? 'Schedule Payment' : 'Pay Now'}
              </Button>
            </DialogFooter>
          </>
        )}
        
        {processingState === 'processing' && (
          <div className="py-8 flex flex-col items-center justify-center">
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-4" />
            <p className="text-xl font-medium text-gray-900">Processing Payment</p>
            <p className="text-gray-500 mt-2">Please wait while we process your payment...</p>
          </div>
        )}
        
        {processingState === 'success' && (
          <div className="py-8 flex flex-col items-center justify-center">
            <div className="bg-green-100 p-3 rounded-full mb-4">
              <Check className="h-16 w-16 text-green-600" />
            </div>
            <p className="text-xl font-medium text-gray-900">Payment Successful!</p>
            <p className="text-gray-500 mt-2">
              {scheduleForLater 
                ? `Your payment has been scheduled for ${formatDate(scheduledDate)}.`
                : 'Your payment has been processed successfully.'}
            </p>
            <Button className="mt-6" onClick={handleClose}>
              Close
            </Button>
          </div>
        )}
        
        {processingState === 'error' && (
          <div className="py-8 flex flex-col items-center justify-center">
            <div className="bg-red-100 p-3 rounded-full mb-4">
              <AlertCircle className="h-16 w-16 text-red-600" />
            </div>
            <p className="text-xl font-medium text-gray-900">Payment Failed</p>
            <p className="text-red-500 mt-2">{errorMessage}</p>
            <div className="flex space-x-3 mt-6">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => setProcessingState('initial')}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}