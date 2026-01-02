'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

// PayPal Client ID from environment
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';

interface PayPalButtonProps {
  amount: number;
  currency?: string;
  description?: string;
  poolId: string;
  userId: string;
  onSuccess: (details: PayPalPaymentDetails) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

interface PayPalPaymentDetails {
  orderId: string;
  payerId: string;
  status: string;
  amount: number;
}

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: Record<string, unknown>) => {
        render: (selector: string) => Promise<void>;
        close: () => void;
      };
    };
  }
}

export function PayPalButton({
  amount,
  currency = 'USD',
  description,
  poolId,
  userId,
  onSuccess,
  onError,
  onCancel,
}: PayPalButtonProps) {
  const paypalRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sdkReady, setSdkReady] = useState(false);
  const buttonInstanceRef = useRef<{ close: () => void } | null>(null);

  // Load PayPal SDK
  useEffect(() => {
    const scriptId = 'paypal-sdk';

    // Check if SDK is already loaded
    if (document.getElementById(scriptId)) {
      if (window.paypal) {
        setSdkReady(true);
        setIsLoading(false);
      }
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=${currency}&enable-funding=venmo`;
    script.async = true;

    script.onload = () => {
      setSdkReady(true);
      setIsLoading(false);
    };

    script.onerror = () => {
      setIsLoading(false);
      onError('Failed to load PayPal SDK');
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup button instance on unmount
      if (buttonInstanceRef.current) {
        buttonInstanceRef.current.close();
      }
    };
  }, [currency, onError]);

  // Render PayPal buttons when SDK is ready
  useEffect(() => {
    if (!sdkReady || !window.paypal || !paypalRef.current) return;

    // Clear any existing buttons
    if (paypalRef.current) {
      paypalRef.current.innerHTML = '';
    }

    const buttons = window.paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'paypal',
      },

      // Create order on PayPal
      createOrder: async () => {
        try {
          const response = await fetch('/api/payments/process', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              poolId,
              amount,
              paymentMethodId: 1, // PayPal
              scheduleForLater: false,
              useEscrow: false,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to create order');
          }

          return data.paypalOrderId;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to create payment';
          onError(message);
          throw error;
        }
      },

      // Capture payment after user approves
      onApprove: async (data: { orderID: string; payerID: string }) => {
        try {
          const response = await fetch('/api/payments/capture', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: data.orderID,
              payerId: data.payerID,
              poolId,
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Payment capture failed');
          }

          onSuccess({
            orderId: data.orderID,
            payerId: data.payerID,
            status: 'COMPLETED',
            amount,
          });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Payment failed';
          onError(message);
        }
      },

      onCancel: () => {
        if (onCancel) {
          onCancel();
        }
      },

      onError: (err: unknown) => {
        console.error('PayPal error:', err);
        onError('PayPal encountered an error. Please try again.');
      },
    });

    buttons.render(paypalRef.current).then(() => {
      buttonInstanceRef.current = buttons;
    });

  }, [sdkReady, amount, poolId, userId, description, onSuccess, onError, onCancel]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading PayPal...</span>
      </div>
    );
  }

  return (
    <div ref={paypalRef} className="w-full min-h-[150px]" />
  );
}
