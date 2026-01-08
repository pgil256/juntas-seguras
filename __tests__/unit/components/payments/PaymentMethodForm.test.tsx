/**
 * PaymentMethodForm Component Tests
 *
 * Tests for the PaymentMethodForm component which handles adding/editing
 * credit card and bank account payment methods.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PaymentMethodForm, PaymentMethodFormValues } from '@/components/payments/PaymentMethodForm';

describe('PaymentMethodForm Component', () => {
  const defaultProps = {
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly with default props', () => {
      render(<PaymentMethodForm {...defaultProps} />);

      // Should show payment type selection
      expect(screen.getByLabelText(/Credit\/Debit Card/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Bank Account/i)).toBeInTheDocument();
    });

    it('defaults to card payment type', () => {
      render(<PaymentMethodForm {...defaultProps} />);

      // Card fields should be visible
      expect(screen.getByLabelText(/Name on Card/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Card Number/i)).toBeInTheDocument();
    });

    it('renders card form fields when card type is selected', () => {
      render(<PaymentMethodForm {...defaultProps} />);

      expect(screen.getByLabelText(/Name on Card/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Card Number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Month/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Year/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/CVV/i)).toBeInTheDocument();
    });

    it('renders bank form fields when bank type is selected', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodForm {...defaultProps} />);

      // Click on bank account option
      await user.click(screen.getByLabelText(/Bank Account/i));

      expect(screen.getByLabelText(/Account Holder Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Routing Number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Account Number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Checking/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Savings/i)).toBeInTheDocument();
    });

    it('renders default checkbox', () => {
      render(<PaymentMethodForm {...defaultProps} />);

      expect(screen.getByLabelText(/Set as default payment method/i)).toBeInTheDocument();
    });

    it('renders submit and cancel buttons', () => {
      render(<PaymentMethodForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Add Payment Method/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('shows Update button when editing', () => {
      render(<PaymentMethodForm {...defaultProps} isEditing />);

      expect(screen.getByRole('button', { name: /Update Payment Method/i })).toBeInTheDocument();
    });
  });

  describe('Initial Values', () => {
    it('populates card fields from initial values', () => {
      const initialValues: Partial<PaymentMethodFormValues> = {
        type: 'card',
        cardholderName: 'John Doe',
        cardNumber: '4242 4242 4242 4242',
        expiryMonth: '12',
        expiryYear: '2027',
        cvv: '123',
        isDefault: true,
      };

      render(<PaymentMethodForm {...defaultProps} initialValues={initialValues} />);

      expect(screen.getByLabelText(/Name on Card/i)).toHaveValue('John Doe');
      expect(screen.getByLabelText(/Card Number/i)).toHaveValue('4242 4242 4242 4242');
      expect(screen.getByLabelText(/CVV/i)).toHaveValue('123');
      expect(screen.getByLabelText(/Set as default payment method/i)).toBeChecked();
    });

    it('populates bank fields from initial values', async () => {
      const initialValues: Partial<PaymentMethodFormValues> = {
        type: 'bank',
        accountHolderName: 'Jane Doe',
        routingNumber: '123456789',
        accountNumber: '987654321',
        accountType: 'savings',
        isDefault: false,
      };

      render(<PaymentMethodForm {...defaultProps} initialValues={initialValues} />);

      expect(screen.getByLabelText(/Account Holder Name/i)).toHaveValue('Jane Doe');
      expect(screen.getByLabelText(/Routing Number/i)).toHaveValue('123456789');
      expect(screen.getByLabelText(/Account Number/i)).toHaveValue('987654321');
      expect(screen.getByLabelText(/Savings/i)).toBeChecked();
    });
  });

  describe('Form Interactions - Card', () => {
    it('updates cardholder name on input', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodForm {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Name on Card/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Smith');

      expect(nameInput).toHaveValue('Jane Smith');
    });

    it('formats card number with spaces', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodForm {...defaultProps} />);

      const cardInput = screen.getByLabelText(/Card Number/i);
      await user.type(cardInput, '4242424242424242');

      expect(cardInput).toHaveValue('4242 4242 4242 4242');
    });

    it('limits card number to 16 digits', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodForm {...defaultProps} />);

      const cardInput = screen.getByLabelText(/Card Number/i);
      await user.type(cardInput, '42424242424242429999');

      // Should only have 16 digits (plus spaces)
      expect(cardInput).toHaveValue('4242 4242 4242 4242');
    });

    it('only allows digits in card number', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodForm {...defaultProps} />);

      const cardInput = screen.getByLabelText(/Card Number/i);
      await user.type(cardInput, '4242abc4242');

      expect(cardInput).toHaveValue('4242 4242');
    });

    it('limits CVV to 4 digits', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodForm {...defaultProps} />);

      const cvvInput = screen.getByLabelText(/CVV/i);
      await user.type(cvvInput, '123456');

      expect(cvvInput).toHaveValue('1234');
    });

    it('only allows digits in CVV', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodForm {...defaultProps} />);

      const cvvInput = screen.getByLabelText(/CVV/i);
      await user.type(cvvInput, '12abc3');

      expect(cvvInput).toHaveValue('123');
    });

    it('allows selecting expiry month', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodForm {...defaultProps} />);

      // Find and click the month select trigger
      const monthSelect = screen.getByRole('combobox', { name: '' });
      await user.click(monthSelect);

      // Select December (12)
      await waitFor(() => {
        expect(screen.getByRole('option', { name: '12' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('option', { name: '12' }));
    });
  });

  describe('Form Interactions - Bank', () => {
    it('switches to bank form when bank type is selected', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodForm {...defaultProps} />);

      await user.click(screen.getByLabelText(/Bank Account/i));

      expect(screen.getByLabelText(/Account Holder Name/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/Card Number/i)).not.toBeInTheDocument();
    });

    it('limits routing number to 9 digits', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodForm {...defaultProps} />);

      await user.click(screen.getByLabelText(/Bank Account/i));

      const routingInput = screen.getByLabelText(/Routing Number/i);
      await user.type(routingInput, '12345678901234');

      expect(routingInput).toHaveValue('123456789');
    });

    it('limits account number to 17 digits', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodForm {...defaultProps} />);

      await user.click(screen.getByLabelText(/Bank Account/i));

      const accountInput = screen.getByLabelText(/Account Number/i);
      await user.type(accountInput, '12345678901234567890');

      expect(accountInput).toHaveValue('12345678901234567');
    });

    it('allows switching between checking and savings', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodForm {...defaultProps} />);

      await user.click(screen.getByLabelText(/Bank Account/i));

      // Default should be checking
      expect(screen.getByLabelText(/Checking/i)).toBeChecked();

      // Click savings
      await user.click(screen.getByLabelText(/Savings/i));
      expect(screen.getByLabelText(/Savings/i)).toBeChecked();
    });
  });

  describe('Default Checkbox', () => {
    it('toggles isDefault when checkbox is clicked', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodForm {...defaultProps} />);

      const checkbox = screen.getByLabelText(/Set as default payment method/i);
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with card values', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      render(<PaymentMethodForm {...defaultProps} onSubmit={onSubmit} />);

      // Fill out card form
      await user.type(screen.getByLabelText(/Name on Card/i), 'John Doe');
      await user.type(screen.getByLabelText(/Card Number/i), '4242424242424242');
      await user.type(screen.getByLabelText(/CVV/i), '123');

      // Submit form
      await user.click(screen.getByRole('button', { name: /Add Payment Method/i }));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'card',
          cardholderName: 'John Doe',
          cardNumber: '4242 4242 4242 4242',
          cvv: '123',
        })
      );
    });

    it('calls onSubmit with bank values', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      render(<PaymentMethodForm {...defaultProps} onSubmit={onSubmit} />);

      // Switch to bank
      await user.click(screen.getByLabelText(/Bank Account/i));

      // Fill out bank form
      await user.type(screen.getByLabelText(/Account Holder Name/i), 'Jane Doe');
      await user.type(screen.getByLabelText(/Routing Number/i), '123456789');
      await user.type(screen.getByLabelText(/Account Number/i), '987654321');

      // Submit form
      await user.click(screen.getByRole('button', { name: /Add Payment Method/i }));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'bank',
          accountHolderName: 'Jane Doe',
          routingNumber: '123456789',
          accountNumber: '987654321',
          accountType: 'checking',
        })
      );
    });

    it('includes isDefault in submission', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      render(<PaymentMethodForm {...defaultProps} onSubmit={onSubmit} />);

      // Check the default checkbox
      await user.click(screen.getByLabelText(/Set as default payment method/i));

      // Fill minimum required fields
      await user.type(screen.getByLabelText(/Name on Card/i), 'Test');
      await user.type(screen.getByLabelText(/Card Number/i), '4242424242424242');
      await user.type(screen.getByLabelText(/CVV/i), '123');

      await user.click(screen.getByRole('button', { name: /Add Payment Method/i }));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          isDefault: true,
        })
      );
    });
  });

  describe('Cancel', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = jest.fn();
      render(<PaymentMethodForm {...defaultProps} onCancel={onCancel} />);

      await user.click(screen.getByRole('button', { name: /Cancel/i }));

      expect(onCancel).toHaveBeenCalled();
    });

    it('does not call onSubmit when cancel is clicked', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      const onCancel = jest.fn();
      render(<PaymentMethodForm {...defaultProps} onSubmit={onSubmit} onCancel={onCancel} />);

      await user.click(screen.getByRole('button', { name: /Cancel/i }));

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has accessible labels for all form inputs', () => {
      render(<PaymentMethodForm {...defaultProps} />);

      // All inputs should have associated labels
      expect(screen.getByLabelText(/Name on Card/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Card Number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/CVV/i)).toBeInTheDocument();
    });

    it('has accessible radio buttons for payment type', () => {
      render(<PaymentMethodForm {...defaultProps} />);

      const cardRadio = screen.getByLabelText(/Credit\/Debit Card/i);
      const bankRadio = screen.getByLabelText(/Bank Account/i);

      expect(cardRadio).toHaveAttribute('type', 'button'); // Radix UI uses button role
      expect(bankRadio).toHaveAttribute('type', 'button');
    });

    it('form is keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodForm {...defaultProps} />);

      // Tab through form elements
      await user.tab();
      // First focusable should be one of the radio buttons or inputs
      expect(document.activeElement).not.toBe(document.body);
    });

    it('submit button has correct type', () => {
      render(<PaymentMethodForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /Add Payment Method/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('cancel button has correct type', () => {
      render(<PaymentMethodForm {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      expect(cancelButton).toHaveAttribute('type', 'button');
    });
  });

  describe('Form Validation', () => {
    it('has required attribute on card name input', () => {
      render(<PaymentMethodForm {...defaultProps} />);

      expect(screen.getByLabelText(/Name on Card/i)).toBeRequired();
    });

    it('has required attribute on card number input', () => {
      render(<PaymentMethodForm {...defaultProps} />);

      expect(screen.getByLabelText(/Card Number/i)).toBeRequired();
    });

    it('has required attribute on CVV input', () => {
      render(<PaymentMethodForm {...defaultProps} />);

      expect(screen.getByLabelText(/CVV/i)).toBeRequired();
    });

    it('has required attribute on bank account inputs', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodForm {...defaultProps} />);

      await user.click(screen.getByLabelText(/Bank Account/i));

      expect(screen.getByLabelText(/Account Holder Name/i)).toBeRequired();
      expect(screen.getByLabelText(/Routing Number/i)).toBeRequired();
      expect(screen.getByLabelText(/Account Number/i)).toBeRequired();
    });
  });

  describe('Placeholders', () => {
    it('shows correct placeholder for card number', () => {
      render(<PaymentMethodForm {...defaultProps} />);

      expect(screen.getByLabelText(/Card Number/i)).toHaveAttribute(
        'placeholder',
        '4242 4242 4242 4242'
      );
    });

    it('shows correct placeholder for cardholder name', () => {
      render(<PaymentMethodForm {...defaultProps} />);

      expect(screen.getByLabelText(/Name on Card/i)).toHaveAttribute(
        'placeholder',
        'John Doe'
      );
    });

    it('shows correct placeholder for CVV', () => {
      render(<PaymentMethodForm {...defaultProps} />);

      expect(screen.getByLabelText(/CVV/i)).toHaveAttribute(
        'placeholder',
        '123'
      );
    });
  });
});
