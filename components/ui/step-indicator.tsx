// components/ui/step-indicator.tsx
// Reusable step indicator component for multi-step flows
import React from 'react';
import { cn } from '../../lib/utils';
import { Check } from 'lucide-react';

interface Step {
  label?: string;
}

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps?: Step[];
  variant?: 'dots' | 'progress';
  showStepText?: boolean;
  className?: string;
}

/**
 * StepIndicator Component
 *
 * Displays progress through a multi-step flow using either dots or a progress bar.
 *
 * @example
 * // Dots variant (default)
 * <StepIndicator currentStep={2} totalSteps={4} showStepText />
 *
 * // Progress bar variant
 * <StepIndicator currentStep={2} totalSteps={4} variant="progress" />
 *
 * // With step labels
 * <StepIndicator
 *   currentStep={1}
 *   totalSteps={3}
 *   steps={[{ label: "Basic Info" }, { label: "Schedule" }, { label: "Invite" }]}
 * />
 */
export function StepIndicator({
  currentStep,
  totalSteps,
  steps,
  variant = 'dots',
  showStepText = false,
  className,
}: StepIndicatorProps) {
  const currentStepLabel = steps?.[currentStep - 1]?.label;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* Step counter text */}
      {showStepText && (
        <p className="text-sm text-muted-foreground">
          Step {currentStep} of {totalSteps}
          {currentStepLabel && `: ${currentStepLabel}`}
        </p>
      )}

      {/* Dots variant */}
      {variant === 'dots' && (
        <div className="flex items-center justify-center">
          {Array.from({ length: totalSteps }, (_, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;
            const isLast = stepNumber === totalSteps;

            return (
              <React.Fragment key={stepNumber}>
                {/* Step circle */}
                <div
                  className={cn(
                    'w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-300',
                    isCompleted && 'bg-blue-600 text-white',
                    isCurrent && 'bg-blue-600 text-white',
                    !isCompleted && !isCurrent && 'bg-gray-200 text-gray-500'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                  role="listitem"
                  aria-label={`Step ${stepNumber}${steps?.[index]?.label ? `: ${steps[index].label}` : ''}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                  ) : (
                    stepNumber
                  )}
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div
                    className={cn(
                      'h-1 w-10 sm:w-14 transition-colors duration-300',
                      stepNumber < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    )}
                    aria-hidden="true"
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Progress bar variant */}
      {variant === 'progress' && (
        <div className="w-full">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
              role="progressbar"
              aria-valuenow={currentStep}
              aria-valuemin={1}
              aria-valuemax={totalSteps}
              aria-label={`Step ${currentStep} of ${totalSteps}`}
            />
          </div>
          {/* Step dots below progress bar */}
          <div className="flex justify-between mt-2">
            {Array.from({ length: totalSteps }, (_, index) => {
              const stepNumber = index + 1;
              const isCompleted = stepNumber < currentStep;
              const isCurrent = stepNumber === currentStep;

              return (
                <div
                  key={stepNumber}
                  className={cn(
                    'w-3 h-3 rounded-full transition-colors duration-300',
                    isCompleted && 'bg-blue-600',
                    isCurrent && 'bg-blue-600 ring-2 ring-blue-200',
                    !isCompleted && !isCurrent && 'bg-gray-300'
                  )}
                  aria-hidden="true"
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * StepHeader Component
 *
 * Combines step indicator with a title for use in modal headers.
 */
interface StepHeaderProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  description?: string;
  steps?: Step[];
  className?: string;
}

export function StepHeader({
  currentStep,
  totalSteps,
  title,
  description,
  steps,
  className,
}: StepHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <StepIndicator
        currentStep={currentStep}
        totalSteps={totalSteps}
        steps={steps}
        showStepText
      />
      <div className="text-center sm:text-left">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}

export default StepIndicator;
