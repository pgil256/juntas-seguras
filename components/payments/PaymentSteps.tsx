'use client';

import React from 'react';
import {
  Wallet,
  Send,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

type PaymentMethodType = 'venmo' | 'cashapp' | 'paypal' | 'zelle';

interface PaymentMethod {
  type: PaymentMethodType;
  handle: string;
  isPreferred?: boolean;
}

interface PaymentStepsProps {
  amount: number;
  poolName: string;
  round: number;
  recipientName: string;
  paymentMethods: PaymentMethod[];
  onConfirmPayment: (method: PaymentMethodType) => void;
  isConfirming?: boolean;
  currentStep: 1 | 2 | 3;
  onStepChange?: (step: 1 | 2 | 3) => void;
}

export function PaymentSteps({
  amount,
  poolName,
  round,
  recipientName,
  paymentMethods,
  onConfirmPayment,
  isConfirming,
  currentStep,
  onStepChange,
}: PaymentStepsProps) {
  const [selectedMethod, setSelectedMethod] = React.useState<PaymentMethodType | null>(
    paymentMethods.find(m => m.isPreferred)?.type || paymentMethods[0]?.type || null
  );
  const [copiedHandle, setCopiedHandle] = React.useState(false);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amt);
  };

  const getMethodLabel = (type: PaymentMethodType) => {
    const labels: Record<PaymentMethodType, string> = {
      venmo: 'Venmo',
      cashapp: 'Cash App',
      paypal: 'PayPal',
      zelle: 'Zelle',
    };
    return labels[type];
  };

  const getMethodIcon = (type: PaymentMethodType) => {
    // Using brand colors as backgrounds
    const colors: Record<PaymentMethodType, string> = {
      venmo: 'bg-[#3D95CE]',
      cashapp: 'bg-[#00D632]',
      paypal: 'bg-[#003087]',
      zelle: 'bg-[#6D1ED4]',
    };
    return colors[type];
  };

  const formatHandle = (method: PaymentMethod) => {
    switch (method.type) {
      case 'venmo':
        return `@${method.handle}`;
      case 'cashapp':
        return `$${method.handle}`;
      case 'paypal':
        return `paypal.me/${method.handle}`;
      case 'zelle':
        return method.handle;
      default:
        return method.handle;
    }
  };

  const getPaymentLink = (method: PaymentMethod) => {
    const note = encodeURIComponent(`${poolName} - Round ${round}`);
    switch (method.type) {
      case 'venmo':
        return `venmo://paycharge?txn=pay&recipients=${method.handle}&amount=${amount}&note=${note}`;
      case 'cashapp':
        return `https://cash.app/$${method.handle}/${amount}`;
      case 'paypal':
        return `https://www.paypal.me/${method.handle}/${amount}`;
      case 'zelle':
        return null; // Zelle doesn't support deep links
      default:
        return null;
    }
  };

  const copyHandle = async (handle: string) => {
    await navigator.clipboard.writeText(handle);
    setCopiedHandle(true);
    setTimeout(() => setCopiedHandle(false), 2000);
  };

  const selectedPaymentMethod = paymentMethods.find(m => m.type === selectedMethod);

  const steps = [
    { number: 1, label: 'Choose Method', icon: Wallet },
    { number: 2, label: 'Send Payment', icon: Send },
    { number: 3, label: 'Confirm', icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                  currentStep >= step.number
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-300 bg-white text-gray-400'
                )}
              >
                {currentStep > step.number ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>
              <span
                className={cn(
                  'text-xs mt-1.5',
                  currentStep >= step.number ? 'text-blue-600 font-medium' : 'text-gray-500'
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 transition-colors',
                  currentStep > step.number ? 'bg-blue-500' : 'bg-gray-200'
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Choose payment method */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Amount to pay</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(amount)}</p>
            <p className="text-sm text-gray-500 mt-1">to {recipientName}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Select payment method:</p>
            {paymentMethods.map((method) => (
              <button
                key={method.type}
                onClick={() => setSelectedMethod(method.type)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all',
                  selectedMethod === method.type
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm',
                      getMethodIcon(method.type)
                    )}
                  >
                    {getMethodLabel(method.type).charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">
                      {getMethodLabel(method.type)}
                    </p>
                    <p className="text-sm text-gray-500">{formatHandle(method)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {method.isPreferred && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      Preferred
                    </span>
                  )}
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      selectedMethod === method.type
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    )}
                  >
                    {selectedMethod === method.type && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <Button
            onClick={() => onStepChange?.(2)}
            disabled={!selectedMethod}
            className="w-full"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Step 2: Send payment */}
      {currentStep === 2 && selectedPaymentMethod && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-700 mb-2">
              Send exactly <span className="font-bold">{formatCurrency(amount)}</span> to:
            </p>
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div>
                <p className="text-lg font-mono font-medium text-gray-900">
                  {formatHandle(selectedPaymentMethod)}
                </p>
                <p className="text-sm text-gray-500">{recipientName}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyHandle(selectedPaymentMethod.handle)}
              >
                {copiedHandle ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Include "{poolName} - Round {round}" in the payment note
            </p>
          </div>

          {getPaymentLink(selectedPaymentMethod) && (
            <a
              href={getPaymentLink(selectedPaymentMethod)!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full p-3 rounded-lg text-white font-medium transition-colors"
              style={{
                backgroundColor:
                  selectedMethod === 'venmo'
                    ? '#3D95CE'
                    : selectedMethod === 'cashapp'
                    ? '#00D632'
                    : selectedMethod === 'paypal'
                    ? '#003087'
                    : '#6D1ED4',
              }}
            >
              <ExternalLink className="w-4 h-4" />
              Open {getMethodLabel(selectedPaymentMethod.type)}
            </a>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onStepChange?.(1)} className="flex-1">
              Back
            </Button>
            <Button onClick={() => onStepChange?.(3)} className="flex-1">
              I've Sent It
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {currentStep === 3 && selectedMethod && (
        <div className="space-y-4">
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Almost done!
            </h3>
            <p className="text-sm text-gray-600">
              Confirm that you've sent {formatCurrency(amount)} via{' '}
              {getMethodLabel(selectedMethod)}
            </p>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-800">
              The pool admin will verify your payment and mark it as received.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onStepChange?.(2)} className="flex-1">
              Back
            </Button>
            <Button
              onClick={() => onConfirmPayment(selectedMethod)}
              disabled={isConfirming}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isConfirming ? (
                'Confirming...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
