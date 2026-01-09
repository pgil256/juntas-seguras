/**
 * Quick Create Mode
 *
 * Simplified all-in-one form for quick pool creation
 */

"use client";

import { FormField, FormError, FormLabel } from "../../ui/form-field";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { StepProps } from "./types";

interface QuickCreateStepProps extends StepProps {
  onSwitchToDetailed: () => void;
}

export function QuickCreateStep({
  poolData,
  onInputChange,
  onSelectChange,
  onFieldBlur,
  fieldErrors,
  touchedFields,
  onSwitchToDetailed,
}: QuickCreateStepProps) {
  return (
    <div className="space-y-4">
      <FormField>
        <FormLabel htmlFor="qc-name" required>Pool Name</FormLabel>
        <Input
          id="qc-name"
          name="name"
          value={poolData.name}
          onChange={onInputChange}
          onBlur={(e) => onFieldBlur('name', e.target.value)}
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
            onValueChange={(value) => onSelectChange("contributionAmount", value)}
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
            onValueChange={(value) => onSelectChange("totalMembers", value)}
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
            onValueChange={(value) => onSelectChange("frequency", value)}
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
            onChange={onInputChange}
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
        onClick={onSwitchToDetailed}
        className="text-sm text-gray-500 hover:text-gray-700 underline"
      >
        Switch to detailed setup
      </button>
    </div>
  );
}
