'use client';

import React, { useState } from 'react';
import { CreditCard, Building, User, Mail } from 'lucide-react';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

// Generate arrays for expiry month and year dropdowns
const currentYear = new Date().getFullYear();
const months = Array.from({ length: 12 }, (_, i) => {
  const month = i + 1;
  return { value: month.toString().padStart(2, '0'), label: month.toString().padStart(2, '0') };
});
const years = Array.from({ length: 10 }, (_, i) => {
  const year = currentYear + i;
  return { value: year.toString(), label: year.toString() };
});

export interface PaymentMethodFormValues {
  type: 'paypal' | 'card' | 'bank';
  paypalEmail?: string;
  cardholderName?: string;
  cardNumber?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cvv?: string;
  accountHolderName?: string;
  accountNumber?: string;
  routingNumber?: string;
  accountType?: 'checking' | 'savings';
  isDefault: boolean;
}

interface PaymentMethodFormProps {
  initialValues?: Partial<PaymentMethodFormValues>;
  onSubmit: (values: PaymentMethodFormValues) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

// PayPal logo SVG component
function PayPalLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.384a.774.774 0 0 1 .763-.635h6.154c2.044 0 3.488.4 4.293 1.191.755.743 1.052 1.858.882 3.312-.064.545-.183 1.074-.357 1.576-.168.482-.397.93-.683 1.334a5.228 5.228 0 0 1-1.053 1.107c-.43.353-.903.626-1.41.815-.513.191-1.076.334-1.691.426-.607.092-1.226.139-1.848.139H7.877l-.801 7.888z" />
      <path d="M19.25 8.058c-.064.545-.183 1.074-.357 1.576-.168.482-.397.93-.683 1.334-.287.405-.625.761-1.013 1.064-.388.302-.827.552-1.316.749-.488.197-1.015.346-1.578.447-.563.1-1.162.151-1.797.151H10.43l-.801 7.888h-2.5l3.107-17.213h6.154c2.044 0 3.488.4 4.293 1.191.573.563.91 1.296 1.008 2.191.098.896-.005 1.904-.44 3.622z" />
    </svg>
  );
}

