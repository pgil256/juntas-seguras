/**
 * Step 2: Pool Schedule
 *
 * Collects frequency, member count, duration, start date, and payment methods
 */

"use client";

import { Calendar, Users } from "lucide-react";
import { FormField, FormError, FormLabel, FormHelper } from "../../ui/form-field";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { RadioGroup, RadioGroupItem } from "../../ui/radio-group";
import { Checkbox } from "../../ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { StepProps, AVAILABLE_PAYMENT_METHODS } from "./types";
import { PaymentMethodType } from "../../../types/pool";

interface ScheduleStepProps extends StepProps {
  onPaymentMethodToggle: (method: PaymentMethodType, checked: boolean) => void;
}

export function ScheduleStep({
  poolData,
  onInputChange,
  onSelectChange,
  onFieldBlur,
  fieldErrors,
  touchedFields,
  onPaymentMethodToggle,
}: ScheduleStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Contribution Frequency</Label>
        <RadioGroup
          value={poolData.frequency}
          onValueChange={(value) => onSelectChange("frequency", value)}
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
            onValueChange={(value) => onSelectChange("totalMembers", value)}
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
            onValueChange={(value) => onSelectChange("duration", value)}
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
          onChange={onInputChange}
          onBlur={(e) => onFieldBlur('startDate', e.target.value)}
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
                  onPaymentMethodToggle(method.value, checked === true)
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
  );
}
