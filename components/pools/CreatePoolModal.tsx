/**
 * CreatePoolModal Component
 *
 * Multi-step modal for creating a new savings pool.
 * Uses sub-components for each step to keep the code organized.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCreatePool } from "../../lib/hooks/useCreatePool";
import { useSession } from "next-auth/react";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Zap,
} from "lucide-react";
import { StepIndicator } from "../../components/ui/step-indicator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { CreatorRulesAcknowledgmentDialog } from "./CreatorRulesAcknowledgmentDialog";
import { PaymentMethodType } from "../../types/pool";
import { PoolOnboardingModal } from "../payments/PoolOnboardingModal";

// Import step components
import {
  PoolFormData,
  FieldErrors,
  TouchedFields,
  BasicInfoStep,
  ScheduleStep,
  InviteMembersStep,
  QuickCreateStep,
} from "./create-pool";

interface CreatePoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePool?: (poolData: PoolFormData & { id: string }) => void;
}

const DRAFT_STORAGE_KEY = 'juntas-pool-draft';

// Default form data
const defaultPoolData: PoolFormData = {
  name: "",
  contributionAmount: "",
  frequency: "weekly",
  totalMembers: "4",
  duration: "3",
  startDate: "",
  description: "",
  inviteMethod: "email",
  emails: "",
  allowedPaymentMethods: ['venmo', 'cashapp', 'paypal', 'zelle'],
};

const CreatePoolModal = ({
  isOpen,
  onClose,
  onCreatePool,
}: CreatePoolModalProps) => {
  const { status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [createdPoolId, setCreatedPoolId] = useState<string | null>(null);
  const [createdPoolName, setCreatedPoolName] = useState<string>("");
  const [quickCreateMode, setQuickCreateMode] = useState(false);

  // Field-level validation errors for inline feedback
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touchedFields, setTouchedFields] = useState<TouchedFields>({});

  const [poolData, setPoolData] = useState<PoolFormData>(defaultPoolData);
  const [hasDraft, setHasDraft] = useState(false);

  const { createPool, isLoading, error } = useCreatePool({
    onSuccess: (poolId) => {
      setCreatedPoolId(poolId);
      setCreatedPoolName(poolData.name);

      if (onCreatePool) {
        onCreatePool({ id: poolId, ...poolData });
      }

      setShowOnboardingModal(true);
    }
  });

  // Load draft from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed.name || parsed.contributionAmount) {
            setPoolData(parsed);
            setHasDraft(true);
          }
        } catch {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      }
    }
  }, []);

  // Save draft to localStorage when form data changes
  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      if (poolData.name || poolData.contributionAmount || poolData.startDate) {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(poolData));
        setHasDraft(true);
      }
    }
  }, [poolData, isOpen]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasDraft(false);
    }
  }, []);

  // Discard draft and reset form
  const discardDraft = useCallback(() => {
    clearDraft();
    setPoolData(defaultPoolData);
    setStep(1);
    setFieldErrors({});
    setTouchedFields({});
  }, [clearDraft]);

  // Calculate estimated payout dates
  const calculatePayoutDates = useCallback((): Date[] => {
    if (!poolData.startDate || !poolData.totalMembers || !poolData.frequency) {
      return [];
    }

    const startDate = new Date(poolData.startDate);
    const totalMembers = parseInt(poolData.totalMembers);
    const dates: Date[] = [];

    const getNextDate = (currentDate: Date, frequency: string): Date => {
      const next = new Date(currentDate);
      switch (frequency) {
        case 'weekly':
          next.setDate(next.getDate() + 7);
          break;
        case 'biweekly':
          next.setDate(next.getDate() + 14);
          break;
        case 'monthly':
          next.setMonth(next.getMonth() + 1);
          break;
        default:
          next.setMonth(next.getMonth() + 1);
      }
      return next;
    };

    let currentDate = new Date(startDate);
    for (let i = 0; i < totalMembers; i++) {
      dates.push(new Date(currentDate));
      currentDate = getNextDate(currentDate, poolData.frequency);
    }

    return dates;
  }, [poolData.startDate, poolData.totalMembers, poolData.frequency]);

  // Field-level validation
  const validateField = useCallback((name: string, value: string): string => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'Pool name is required';
        if (value.trim().length < 3) return 'Pool name must be at least 3 characters';
        if (value.trim().length > 50) return 'Pool name must be less than 50 characters';
        return '';
      case 'contributionAmount':
        if (!value) return 'Contribution amount is required';
        const amount = Number(value);
        if (isNaN(amount) || !Number.isInteger(amount) || amount < 1 || amount > 20) {
          return 'Amount must be between $1 and $20';
        }
        return '';
      case 'startDate':
        if (!value) return 'Start date is required';
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) return 'Start date cannot be in the past';
        return '';
      case 'emails':
        if (poolData.inviteMethod === 'email' && value) {
          const emails = value.split(',').map(e => e.trim()).filter(e => e);
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          const invalidEmails = emails.filter(e => !emailRegex.test(e));
          if (invalidEmails.length > 0) {
            return `Invalid email${invalidEmails.length > 1 ? 's' : ''}: ${invalidEmails.join(', ')}`;
          }
        }
        return '';
      default:
        return '';
    }
  }, [poolData.inviteMethod]);

  // Handle field blur for validation
  const handleFieldBlur = (name: string, value: string) => {
    setTouchedFields(prev => ({ ...prev, [name]: true }));
    const fieldError = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: fieldError }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPoolData((prev) => ({ ...prev, [name]: value }));

    if (touchedFields[name] && fieldErrors[name]) {
      const fieldError = validateField(name, value);
      setFieldErrors(prev => ({ ...prev, [name]: fieldError }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setPoolData((prev) => ({ ...prev, [name]: value }));
    setTouchedFields(prev => ({ ...prev, [name]: true }));
    const fieldError = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: fieldError }));
  };

  const handlePaymentMethodToggle = (method: PaymentMethodType, checked: boolean) => {
    setPoolData((prev) => {
      const currentMethods = prev.allowedPaymentMethods;
      if (checked) {
        return {
          ...prev,
          allowedPaymentMethods: currentMethods.includes(method)
            ? currentMethods
            : [...currentMethods, method]
        };
      } else {
        const newMethods = currentMethods.filter(m => m !== method);
        if (newMethods.length === 0) {
          return prev;
        }
        return { ...prev, allowedPaymentMethods: newMethods };
      }
    });
  };

  const validateStep = (stepToValidate: number): boolean => {
    const errors: string[] = [];

    if (status !== 'authenticated') {
      errors.push('You must be signed in to create a pool');
    }

    if (stepToValidate >= 1) {
      if (!poolData.name.trim()) {
        errors.push('Pool name is required');
      }

      const amount = Number(poolData.contributionAmount);
      if (!poolData.contributionAmount || isNaN(amount) || !Number.isInteger(amount) || amount < 1 || amount > 20) {
        errors.push('Contribution amount must be between $1 and $20');
      }
    }

    if (stepToValidate >= 2) {
      if (!poolData.startDate) {
        errors.push('Start date is required');
      }
    }

    setFormErrors(errors);
    return errors.length === 0;
  };

  const validateForm = (): boolean => {
    return validateStep(3);
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    setStep((prev) => prev - 1);
    setFormErrors([]);
  };

  const handleShowRulesDialog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setShowRulesDialog(true);
  };

  const handleCreatePoolAfterRules = async () => {
    setShowRulesDialog(false);

    try {
      const totalRounds = parseInt(poolData.totalMembers);

      let invitations = undefined;
      if (poolData.inviteMethod === 'email' && poolData.emails) {
        invitations = poolData.emails
          .split(',')
          .map(email => email.trim())
          .filter(email => email.length > 0);
      }

      const createPoolRequest = {
        name: poolData.name,
        description: poolData.description,
        contributionAmount: Number(poolData.contributionAmount),
        frequency: poolData.frequency,
        totalRounds,
        startDate: poolData.startDate,
        invitations,
        allowedPaymentMethods: poolData.allowedPaymentMethods
      };

      await createPool(createPoolRequest);
    } catch (err) {
      console.error("Error creating pool:", err);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboardingModal(false);
    resetFormState();
    onClose();
    if (createdPoolId) {
      router.push(`/member-management/${createdPoolId}`);
    }
  };

  const handleOnboardingClose = () => {
    setShowOnboardingModal(false);
    resetFormState();
    onClose();
    if (createdPoolId) {
      router.push(`/member-management/${createdPoolId}`);
    }
  };

  const resetFormState = () => {
    setStep(1);
    setPoolData(defaultPoolData);
    setFieldErrors({});
    setTouchedFields({});
    clearDraft();
  };

  const handleQuickCreateToggle = () => {
    setQuickCreateMode(!quickCreateMode);
    if (!quickCreateMode) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      setPoolData(prev => ({
        ...prev,
        frequency: "monthly",
        contributionAmount: "10",
        totalMembers: "4",
        startDate: nextMonth.toISOString().split('T')[0],
        inviteMethod: "later",
      }));
    }
  };

  // Common props for step components
  const stepProps = {
    poolData,
    onInputChange: handleInputChange,
    onSelectChange: handleSelectChange,
    onFieldBlur: handleFieldBlur,
    fieldErrors,
    touchedFields,
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md px-4 sm:px-6 py-5 sm:py-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center sm:text-left">
            Create a New Savings Pool
          </DialogTitle>
          <DialogDescription className="sr-only">
            Complete the steps below to create a new savings pool
          </DialogDescription>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded p-1 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        <div className="mt-4 pt-2">
          {/* Draft restoration indicator */}
          {hasDraft && step === 1 && !quickCreateMode && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
              <p className="text-sm text-amber-800">
                Draft restored from your last session
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={discardDraft}
                className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 h-7 px-2"
              >
                Start Fresh
              </Button>
            </div>
          )}

          {/* Quick Create Toggle - only on step 1 */}
          {step === 1 && !hasDraft && (
            <div className="mb-4">
              <button
                type="button"
                onClick={handleQuickCreateToggle}
                className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  quickCreateMode
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-dashed border-gray-300 text-gray-600 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <Zap className={`h-4 w-4 ${quickCreateMode ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className="text-sm font-medium">
                  {quickCreateMode ? 'Quick Create Mode' : 'Quick Create (Skip Steps)'}
                </span>
              </button>
            </div>
          )}

          {/* Step indicator - hide in quick create mode */}
          {!quickCreateMode && (
            <div className="mb-8 px-2 sm:px-0">
              <StepIndicator
                currentStep={step}
                totalSteps={3}
                showStepText
                steps={[
                  { label: "Basic Info" },
                  { label: "Schedule" },
                  { label: "Invite Members" },
                ]}
              />
            </div>
          )}

          <form onSubmit={handleShowRulesDialog}>
            {/* Quick Create Mode */}
            {quickCreateMode && step === 1 && (
              <QuickCreateStep
                {...stepProps}
                onSwitchToDetailed={() => setQuickCreateMode(false)}
              />
            )}

            {/* Step 1: Basic Pool Information */}
            {step === 1 && !quickCreateMode && (
              <BasicInfoStep {...stepProps} />
            )}

            {/* Step 2: Pool Schedule */}
            {step === 2 && (
              <ScheduleStep
                {...stepProps}
                onPaymentMethodToggle={handlePaymentMethodToggle}
              />
            )}

            {/* Step 3: Invite Members */}
            {step === 3 && (
              <InviteMembersStep
                {...stepProps}
                payoutDates={calculatePayoutDates()}
              />
            )}

            {formErrors.length > 0 && (
              <div className="mt-4">
                <Alert variant="destructive">
                  <AlertTitle>Validation Errors</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5">
                      {formErrors.map((err, index) => (
                        <li key={index}>{err}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {error && (
              <div className="mt-4">
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}

            <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
              {/* Quick Create Mode Footer */}
              {quickCreateMode ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setQuickCreateMode(false)}
                    className="flex items-center justify-center min-h-[44px] w-full sm:w-auto"
                  >
                    Customize
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 min-h-[44px] w-full sm:w-auto flex items-center justify-center gap-2"
                    disabled={isLoading || !poolData.name || !poolData.contributionAmount || !poolData.startDate}
                  >
                    <Zap className="h-4 w-4" />
                    {isLoading ? 'Creating...' : 'Quick Create'}
                  </Button>
                </>
              ) : (
                <>
                  {step > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                      className="flex items-center justify-center min-h-[44px] w-full sm:w-auto"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  ) : (
                    <div className="hidden sm:block"></div>
                  )}

                  {step < 3 ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      className="flex items-center justify-center min-h-[44px] w-full sm:w-auto"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 min-h-[44px] w-full sm:w-auto"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creating...' : 'Create Pool'}
                    </Button>
                  )}
                </>
              )}
            </DialogFooter>
          </form>
        </div>
      </DialogContent>

      {/* Creator Rules Acknowledgment Dialog */}
      <CreatorRulesAcknowledgmentDialog
        open={showRulesDialog}
        onOpenChange={setShowRulesDialog}
        poolName={poolData.name}
        contributionAmount={Number(poolData.contributionAmount) || 0}
        frequency={poolData.frequency}
        onAccept={handleCreatePoolAfterRules}
        isProcessing={isLoading}
      />

      {/* Onboarding Modal for Creator (payment + payout setup) */}
      {createdPoolId && (
        <PoolOnboardingModal
          isOpen={showOnboardingModal}
          onClose={handleOnboardingClose}
          onComplete={handleOnboardingComplete}
          poolId={createdPoolId}
          poolName={createdPoolName}
          contributionAmount={Number(poolData.contributionAmount) || 0}
          frequency={poolData.frequency}
          allowedPaymentMethods={poolData.allowedPaymentMethods}
        />
      )}
    </Dialog>
  );
};

export default CreatePoolModal;
