/**
 * Step 3: Invite Members
 *
 * Collects invitation method and email addresses, displays summary
 */

"use client";

import { FormField, FormError, FormLabel, FormHelper } from "../../ui/form-field";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { RadioGroup, RadioGroupItem } from "../../ui/radio-group";
import { StepProps, AVAILABLE_PAYMENT_METHODS } from "./types";

interface InviteMembersStepProps extends StepProps {
  payoutDates: Date[];
}

export function InviteMembersStep({
  poolData,
  onInputChange,
  onSelectChange,
  onFieldBlur,
  fieldErrors,
  touchedFields,
  payoutDates,
}: InviteMembersStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>How would you like to invite members?</Label>
        <RadioGroup
          value={poolData.inviteMethod}
          onValueChange={(value) => onSelectChange("inviteMethod", value)}
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
            onChange={onInputChange}
            onBlur={(e) => onFieldBlur('emails', e.target.value)}
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

      {/* Summary */}
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
        {poolData.startDate && payoutDates.length > 0 && (
          <div className="mt-4 pt-3 border-t border-blue-200">
            <h5 className="font-medium text-blue-800 text-sm mb-2">
              Estimated Payout Schedule
            </h5>
            <div className="grid grid-cols-2 gap-1 text-xs text-blue-600">
              {payoutDates.slice(0, 6).map((date, index) => (
                <div key={index} className="flex justify-between">
                  <span>Round {index + 1}:</span>
                  <span>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              ))}
              {payoutDates.length > 6 && (
                <div className="col-span-2 text-blue-500 text-xs mt-1">
                  ... and {payoutDates.length - 6} more rounds
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
  );
}
