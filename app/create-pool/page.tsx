// app/create-pool/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreatePool } from "../../lib/hooks/useCreatePool";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import {
  Calendar,
  Users,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Check,
  Info,
} from "lucide-react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../../components/ui/card";

// Mock user ID - in a real app, this would come from authentication context
const mockUserId = 'user123';

export default function CreatePoolPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createPool, isLoading, error } = useCreatePool({
    
    onSuccess: (poolId) => {
      // Navigate to member management to invite members
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
    emails: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPoolData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setPoolData((prev) => ({ ...prev, [name]: value }));
  };

  const nextStep = () => {
    setStep((prev) => prev + 1);
    // Scroll to top on step change
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setStep((prev) => prev - 1);
    // Scroll to top on step change
    window.scrollTo(0, 0);
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];
    
    if (!poolData.name.trim()) {
      errors.push('Pool name is required');
    }
    
    const amount = Number(poolData.contributionAmount);
    if (!poolData.contributionAmount || isNaN(amount) || !Number.isInteger(amount) || amount < 1 || amount > 20) {
      errors.push('Contribution amount must be between $1 and $20');
    }
    
    if (!poolData.startDate) {
      errors.push('Start date is required');
    }
    
    setFormErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Transform form data to match API expected format
      const totalRounds = parseInt(poolData.totalMembers); // Total rounds equals number of members
      const createPoolRequest = {
        name: poolData.name,
        description: poolData.description,
        contributionAmount: Number(poolData.contributionAmount),
        frequency: poolData.frequency,
        totalRounds,
        startDate: poolData.startDate
      };
      
      // Use the hook to create the pool
      await createPool(createPoolRequest);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotalValue = () => {
    const amount = parseInt(poolData.contributionAmount || "0");
    const members = parseInt(poolData.totalMembers);
    const duration = parseInt(poolData.duration);

    return amount * members * duration;
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Tell us about your savings pool
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">
                    Pool Name <span className="text-red-500">*</span>
                  </Label>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    A clear description helps members understand the purpose of
                    this pool
                  </p>
                </div>

                <div>
                  <Label htmlFor="contributionAmount">
                    Contribution Amount ($){" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Select
                      value={poolData.contributionAmount}
                      onValueChange={(value) =>
                        handleSelectChange("contributionAmount", value)
                      }
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Select amount" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 20 }, (_, i) => i + 1).map((amount) => (
                          <SelectItem key={amount} value={amount.toString()}>
                            ${amount}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This is the amount each member will contribute per cycle
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pool Schedule</CardTitle>
                <CardDescription>
                  Set up the timing and membership details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>
                    Contribution Frequency{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <RadioGroup
                    value={poolData.frequency}
                    onValueChange={(value) =>
                      handleSelectChange("frequency", value)
                    }
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                      <RadioGroupItem value="weekly" id="weekly" />
                      <Label htmlFor="weekly" className="cursor-pointer">
                        Weekly
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                      <RadioGroupItem value="biweekly" id="biweekly" />
                      <Label htmlFor="biweekly" className="cursor-pointer">
                        Bi-weekly
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                      <RadioGroupItem value="monthly" id="monthly" />
                      <Label htmlFor="monthly" className="cursor-pointer">
                        Monthly
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="totalMembers">
                    Number of Members <span className="text-red-500">*</span>
                  </Label>
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
                        {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} members
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This includes you as a member
                  </p>
                </div>

                <div>
                  <Label htmlFor="duration">
                    Duration <span className="text-red-500">*</span>
                  </Label>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    The total length of time for the pool to complete
                  </p>
                </div>

                <div>
                  <Label htmlFor="startDate">
                    Start Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    value={poolData.startDate}
                    onChange={handleInputChange}
                    type="date"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The date when the first contribution will be due
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Invite Members</CardTitle>
                <CardDescription>
                  Bring in your friends and family to join this pool
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>
                    How would you like to invite members?{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <RadioGroup
                    value={poolData.inviteMethod}
                    onValueChange={(value) =>
                      handleSelectChange("inviteMethod", value)
                    }
                    className="space-y-3 mt-2"
                  >
                    <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                      <RadioGroupItem value="email" id="email" />
                      <div className="flex-1">
                        <Label htmlFor="email" className="cursor-pointer">
                          Send email invitations
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          We'll send invites to the email addresses you provide
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                      <RadioGroupItem value="link" id="link" />
                      <div className="flex-1">
                        <Label htmlFor="link" className="cursor-pointer">
                          Create a sharing link
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Generate a link you can share via messaging apps
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                      <RadioGroupItem value="later" id="later" />
                      <div className="flex-1">
                        <Label htmlFor="later" className="cursor-pointer">
                          I'll invite members later
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          You can invite people after creating the pool
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {poolData.inviteMethod === "email" && (
                  <div>
                    <Label htmlFor="emails">Enter email addresses</Label>
                    <Input
                      id="emails"
                      name="emails"
                      value={poolData.emails}
                      onChange={handleInputChange}
                      placeholder="e.g. friend@example.com, family@example.com"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Separate multiple emails with commas
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pool Summary</CardTitle>
                <CardDescription>
                  Review your pool details before creating
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-medium">Pool name:</span>
                    <span>{poolData.name}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-medium">Contribution:</span>
                    <span>
                      ${poolData.contributionAmount} {poolData.frequency}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-medium">Members:</span>
                    <span>{poolData.totalMembers}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-medium">Duration:</span>
                    <span>
                      {poolData.duration} month
                      {parseInt(poolData.duration) !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-medium">Start date:</span>
                    <span>
                      {poolData.startDate
                        ? new Date(poolData.startDate).toLocaleDateString()
                        : "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total pool value:</span>
                    <span>${calculateTotalValue()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Create a New Savings Pool
          </h1>
          <p className="mt-1 text-gray-600">
            Complete the steps below to set up your pool
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="h-1 w-12 sm:w-24 md:w-36 bg-gray-200"></div>
              </div>
              <div className={`relative w-10 h-10 flex items-center justify-center rounded-full text-white ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`}>
                {step > 1 ? <Check className="h-6 w-6" /> : 1}
              </div>
            </div>
            <div className={`h-1 w-12 sm:w-24 md:w-36 ${step > 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`relative w-10 h-10 flex items-center justify-center rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              {step > 2 ? <Check className="h-6 w-6" /> : 2}
            </div>
            <div className={`h-1 w-12 sm:w-24 md:w-36 ${step > 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`relative w-10 h-10 flex items-center justify-center rounded-full ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              {step > 3 ? <Check className="h-6 w-6" /> : 3}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs sm:text-sm">
            <div className={`font-medium ${step >= 1 ? 'text-blue-600' : 'text-gray-600'}`}>Basic Info</div>
            <div className={`font-medium ${step >= 2 ? 'text-blue-600' : 'text-gray-600'}`}>Schedule</div>
            <div className={`font-medium ${step >= 3 ? 'text-blue-600' : 'text-gray-600'} text-right`}>
              Review
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {renderStepContent()}

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

          <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
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
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/")}
                className="flex items-center justify-center min-h-[44px] w-full sm:w-auto"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Cancel
              </Button>
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
                disabled={isLoading || isSubmitting}
              >
                {isLoading ? 'Creating...' : 'Create Pool'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
