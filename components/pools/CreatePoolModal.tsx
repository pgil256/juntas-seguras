// components/pools/CreatePoolModal.tsx
"use client";

import { useState } from "react";
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
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
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
  
  const { createPool, isLoading, error } = useCreatePool({
    onSuccess: (poolId) => {
      // Notify parent component
      if (onCreatePool) {
        onCreatePool({ id: poolId, ...poolData });
      }
      
      // Close modal and redirect to member management
      onClose();
      router.push(`/member-management/${poolId}`);
    }
  });
  
  const [poolData, setPoolData] = useState({
    name: "",
    contributionAmount: "",
    frequency: "weekly",
    totalMembers: "4",
    duration: "3",
    startDate: "",
    description: "",
    inviteMethod: "email",
    emails: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPoolData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setPoolData((prev) => ({ ...prev, [name]: value }));
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
      
      if (!poolData.contributionAmount || isNaN(Number(poolData.contributionAmount)) || Number(poolData.contributionAmount) <= 0) {
        errors.push('Valid contribution amount is required');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
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
        invitations
      };
      
      // Use the hook to create the pool
      const poolId = await createPool(createPoolRequest);
      
      if (poolId) {
        // Reset form and close modal on success
        setStep(1);
        setPoolData({
          name: "",
          contributionAmount: "",
          frequency: "weekly",
          totalMembers: "4",
          duration: "3",
          startDate: "",
          description: "",
          inviteMethod: "email",
          emails: ""
        });
        onClose();
      }
    } catch (err) {
      console.error("Error creating pool:", err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md px-4 sm:px-6 py-5 sm:py-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center sm:text-left">
            Create a New Savings Pool
          </DialogTitle>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded p-1 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        <div className="mt-4 pt-2">
          {/* Step indicator */}
          <div className="flex justify-between mb-8 px-4 sm:px-0">
            <div className="flex items-center">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${
                  step >= 1
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step > 1 ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : "1"}
              </div>
              <div
                className={`h-1 w-8 sm:w-10 transition-colors duration-300 ${
                  step > 1 ? "bg-blue-600" : "bg-gray-200"
                }`}
              ></div>
            </div>
            <div className="flex items-center">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${
                  step >= 2
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step > 2 ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : "2"}
              </div>
              <div
                className={`h-1 w-8 sm:w-10 transition-colors duration-300 ${
                  step > 2 ? "bg-blue-600" : "bg-gray-200"
                }`}
              ></div>
            </div>
            <div className="flex items-center">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${
                  step >= 3
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step > 3 ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : "3"}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Basic Pool Information */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Pool Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={poolData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Family Savings Pool"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    name="description"
                    value={poolData.description}
                    onChange={handleInputChange}
                    placeholder="What is this pool for?"
                  />
                </div>

                <div>
                  <Label htmlFor="contributionAmount">
                    Contribution Amount ($)
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="contributionAmount"
                      name="contributionAmount"
                      value={poolData.contributionAmount}
                      onChange={handleInputChange}
                      className="pl-10"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
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

                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    value={poolData.startDate}
                    onChange={handleInputChange}
                    type="date"
                    required
                  />
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
                  <div>
                    <Label htmlFor="emails">
                      Enter email addresses (separated by commas)
                    </Label>
                    <Input
                      id="emails"
                      name="emails"
                      value={poolData.emails}
                      onChange={handleInputChange}
                      placeholder="e.g. friend@example.com, family@example.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      We'll send an invitation to join your pool
                    </p>
                  </div>
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
                  </ul>
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
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePoolModal;