export function PaymentMethodForm({
  initialValues,
  onSubmit,
  onCancel,
  isEditing = false,
}: PaymentMethodFormProps) {
  const [values, setValues] = useState<PaymentMethodFormValues>({
    type: initialValues?.type || 'paypal',
    paypalEmail: initialValues?.paypalEmail || '',
    cardholderName: initialValues?.cardholderName || '',
    cardNumber: initialValues?.cardNumber || '',
    expiryMonth: initialValues?.expiryMonth || '',
    expiryYear: initialValues?.expiryYear || '',
    cvv: initialValues?.cvv || '',
    accountHolderName: initialValues?.accountHolderName || '',
    accountNumber: initialValues?.accountNumber || '',
    routingNumber: initialValues?.routingNumber || '',
    accountType: initialValues?.accountType || 'checking',
    isDefault: initialValues?.isDefault || false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setValues({
      ...values,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setValues({
      ...values,
      [name]: value,
    });
  };

  const handlePaymentTypeChange = (value: 'paypal' | 'card' | 'bank') => {
    setValues({
      ...values,
      type: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    return value
      .replace(/\s/g, '') // Remove existing spaces
      .replace(/(.{4})/g, '$1 ') // Add space after every 4 chars
      .trim(); // Remove trailing space
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <div className="mb-4">
          <RadioGroup
            value={values.type}
            onValueChange={(value) => handlePaymentTypeChange(value as 'paypal' | 'card' | 'bank')}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="paypal" id="payment-paypal" />
              <Label htmlFor="payment-paypal" className="flex items-center cursor-pointer">
                <PayPalLogo className="mr-2 h-4 w-4 text-[#003087]" />
                PayPal
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="card" id="payment-card" />
              <Label htmlFor="payment-card" className="flex items-center cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4" />
                Credit/Debit Card
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bank" id="payment-bank" />
              <Label htmlFor="payment-bank" className="flex items-center cursor-pointer">
                <Building className="mr-2 h-4 w-4" />
                Bank Account
              </Label>
            </div>
          </RadioGroup>
        </div>

        {values.type === 'paypal' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
              <p className="text-sm text-blue-800">
                Enter your PayPal email address. You&apos;ll be redirected to PayPal to authorize payments when making contributions.
              </p>
            </div>
            <div>
              <Label htmlFor="paypalEmail">PayPal Email Address</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="paypalEmail"
                  name="paypalEmail"
                  type="email"
                  value={values.paypalEmail}
                  onChange={handleChange}
                  className="pl-10"
                  placeholder="your-email@example.com"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {values.type === 'card' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="cardholderName">Name on Card</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="cardholderName"
                  name="cardholderName"
                  value={values.cardholderName}
                  onChange={handleChange}
                  className="pl-10"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cardNumber">Card Number</Label>
              <div className="relative mt-1">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="cardNumber"
                  name="cardNumber"
                  value={values.cardNumber}
                  onChange={(e) => {
                    // Only allow digits and limit to 19 chars (16 digits + 3 spaces)
                    const cleaned = e.target.value.replace(/\D/g, '').substring(0, 16);
                    setValues({
                      ...values,
                      cardNumber: formatCardNumber(cleaned),
                    });
                  }}
                  className="pl-10"
                  placeholder="4242 4242 4242 4242"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <Label htmlFor="expiryMonth">Month</Label>
                <Select
                  value={values.expiryMonth}
                  onValueChange={(value) => handleSelectChange('expiryMonth', value)}
                >
                  <SelectTrigger id="expiryMonth" className="mt-1">
                    <SelectValue placeholder="MM" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-1">
                <Label htmlFor="expiryYear">Year</Label>
                <Select
                  value={values.expiryYear}
                  onValueChange={(value) => handleSelectChange('expiryYear', value)}
                >
                  <SelectTrigger id="expiryYear" className="mt-1">
                    <SelectValue placeholder="YYYY" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-1">
                <Label htmlFor="cvv">CVV</Label>
                <div className="relative mt-1">
                  <Input
                    id="cvv"
                    name="cvv"
                    value={values.cvv}
                    onChange={(e) => {
                      // Only allow digits and limit to 4 chars
                      const cleaned = e.target.value.replace(/\D/g, '').substring(0, 4);
                      setValues({
                        ...values,
                        cvv: cleaned,
                      });
                    }}
                    className="pl-3"
                    placeholder="123"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {values.type === 'bank' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="accountHolderName">Account Holder Name</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="accountHolderName"
                  name="accountHolderName"
                  value={values.accountHolderName}
                  onChange={handleChange}
                  className="pl-10"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="routingNumber">Routing Number</Label>
              <div className="relative mt-1">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="routingNumber"
                  name="routingNumber"
                  value={values.routingNumber}
                  onChange={(e) => {
                    // Only allow digits and limit to 9 chars
                    const cleaned = e.target.value.replace(/\D/g, '').substring(0, 9);
                    setValues({
                      ...values,
                      routingNumber: cleaned,
                    });
                  }}
                  className="pl-10"
                  placeholder="123456789"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="accountNumber">Account Number</Label>
              <div className="relative mt-1">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="accountNumber"
                  name="accountNumber"
                  value={values.accountNumber}
                  onChange={(e) => {
                    // Only allow digits and limit to 17 chars
                    const cleaned = e.target.value.replace(/\D/g, '').substring(0, 17);
                    setValues({
                      ...values,
                      accountNumber: cleaned,
                    });
                  }}
                  className="pl-10"
                  placeholder="123456789012"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Account Type</Label>
              <RadioGroup
                value={values.accountType}
                onValueChange={(value) => handleSelectChange('accountType', value)}
                className="flex space-x-4 mt-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="checking" id="account-checking" />
                  <Label htmlFor="account-checking">Checking</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="savings" id="account-savings" />
                  <Label htmlFor="account-savings">Savings</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center">
          <input
            type="checkbox"
            id="isDefault"
            name="isDefault"
            checked={values.isDefault}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <Label htmlFor="isDefault" className="ml-2 text-sm">
            Set as default payment method
          </Label>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {isEditing ? 'Update' : 'Add'} Payment Method
        </Button>
      </div>
    </form>
  );
}
