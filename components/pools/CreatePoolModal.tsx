// components/pools/CreatePoolModal.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCreatePool } from "../../lib/hooks/useCreatePool";
import { useSession } from "next-auth/react";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import {
  X,
  Calendar,
  Users,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Zap,
} from "lucide-react";
import { StepIndicator } from "../../components/ui/step-indicator";
import { FormField, FormError, FormLabel, FormHelper } from "../../components/ui/form-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Checkbox } from "../../components/ui/checkbox";
import { CreatorRulesAcknowledgmentDialog } from "./CreatorRulesAcknowledgmentDialog";
import { PaymentMethodType } from "../../types/pool";

// Available payment methods with labels
const AVAILABLE_PAYMENT_METHODS: { value: PaymentMethodType; label: string }[] = [
  { value: 'venmo', label: 'Venmo' },
  { value: 'cashapp', label: 'Cash App' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'zelle', label: 'Zelle' },
];
import { PoolOnboardingModal } from "../payments/PoolOnboardingModal";

interface CreatePoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePool?: (poolData: any) => void;
}

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const { createPool, isLoading, error } = useCreatePool({
    onSuccess: (poolId) => {
      // Save pool info for onboarding
      setCreatedPoolId(poolId);
      setCreatedPoolName(poolData.name);

      // Notify parent component
      if (onCreatePool) {
        onCreatePool({ id: poolId, ...poolData });
      }

      // Show onboarding modal (payment + payout setup)
      setShowOnboardingModal(true);
    }
  });

  const DRAFT_STORAGE_KEY = 'juntas-pool-draft';

  // Default form data
  const defaultPoolData = {
    name: "",
    contributionAmount: "",
    frequency: "weekly",
    totalMembers: "4",
    duration: "3",
    startDate: "",
    description: "",
    inviteMethod: "email",
    emails: "",
    allowedPaymentMethods: ['venmo', 'cashapp', 'paypal', 'zelle'] as PaymentMethodType[]
  };

  const [poolData, setPoolData] = useState(defaultPoolData);
  const [hasDraft, setHasDraft] = useState(false);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          // Validate the draft has some data
          if (parsed.name || parsed.contributionAmount) {
            setPoolData(parsed);
            setHasDraft(true);
          }
        } catch {
          // Invalid draft, ignore
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      }
    }
  }, []);

  // Save draft to localStorage when form data changes
  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      // Only save if there's meaningful data
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
  const calculatePayoutDates = useCallback(() => {
    if (!poolData.startDate || !poolData.totalMembers || !poolData.frequency) {
      return [];
    }

    const startDate = new Date(poolData.startDate);
    const totalMembers = parseInt(poolData.totalMembers);
    const dates: Date[] = [];

    // Calculate interval based on frequency
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

    // First payout is after first contribution round
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
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPoolData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing (if field was touched)
    if (touchedFields[name] && fieldErrors[name]) {
      const error = validateField(name, value);
      setFieldErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setPoolData((prev) => ({ ...prev, [name]: value }));

    // Validate and mark as touched
    setTouchedFields(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  const handlePaymentMethodToggle = (method: PaymentMethodType, checked: boolean) => {
    setPoolData((prev) => {
      const currentMethods = prev.allowedPaymentMethods;
      if (checked) {
        // Add method if not already present
        return {
          ...prev,
          allowedPaymentMethods: currentMethods.includes(method)
            ? currentMethods
            : [...currentMethods, method]
        };
      } else {
        // Remove method, but ensure at least one remains
        const newMethods = currentMethods.filter(m => m !== method);
        if (newMethods.length === 0) {
          return prev; // Don't allow removing the last method
        }
        return { ...prev, allowedPaymentMethods: newMethods };
      }
    });
  };

  const nextStep = () => {
    // Validate current step before proceeding
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    setStep((prev) => prev - 1);
    setFormErrors([]); // Clear errors when going back
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

  // Show rules dialog before creating pool
  const handleShowRulesDialog = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setShowRulesDialog(true);
  };

  // Actually create the pool after rules are acknowledged
  const handleCreatePoolAfterRules = async () => {
    setShowRulesDialog(false);

    try {
      // Transform form data to match API expected format
      const totalRounds = parseInt(poolData.totalMembers); // Total rounds equals number of members

      // Process invitations if provided
      let invitations = undefined;
      if (poolData.inviteMethod === 'email' && poolData.emails) {
        // Split emails by comma, trim whitespace, and filter empty values
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

      // Use the hook to create the pool - onSuccess will handle showing payment setup
      await createPool(createPoolRequest);
    } catch (err) {
      console.error("Error creating pool:", err);
    }
  };

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    setShowOnboardingModal(false);

    // Reset form and clear draft
    setStep(1);
    setPoolData(defaultPoolData);
    setFieldErrors({});
    setTouchedFields({});
    clearDraft();

    // Close modal and redirect to member management
    onClose();
    if (createdPoolId) {
      router.push(`/member-management/${createdPoolId}`);
    }
  };

  // Handle closing onboarding modal
  const handleOnboardingClose = () => {
    setShowOnboardingModal(false);

    // Reset form and clear draft
    setStep(1);
    setPoolData(defaultPoolData);
    setFieldErrors({});
    setTouchedFields({});
    clearDraft();

    // Close modal and redirect to member management
    onClose();
    if (createdPoolId) {
      router.push(`/member-management/${createdPoolId}`);
    }
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
                onClick={() => {
                  setQuickCreateMode(!quickCreateMode);
                  if (!quickCreateMode) {
                    // Set smart defaults for quick create
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
                }}
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
              <div className="space-y-4">
                <FormField>
                  <FormLabel htmlFor="qc-name" required>Pool Name</FormLabel>
                  <Input
                    id="qc-name"
                    name="name"
                    value={poolData.name}
                    onChange={handleInputChange}
                    onBlur={(e) => handleFieldBlur('name', e.target.value)}
                    placeholder="e.g. Family Savings Pool"
                    className={touchedFields.name && fieldErrors.name ? 'border-destructive' : ''}
                  />
                  {touchedFields.name && <FormError>{fieldErrors.name}</FormError>}
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                  <FormField>
                    <FormLabel htmlFor="qc-amount" required>Amount</FormLabel>
                    <Select
                      value={poolData.contributionAmount}
                      onValueChange={(value) => handleSelectChange("contributionAmount", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="$" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 3, 5, 10, 15, 20].map((amount) => (
                          <SelectItem key={amount} value={amount.toString()}>
                            ${amount}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField>
                    <FormLabel htmlFor="qc-members" required>Members</FormLabel>
                    <Select
                      value={poolData.totalMembers}
                      onValueChange={(value) => handleSelectChange("totalMembers", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="#" />
                      </SelectTrigger>
                      <SelectContent>
                        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField>
                    <FormLabel htmlFor="qc-frequency" required>Frequency</FormLabel>
                    <Select
                      value={poolData.frequency}
                      onValueChange={(value) => handleSelectChange("frequency", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField>
                    <FormLabel htmlFor="qc-start" required>Start</FormLabel>
                    <Input
                      id="qc-start"
                      name="startDate"
                      value={poolData.startDate}
                      onChange={handleInputChange}
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </FormField>
                </div>

                {/* Quick Create Summary */}
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Total pool value:</span>
                      <span className="font-medium text-gray-900">
                        ${parseInt(poolData.contributionAmount || "0") * parseInt(poolData.totalMembers)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Each member contributes:</span>
                      <span className="font-medium text-gray-900">
                        ${poolData.contributionAmount}/{poolData.frequency}
                      </span>
                    </div>
                    {poolData.startDate && (
                      <div className="flex justify-between">
                        <span>First payout:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(poolData.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setQuickCreateMode(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Switch to detailed setup
                </button>
              </div>
            )}

            {/* Step 1: Basic Pool Information */}
            {step === 1 && !quickCreateMode && (
              <div className="space-y-4">
                <FormField>
                  <FormLabel htmlFor="name" required>Pool Name</FormLabel>
                  <Input
                    id="name"
                    name="name"
                    value={poolData.name}
                    onChange={handleInputChange}
                    onBlur={(e) => handleFieldBlur('name', e.target.value)}
                    placeholder="e.g. Family Savings Pool"
                    className={touchedFields.name && fieldErrors.name ? 'border-destructive' : ''}
                    aria-invalid={!!fieldErrors.name}
                    aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                  />
                  {touchedFields.name && <FormError id="name-error">{fieldErrors.name}</FormError>}
                </FormField>

                <FormField>
                  <FormLabel htmlFor="description" optional>Description</FormLabel>
                  <Input
                    id="description"
                    name="description"
                    value={poolData.description}
                    onChange={handleInputChange}
                    placeholder="What is this pool for?"
                  />
                  <FormHelper>Help members understand the purpose of this pool</FormHelper>
                </FormField>

                <FormField>
                  <FormLabel htmlFor="contributionAmount" required>
                    Contribution Amount ($)
                  </FormLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                    <Select
                      value={poolData.contributionAmount}
                      onValueChange={(value) =>
                        handleSelectChange("contributionAmount", value)
                      }
                    >
                      <SelectTrigger
                        className={`pl-10 ${touchedFields.contributionAmount && fieldErrors.contributionAmount ? 'border-destructive' : ''}`}
                      >
                        <SelectValue placeholder="Select amount" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 3, 5, 10, 15, 20].map((amount) => (
                          <SelectItem key={amount} value={amount.toString()}>
                            ${amount}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {touchedFields.contributionAmount && <FormError>{fieldErrors.contributionAmount}</FormError>}
                </FormField>
              </div>
            )}

            {/* Step 2: Pool Schedule */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label>Contribution Frequency</Label>
                  <RadioGroup
                    value={poolData.frequency}
                    onValueChange={(value) =>
                      handleSelectChange("frequency", value)
                    }
                    className="flex flex-col space-y-1 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="weekly" id="weekly" />
                      <Label htmlFor="weekly">Weekly</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="biweekly" id="biweekly" />
                      <Label htmlFor="biweekly">Bi-weekly</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="monthly" id="monthly" />
                      <Label htmlFor="monthly">Monthly</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="totalMembers">Number of Members</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Select
                      value={poolData.totalMembers}
                      onValueChange={(value) =>
                        handleSelectChange("totalMembers", value)
                      }
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Select number of members" />
                      </SelectTrigger>
                      <SelectContent>
                        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} members
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="duration">Duration (months)</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Select
                      value={poolData.duration}
                      onValueChange={(value) =>
                        handleSelectChange("duration", value)
                      }
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 9, 12].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} {num === 1 ? "month" : "months"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <FormField>
                  <FormLabel htmlFor="startDate" required>Start Date</FormLabel>
                  <Input
                    id="startDate"
                    name="startDate"
                    value={poolData.startDate}
                    onChange={handleInputChange}
                    onBlur={(e) => handleFieldBlur('startDate', e.target.value)}
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    className={touchedFields.startDate && fieldErrors.startDate ? 'border-destructive' : ''}
                    aria-invalid={!!fieldErrors.startDate}
                  />
                  {touchedFields.startDate && <FormError>{fieldErrors.startDate}</FormError>}
                  <FormHelper>When should the first contribution be due?</FormHelper>
                </FormField>

                <div>
                  <Label className="mb-2 block">Allowed Payment Methods</Label>
                  <p className="text-xs text-gray-500 mb-3">
                    Select which payment methods members can use in this pool
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {AVAILABLE_PAYMENT_METHODS.map((method) => (
                      <div key={method.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`method-${method.value}`}
                          checked={poolData.allowedPaymentMethods.includes(method.value)}
                          onCheckedChange={(checked) =>
                            handlePaymentMethodToggle(method.value, checked === true)
                          }
                          disabled={
                            poolData.allowedPaymentMethods.length === 1 &&
                            poolData.allowedPaymentMethods.includes(method.value)
                          }
                        />
                        <Label
                          htmlFor={`method-${method.value}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {method.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {poolData.allowedPaymentMethods.length === 1 && (
                    <p className="text-xs text-amber-600 mt-2">
                      At least one payment method must be selected
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Invite Members */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <Label>How would you like to invite members?</Label>
                  <RadioGroup
                    value={poolData.inviteMethod}
                    onValueChange={(value) =>
                      handleSelectChange("inviteMethod", value)
                    }
                    className="flex flex-col space-y-1 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="email" id="email" />
                      <Label htmlFor="email">Send email invitations</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="link" id="link" />
                      <Label htmlFor="link">Create a sharing link</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="later" id="later" />
                      <Label htmlFor="later">I'll invite members later</Label>
                    </div>
                  </RadioGroup>
                </div>

                {poolData.inviteMethod === "email" && (
                  <FormField>
                    <FormLabel htmlFor="emails" optional>
                      Email Addresses (separated by commas)
                    </FormLabel>
                    <Input
                      id="emails"
                      name="emails"
                      value={poolData.emails}
                      onChange={handleInputChange}
                      onBlur={(e) => handleFieldBlur('emails', e.target.value)}
                      placeholder="e.g. friend@example.com, family@example.com"
                      className={touchedFields.emails && fieldErrors.emails ? 'border-destructive' : ''}
                      aria-invalid={!!fieldErrors.emails}
                    />
                    {touchedFields.emails && <FormError>{fieldErrors.emails}</FormError>}
                    <FormHelper>We'll send an invitation to join your pool</FormHelper>
                  </FormField>
                )}

                {poolData.inviteMethod === "link" && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      After creating this pool, you'll receive a link that you
                      can share with potential members.
                    </p>
                  </div>
                )}

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800">Summary</h4>
                  <ul className="mt-2 text-sm text-blue-700 space-y-1">
                    <li>Pool name: {poolData.name}</li>
                    <li>
                      Contribution: ${poolData.contributionAmount}{" "}
                      {poolData.frequency}
                    </li>
                    <li>Members: {poolData.totalMembers}</li>
                    <li>
                      Duration: {poolData.duration} month
                      {parseInt(poolData.duration) !== 1 ? "s" : ""}
                    </li>
                    <li>
                      Total pool value: $
                      {parseInt(poolData.contributionAmount || "0") *
                        parseInt(poolData.totalMembers) *
                        parseInt(poolData.duration)}
                    </li>
                    <li>
                      Payment methods:{" "}
                      {poolData.allowedPaymentMethods
                        .map(m => AVAILABLE_PAYMENT_METHODS.find(pm => pm.value === m)?.label)
                        .filter(Boolean)
                        .join(", ")}
                    </li>
                  </ul>

                  {/* Estimated Payout Schedule */}
                  {poolData.startDate && (
                    <div className="mt-4 pt-3 border-t border-blue-200">
                      <h5 className="font-medium text-blue-800 text-sm mb-2">
                        Estimated Payout Schedule
                      </h5>
                      <div className="grid grid-cols-2 gap-1 text-xs text-blue-600">
                        {calculatePayoutDates().slice(0, 6).map((date, index) => (
                          <div key={index} className="flex justify-between">
                            <span>Round {index + 1}:</span>
                            <span>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        ))}
                        {calculatePayoutDates().length > 6 && (
                          <div className="col-span-2 text-blue-500 text-xs mt-1">
                            ... and {calculatePayoutDates().length - 6} more rounds
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-blue-500 mt-2">
                        * Each member receives the pool on their assigned round
                      </p>
                    </div>
                  )}
                </div>
              </div>
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
