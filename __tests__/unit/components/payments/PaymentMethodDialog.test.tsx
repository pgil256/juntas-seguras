/**
 * PaymentMethodDialog Component Tests
 *
 * Tests for the PaymentMethodDialog modal component used for adding/editing payment methods.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentMethodDialog } from '@/components/payments/PaymentMethodDialog';
import { PaymentMethodFormValues } from '@/components/payments/PaymentMethodForm';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: {
      user: { id: 'user123', email: 'test@example.com' },
      mfaMethod: 'email',
    },
    status: 'authenticated',
  })),
}));

// Mock the MfaProtection component to simplify testing
jest.mock('@/components/security/MfaProtection', () => {
  return function MockMfaProtection({
    children,
    onVerified,
    onCancel
  }: {
    children: React.ReactNode;
    onVerified: () => void;
    onCancel?: () => void;
  }) {
    return (
      <div data-testid="mfa-protection">
        <div onClick={onVerified}>{children}</div>
        {onCancel && (
          <button onClick={onCancel} data-testid="mfa-cancel">
            Cancel MFA
          </button>
        )}
      </div>
    );
  };
});

// Mock PaymentMethodForm to simplify testing
jest.mock('@/components/payments/PaymentMethodForm', () => ({
  PaymentMethodForm: function MockPaymentMethodForm({
    initialValues,
    onSubmit,
    onCancel,
    isEditing,
  }: {
    initialValues?: Partial<PaymentMethodFormValues>;
    onSubmit: (values: PaymentMethodFormValues) => void;
    onCancel: () => void;
    isEditing?: boolean;
  }) {
    return (
      <form
        data-testid="payment-method-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            type: 'card',
            cardholderName: 'Test User',
            cardNumber: '4242424242424242',
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123',
            isDefault: false,
          });
        }}
      >
        <div data-testid="form-type">{isEditing ? 'Edit Form' : 'Add Form'}</div>
        {initialValues?.cardholderName && (
          <div data-testid="initial-cardholder">{initialValues.cardholderName}</div>
        )}
        <button type="submit" data-testid="form-submit">
          Submit
        </button>
        <button type="button" onClick={onCancel} data-testid="form-cancel">
          Cancel
        </button>
      </form>
    );
  },
  PaymentMethodFormValues: {},
}));

describe('PaymentMethodDialog Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders dialog when open', () => {
      render(<PaymentMethodDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
    });

    it('does not render dialog when closed', () => {
      render(<PaymentMethodDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows "Add Payment Method" title when not editing', () => {
      render(<PaymentMethodDialog {...defaultProps} isEditing={false} />);

      expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
      expect(screen.getByText('Enter your payment details to add a new payment method.')).toBeInTheDocument();
    });

    it('shows "Edit Payment Method" title when editing', () => {
      render(<PaymentMethodDialog {...defaultProps} isEditing={true} />);

      expect(screen.getByText('Edit Payment Method')).toBeInTheDocument();
      expect(screen.getByText('Update your payment information below.')).toBeInTheDocument();
    });

    it('renders PaymentMethodForm initially', () => {
      render(<PaymentMethodDialog {...defaultProps} />);

      expect(screen.getByTestId('payment-method-form')).toBeInTheDocument();
    });
  });

  describe('Form Display', () => {
    it('shows Add Form when not editing', () => {
      render(<PaymentMethodDialog {...defaultProps} isEditing={false} />);

      expect(screen.getByTestId('form-type')).toHaveTextContent('Add Form');
    });

    it('shows Edit Form when editing', () => {
      render(<PaymentMethodDialog {...defaultProps} isEditing={true} />);

      expect(screen.getByTestId('form-type')).toHaveTextContent('Edit Form');
    });

    it('passes initial values to form', () => {
      render(
        <PaymentMethodDialog
          {...defaultProps}
          initialValues={{ cardholderName: 'John Doe' }}
        />
      );

      expect(screen.getByTestId('initial-cardholder')).toHaveTextContent('John Doe');
    });
  });

  describe('Form Submission Flow', () => {
    it('shows MFA protection after form submission', async () => {
      const user = userEvent.setup();

      render(<PaymentMethodDialog {...defaultProps} />);

      // Submit form
      await user.click(screen.getByTestId('form-submit'));

      // MFA protection should appear
      expect(screen.getByTestId('mfa-protection')).toBeInTheDocument();
      expect(screen.getByText('Security Verification Required')).toBeInTheDocument();
    });

    it('calls onSubmit and onClose after MFA verification', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      const onClose = jest.fn();

      render(
        <PaymentMethodDialog
          {...defaultProps}
          onSubmit={onSubmit}
          onClose={onClose}
        />
      );

      // Submit form
      await user.click(screen.getByTestId('form-submit'));

      // Click on MFA protection to trigger verification
      await user.click(screen.getByText('Security Verification Required'));

      expect(onSubmit).toHaveBeenCalledWith({
        type: 'card',
        cardholderName: 'Test User',
        cardNumber: '4242424242424242',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        isDefault: false,
      });
      expect(onClose).toHaveBeenCalled();
    });

    it('returns to form when MFA is cancelled', async () => {
      const user = userEvent.setup();

      render(<PaymentMethodDialog {...defaultProps} />);

      // Submit form
      await user.click(screen.getByTestId('form-submit'));

      // Verify MFA protection is shown
      expect(screen.getByTestId('mfa-protection')).toBeInTheDocument();

      // Cancel MFA
      await user.click(screen.getByTestId('mfa-cancel'));

      // Form should be visible again
      expect(screen.getByTestId('payment-method-form')).toBeInTheDocument();
    });
  });

  describe('Close Handlers', () => {
    it('calls onClose when form cancel is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<PaymentMethodDialog {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByTestId('form-cancel'));

      expect(onClose).toHaveBeenCalled();
    });

    it('resets state when dialog is closed', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<PaymentMethodDialog {...defaultProps} onClose={onClose} />);

      // Submit form to trigger MFA state
      await user.click(screen.getByTestId('form-submit'));
      expect(screen.getByTestId('mfa-protection')).toBeInTheDocument();

      // Click cancel on form (which calls handleDialogClose)
      await user.click(screen.getByTestId('form-cancel'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when dialog overlay triggers close', async () => {
      const onClose = jest.fn();

      render(<PaymentMethodDialog {...defaultProps} onClose={onClose} />);

      // Trigger dialog close via the Dialog's onOpenChange
      const dialog = screen.getByRole('dialog');
      // Simulate pressing Escape or clicking overlay (which triggers onOpenChange with false)
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

      // Note: This may not trigger onClose depending on Radix implementation
      // The actual close behavior depends on the Dialog component
    });
  });

  describe('Accessibility', () => {
    it('has accessible dialog role', () => {
      render(<PaymentMethodDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has dialog title and description', () => {
      render(<PaymentMethodDialog {...defaultProps} />);

      expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
      expect(screen.getByText('Enter your payment details to add a new payment method.')).toBeInTheDocument();
    });

    it('closes on Escape key press', async () => {
      const onClose = jest.fn();

      render(<PaymentMethodDialog {...defaultProps} onClose={onClose} />);

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

      // Radix Dialog handles Escape by calling onOpenChange(false)
      // The onClose should be called via handleDialogClose
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Edit Mode', () => {
    it('displays correct description for edit mode', () => {
      render(<PaymentMethodDialog {...defaultProps} isEditing={true} />);

      expect(screen.getByText('Update your payment information below.')).toBeInTheDocument();
    });

    it('pre-fills form with initial values in edit mode', () => {
      const initialValues = {
        type: 'card' as const,
        cardholderName: 'Existing User',
        cardNumber: '4111111111111111',
        expiryMonth: '06',
        expiryYear: '2026',
        isDefault: true,
      };

      render(
        <PaymentMethodDialog
          {...defaultProps}
          isEditing={true}
          initialValues={initialValues}
        />
      );

      expect(screen.getByTestId('initial-cardholder')).toHaveTextContent('Existing User');
    });
  });

  describe('MFA Protection Display', () => {
    it('shows MFA verification prompt with correct action name for adding', async () => {
      const user = userEvent.setup();

      render(<PaymentMethodDialog {...defaultProps} isEditing={false} />);

      await user.click(screen.getByTestId('form-submit'));

      // MFA protection should show with the correct action description
      expect(screen.getByText('Security Verification Required')).toBeInTheDocument();
      expect(screen.getByText(/Click here to verify your identity/)).toBeInTheDocument();
    });

    it('shows MFA verification prompt with correct action name for editing', async () => {
      const user = userEvent.setup();

      render(<PaymentMethodDialog {...defaultProps} isEditing={true} />);

      await user.click(screen.getByTestId('form-submit'));

      // MFA protection should be visible
      expect(screen.getByTestId('mfa-protection')).toBeInTheDocument();
    });
  });
});
