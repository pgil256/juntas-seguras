/**
 * Step 1: Basic Pool Information
 *
 * Collects pool name, description, and contribution amount
 */

"use client";

import { DollarSign } from "lucide-react";
import { FormField, FormError, FormLabel, FormHelper } from "../../ui/form-field";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { StepProps } from "./types";

export function BasicInfoStep({
  poolData,
  onInputChange,
  onSelectChange,
  onFieldBlur,
  fieldErrors,
  touchedFields,
}: StepProps) {
  return (
    <div className="space-y-4">
      <FormField>
        <FormLabel htmlFor="name" required>Pool Name</FormLabel>
        <Input
          id="name"
          name="name"
          value={poolData.name}
          onChange={onInputChange}
          onBlur={(e) => onFieldBlur('name', e.target.value)}
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
          onChange={onInputChange}
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
            onValueChange={(value) => onSelectChange("contributionAmount", value)}
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
  );
}
