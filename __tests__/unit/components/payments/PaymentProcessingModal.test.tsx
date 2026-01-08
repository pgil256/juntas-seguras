/**
 * PaymentProcessingModal Component Tests
 *
 * Tests for the PaymentProcessingModal component used for processing payments via Stripe.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentProcessingModal } from '@/components/payments/PaymentProcessingModal';
import { PaymentDetails } from '@/types/payment';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocationHref = jest.fn();
Object.defineProperty(window, 'location', {
  value: {
    href: '',
    set href(value: string) {
      mockLocationHref(value);
    },
    get href() {
      return '';
    },
  },
  writable: true,
});

describe('PaymentProcessingModal Component', () => {
  const mockPaymentDetails: PaymentDetails = {
    poolName: 'Test Pool',
    amount: 100,
    dueDate: '2024-02-15',
    paymentMethods: [
      {
        id: 1,
        type: 'card',
        name: 'Visa',
        last4: '4242',
        isDefault: true,
      },
    ],
  };

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onAddPaymentMethod: jest.fn(),
    paymentDetails: mockPaymentDetails,
    userId: 'user123',
    poolId: 'pool456',
    onPaymentComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Rendering', () => {
    it('renders dialog when open', () => {
      render(<PaymentProcessingModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Make Payment')).toBeInTheDocument();
    });

    it('does not render dialog when closed', () => {
      render(<PaymentProcessingModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays pool name in description', () => {
      render(<PaymentProcessingModal {...defaultProps} />);

      expect(screen.getByText(/Pay your contribution to Test Pool/)).toBeInTheDocument();
    });

    it('displays payment amount formatted correctly', () => {
      render(<PaymentProcessingModal {...defaultProps} />);

      expect(screen.getByText('$100.00')).toBeInTheDocument();
    });

    it('displays due date formatted correctly', () => {
      render(<PaymentProcessingModal {...defaultProps} />);

      // The date format depends on locale, but should contain the date
      expect(screen.getByText(/Feb 15, 2024/)).toBeInTheDocument();
    });

    it('shows Pay with Stripe button', () => {
      render(<PaymentProcessingModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /pay with stripe/i })).toBeInTheDocument();
    });

    it('shows Cancel button', () => {
      render(<PaymentProcessingModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Initial State', () => {
    it('shows payment details card', () => {
      render(<PaymentProcessingModal {...defaultProps} />);

      expect(screen.getByText('Amount')).toBeInTheDocument();
      expect(screen.getByText('Due Date')).toBeInTheDocument();
    });

    it('shows instructions text', () => {
      render(<PaymentProcessingModal {...defaultProps} />);

      expect(screen.getByText(/Click the button below to pay securely with Stripe/)).toBeInTheDocument();
    });
  });

  describe('Payment Processing', () => {
    it('shows processing state when payment is initiated', async () => {
      const user = userEvent.setup();

      // Mock a slow response
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<PaymentProcessingModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /pay with stripe/i }));

      expect(screen.getByText('Preparing Checkout')).toBeInTheDocument();
      expect(screen.getByText(/Please wait while we set up your payment/)).toBeInTheDocument();
    });

    it('shows loading spinner during processing', async () => {
      const user = userEvent.setup();

      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { container } = render(<PaymentProcessingModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /pay with stripe/i }));

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('redirects to Stripe checkout on successful response', async () => {
      const user = userEvent.setup();
      const approvalUrl = 'https://checkout.stripe.com/session123';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ approvalUrl }),
      });

      render(<PaymentProcessingModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /pay with stripe/i }));

      await waitFor(() => {
        expect(mockLocationHref).toHaveBeenCalledWith(approvalUrl);
      });
    });

    it('calls API with correct parameters', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ approvalUrl: 'https://checkout.stripe.com/test' }),
      });

      render(<PaymentProcessingModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /pay with stripe/i }));

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/pools/pool456/contributions',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'initiate' }),
        })
      );
    });
  });

  describe('Error State', () => {
    it('shows error state when API returns error', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Payment failed' }),
      });

      render(<PaymentProcessingModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /pay with stripe/i }));

      await waitFor(() => {
        expect(screen.getByText('Payment Failed')).toBeInTheDocument();
        expect(screen.getByText('Payment failed')).toBeInTheDocument();
      });
    });

    it('shows error state when no checkout URL received', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}), // No approvalUrl
      });

      render(<PaymentProcessingModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /pay with stripe/i }));

      await waitFor(() => {
        expect(screen.getByText('Payment Failed')).toBeInTheDocument();
        expect(screen.getByText('No checkout URL received')).toBeInTheDocument();
      });
    });

    it('shows error state when fetch throws', async () => {
      const user = userEvent.setup();

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<PaymentProcessingModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /pay with stripe/i }));

      await waitFor(() => {
        expect(screen.getByText('Payment Failed')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('shows Try Again button in error state', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Error occurred' }),
      });

      render(<PaymentProcessingModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /pay with stripe/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('returns to initial state when Try Again is clicked', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Error' }),
      });

      render(<PaymentProcessingModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /pay with stripe/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /try again/i }));

      expect(screen.getByRole('button', { name: /pay with stripe/i })).toBeInTheDocument();
      expect(screen.getByText('$100.00')).toBeInTheDocument();
    });

    it('shows Cancel button in error state', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Error' }),
      });

      render(<PaymentProcessingModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /pay with stripe/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });
    });
  });

  describe('Close Handlers', () => {
    it('calls onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<PaymentProcessingModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when Cancel is clicked in error state', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Error' }),
      });

      render(<PaymentProcessingModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /pay with stripe/i }));

      await waitFor(() => {
        expect(screen.getByText('Payment Failed')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('resets state when dialog is closed', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Test error' }),
      });

      render(<PaymentProcessingModal {...defaultProps} onClose={onClose} />);

      // Trigger error state
      await user.click(screen.getByRole('button', { name: /pay with stripe/i }));

      await waitFor(() => {
        expect(screen.getByText('Payment Failed')).toBeInTheDocument();
      });

      // Close dialog
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('closes on Escape key press', async () => {
      const onClose = jest.fn();

      render(<PaymentProcessingModal {...defaultProps} onClose={onClose} />);

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible dialog role', () => {
      render(<PaymentProcessingModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has dialog title', () => {
      render(<PaymentProcessingModal {...defaultProps} />);

      expect(screen.getByText('Make Payment')).toBeInTheDocument();
    });

    it('has dialog description', () => {
      render(<PaymentProcessingModal {...defaultProps} />);

      expect(screen.getByText(/Pay your contribution to Test Pool/)).toBeInTheDocument();
    });
  });

  describe('Currency Formatting', () => {
    it('formats large amounts correctly', () => {
      render(
        <PaymentProcessingModal
          {...defaultProps}
          paymentDetails={{
            ...mockPaymentDetails,
            amount: 1234.56,
          }}
        />
      );

      expect(screen.getByText('$1,234.56')).toBeInTheDocument();
    });

    it('formats zero amounts correctly', () => {
      render(
        <PaymentProcessingModal
          {...defaultProps}
          paymentDetails={{
            ...mockPaymentDetails,
            amount: 0,
          }}
        />
      );

      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('formats different date formats correctly', () => {
      render(
        <PaymentProcessingModal
          {...defaultProps}
          paymentDetails={{
            ...mockPaymentDetails,
            dueDate: '2024-12-31',
          }}
        />
      );

      expect(screen.getByText(/Dec 31, 2024/)).toBeInTheDocument();
    });
  });
});
