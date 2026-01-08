// components/payments/PaymentSuccessAnimation.tsx
// Animated success feedback for completed payments
'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, PartyPopper } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PaymentSuccessAnimationProps {
  show: boolean;
  amount?: number;
  message?: string;
  onComplete?: () => void;
  variant?: 'default' | 'confetti' | 'minimal';
  autoHide?: boolean;
  autoHideDelay?: number;
}

export function PaymentSuccessAnimation({
  show,
  amount,
  message = 'Payment successful!',
  onComplete,
  variant = 'default',
  autoHide = false,
  autoHideDelay = 3000,
}: PaymentSuccessAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      if (variant === 'confetti') {
        // Delay confetti slightly for better effect
        const confettiTimer = setTimeout(() => setShowConfetti(true), 200);
        return () => clearTimeout(confettiTimer);
      }
    }
  }, [show, variant]);

  useEffect(() => {
    if (show && autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setShowConfetti(false);
        onComplete?.();
      }, autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [show, autoHide, autoHideDelay, onComplete]);

  if (!show && !isVisible) return null;

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  if (variant === 'minimal') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg transition-all duration-300',
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}
      >
        <CheckCircle2 className="h-5 w-5 text-green-600 animate-bounce-once" />
        <span className="text-sm font-medium text-green-800">{message}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      onClick={() => {
        setIsVisible(false);
        setShowConfetti(false);
        onComplete?.();
      }}
    >
      <div
        className={cn(
          'bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center transform transition-all duration-500',
          isVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        )}
      >
        {/* Success Icon with Animation */}
        <div className="relative mb-6">
          <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center animate-scale-in">
            <CheckCircle2 className="h-12 w-12 text-green-600 animate-check-draw" />
          </div>

          {/* Confetti particles */}
          {variant === 'confetti' && showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-visible">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full animate-confetti"
                  style={{
                    backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'][i % 5],
                    animationDelay: `${i * 50}ms`,
                    transform: `rotate(${i * 30}deg) translateY(-40px)`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Celebration icon for large amounts */}
          {variant === 'confetti' && amount && amount >= 50 && (
            <PartyPopper className="absolute -top-2 -right-2 h-8 w-8 text-yellow-500 animate-bounce" />
          )}
        </div>

        {/* Message */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{message}</h3>

        {/* Amount */}
        {amount && (
          <p className="text-3xl font-bold text-green-600 mb-4 animate-count-up">
            {formatCurrency(amount)}
          </p>
        )}

        {/* Tap to dismiss hint */}
        <p className="text-sm text-gray-500">Tap anywhere to dismiss</p>
      </div>
    </div>
  );
}

// Inline success indicator for use in forms/lists
export function InlineSuccessIndicator({
  show,
  message = 'Success',
}: {
  show: boolean;
  message?: string;
}) {
  if (!show) return null;

  return (
    <div className="flex items-center gap-1.5 text-green-600 animate-fade-in">
      <CheckCircle2 className="h-4 w-4" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

// Pulsing success dot for status indicators
export function SuccessPulse({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
    </span>
  );
}

export default PaymentSuccessAnimation;
