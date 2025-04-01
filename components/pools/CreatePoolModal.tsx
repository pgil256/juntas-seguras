// components/pools/CreatePoolModal.tsx
"use client";

import { useState } from "react";
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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [step, setStep] = useState(1);
  const [poolData, setPoolData] = useState({
    name: "",
    contributionAmount: "",
    frequency: "weekly",
    totalMembers: "4",
    duration: "3",
    startDate: "",
    description: "",
    inviteMethod: "email",
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
  };

  const prevStep = () => {
    setStep((prev) => prev - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onCreatePool) {
      onCreatePool(poolData);
    }
    onClose();
    // Reset form
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
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Create a New Savings Pool
          </DialogTitle>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        <div className="mt-4">
          {/* Step indicator */}
          <div className="flex justify-between mb-8">
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 1
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step > 1 ? <Check className="h-5 w-5" /> : "1"}
              </div>
              <div
                className={`h-1 w-10 ${
                  step > 1 ? "bg-blue-600" : "bg-gray-200"
                }`}
              ></div>
            </div>
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 2
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step > 2 ? <Check className="h-5 w-5" /> : "2"}
              </div>
              <div
                className={`h-1 w-10 ${
                  step > 2 ? "bg-blue-600" : "bg-gray-200"
                }`}
              ></div>
            </div>
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 3
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step > 3 ? <Check className="h-5 w-5" /> : "3"}
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

            <DialogFooter className="mt-6 flex justify-between sm:justify-between">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="flex items-center"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              ) : (
                <div></div> // Empty div for spacing
              )}

              {step < 3 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Create Pool
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
