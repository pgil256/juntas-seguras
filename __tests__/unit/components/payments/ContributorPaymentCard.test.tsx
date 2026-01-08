/**
 * ContributorPaymentCard Component Tests
 *
 * Tests for the ContributorPaymentCard component which displays payment information
 * and allows contributors to confirm payments through various methods.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the deep-links module
jest.mock('@/lib/payments/deep-links', () => ({
  generatePayoutLink: jest.fn((type: string, options: { recipientHandle: string; amount: number; note: string }) => {
    if (type === 'bank') return null;
    return `https://${type}.com/pay?to=${options.recipientHandle}&amount=${options.amount}`;
  }),
}));

import { ContributorPaymentCard } from '@/components/payments/ContributorPaymentCard';
import type { AdminPaymentMethods, RoundPaymentStatus } from '@/types/pool';

describe('ContributorPaymentCard Component', () => {
  const defaultAdminPaymentMethods: AdminPaymentMethods = {
    venmo: 'admin-venmo',
    cashapp: 'admin-cashapp',
    paypal: 'admin-paypal',
    zelle: 'admin@email.com',
  };

  const defaultProps = {
    amount: 100,
    dueDate: new Date('2025-02-15'),
    roundNumber: 1,
    poolName: 'Test Pool',
    adminName: 'John Admin',
    adminPaymentMethods: defaultAdminPaymentMethods,
    status: 'pending' as RoundPaymentStatus,
    onConfirmPayment: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset date to a fixed point before the due date
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-02-01'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders correctly with required props', () => {
      render(<ContributorPaymentCard {...defaultProps} />);

      expect(screen.getByText('Round 1 Payment')).toBeInTheDocument();
      expect(screen.getByText('$100.00')).toBeInTheDocument();
      expect(screen.getByText('Payment Pending')).toBeInTheDocument();
    });

    it('renders amount in correct currency format', () => {
      render(<ContributorPaymentCard {...defaultProps} amount={1234.56} />);

      expect(screen.getByText('$1,234.56')).toBeInTheDocument();
    });

    it('renders the due date', () => {
      render(<ContributorPaymentCard {...defaultProps} />);

      expect(screen.getByText(/February 15, 2025/)).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <ContributorPaymentCard {...defaultProps} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Status Display', () => {
    it('shows pending status correctly', () => {
      render(<ContributorPaymentCard {...defaultProps} status="pending" />);

      expect(screen.getByText('Payment Pending')).toBeInTheDocument();
    });

    it('shows member_confirmed status correctly', () => {
      render(
        <ContributorPaymentCard
          {...defaultProps}
          status="member_confirmed"
          memberConfirmedAt={new Date('2025-02-05')}
          memberConfirmedVia="venmo"
        />
      );

      expect(screen.getByText('Awaiting Verification')).toBeInTheDocument();
      expect(screen.getByText(/You confirmed this payment via/)).toBeInTheDocument();
      expect(screen.getByText(/venmo/)).toBeInTheDocument();
    });

    it('shows admin_verified status correctly', () => {
      render(
        <ContributorPaymentCard
          {...defaultProps}
          status="admin_verified"
          adminVerifiedAt={new Date('2025-02-06')}
        />
      );

      expect(screen.getByText('Payment Verified')).toBeInTheDocument();
      expect(screen.getByText(/Payment verified by John Admin/)).toBeInTheDocument();
    });

    it('shows late status correctly', () => {
      render(<ContributorPaymentCard {...defaultProps} status="late" />);

      expect(screen.getByText('Payment Late')).toBeInTheDocument();
    });

    it('shows missed status correctly', () => {
      render(<ContributorPaymentCard {...defaultProps} status="missed" />);

      expect(screen.getByText('Payment Missed')).toBeInTheDocument();
    });

    it('shows excused status correctly', () => {
      render(<ContributorPaymentCard {...defaultProps} status="excused" />);

      expect(screen.getByText('Payment Excused')).toBeInTheDocument();
    });
  });

  describe('Overdue Indicator', () => {
    it('shows overdue text when payment is past due', () => {
      // Set current time to after the due date
      jest.setSystemTime(new Date('2025-02-20'));

      render(<ContributorPaymentCard {...defaultProps} status="pending" />);

      expect(screen.getByText('(Overdue)')).toBeInTheDocument();
    });

    it('does not show overdue text when payment is not past due', () => {
      jest.setSystemTime(new Date('2025-02-01'));

      render(<ContributorPaymentCard {...defaultProps} status="pending" />);

      expect(screen.queryByText('(Overdue)')).not.toBeInTheDocument();
    });
  });

  describe('Payment Methods Section', () => {
    it('shows payment buttons when status allows payment', () => {
      render(<ContributorPaymentCard {...defaultProps} status="pending" />);

      // Should show payment method buttons
      expect(screen.getByText('Pay John Admin:')).toBeInTheDocument();
    });

    it('shows Venmo button when admin has venmo configured', () => {
      render(<ContributorPaymentCard {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Venmo/i })).toBeInTheDocument();
    });

    it('shows Cash App button when admin has cashapp configured', () => {
      render(<ContributorPaymentCard {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Cash App/i })).toBeInTheDocument();
    });

    it('shows PayPal button when admin has paypal configured', () => {
      render(<ContributorPaymentCard {...defaultProps} />);

      expect(screen.getByRole('button', { name: /PayPal/i })).toBeInTheDocument();
    });

    it('shows Zelle instructions when admin has zelle configured', () => {
      render(<ContributorPaymentCard {...defaultProps} />);

      expect(screen.getByText(/Pay via Zelle/i)).toBeInTheDocument();
    });

    it('shows warning when admin has no payment methods', () => {
      render(
        <ContributorPaymentCard
          {...defaultProps}
          adminPaymentMethods={{}}
        />
      );

      expect(screen.getByText(/hasn't set up payment methods/)).toBeInTheDocument();
    });

    it('hides payment section when status is admin_verified', () => {
      render(
        <ContributorPaymentCard
          {...defaultProps}
          status="admin_verified"
          adminVerifiedAt={new Date()}
        />
      );

      expect(screen.queryByText('Pay John Admin:')).not.toBeInTheDocument();
    });
  });

  describe('Payment Confirmation', () => {
    it('shows confirm section when payment button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      // Mock window.open to prevent actual navigation
      const mockWindowOpen = jest.fn();
      window.open = mockWindowOpen;

      render(<ContributorPaymentCard {...defaultProps} />);

      // Click on Venmo button to show confirm section
      const venmoButton = screen.getByRole('button', { name: /Venmo/i });
      await user.click(venmoButton);

      // Should show the confirm payment section
      await waitFor(() => {
        expect(screen.getByText('Already sent your payment?')).toBeInTheDocument();
      });
    });

    it('shows confirm section immediately when status is late', () => {
      render(<ContributorPaymentCard {...defaultProps} status="late" />);

      expect(screen.getByText('Already sent your payment?')).toBeInTheDocument();
    });

    it('renders payment method select dropdown', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      window.open = jest.fn();

      render(<ContributorPaymentCard {...defaultProps} />);

      // Click on Venmo button to show confirm section
      await user.click(screen.getByRole('button', { name: /Venmo/i }));

      await waitFor(() => {
        expect(screen.getByText('Payment Method Used:')).toBeInTheDocument();
      });
    });

    it('disables confirm button when no method is selected', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      window.open = jest.fn();

      render(<ContributorPaymentCard {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /Venmo/i }));

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /Confirm Payment Sent/i });
        expect(confirmButton).toBeDisabled();
      });
    });

    it('calls onConfirmPayment when payment is confirmed', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onConfirmPayment = jest.fn().mockResolvedValue(undefined);

      window.open = jest.fn();

      render(
        <ContributorPaymentCard
          {...defaultProps}
          onConfirmPayment={onConfirmPayment}
        />
      );

      // Click Venmo to show confirm section
      await user.click(screen.getByRole('button', { name: /Venmo/i }));

      await waitFor(() => {
        expect(screen.getByText('Payment Method Used:')).toBeInTheDocument();
      });

      // Open the select dropdown and choose a method
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      // Wait for the dropdown to open and select Venmo
      await waitFor(() => {
        const venmoOption = screen.getByRole('option', { name: 'Venmo' });
        expect(venmoOption).toBeInTheDocument();
      });

      await user.click(screen.getByRole('option', { name: 'Venmo' }));

      // Click confirm button
      const confirmButton = screen.getByRole('button', { name: /Confirm Payment Sent/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(onConfirmPayment).toHaveBeenCalledWith('venmo');
      });
    });

    it('shows loading state while confirming', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      // Create a promise that we can control
      let resolvePromise: () => void;
      const confirmPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      const onConfirmPayment = jest.fn().mockReturnValue(confirmPromise);

      window.open = jest.fn();

      render(
        <ContributorPaymentCard
          {...defaultProps}
          status="late"
          onConfirmPayment={onConfirmPayment}
        />
      );

      // Open the select dropdown and choose a method
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Venmo' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('option', { name: 'Venmo' }));

      // Click confirm button
      const confirmButton = screen.getByRole('button', { name: /Confirm Payment Sent/i });
      await user.click(confirmButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Confirming...')).toBeInTheDocument();
      });

      // Resolve the promise
      resolvePromise!();
    });
  });

  describe('Accessibility', () => {
    it('has accessible labels for interactive elements', () => {
      render(<ContributorPaymentCard {...defaultProps} />);

      // Payment buttons should be accessible
      expect(screen.getByRole('button', { name: /Venmo/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cash App/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /PayPal/i })).toBeInTheDocument();
    });

    it('has proper heading hierarchy', () => {
      render(<ContributorPaymentCard {...defaultProps} />);

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  describe('Conditional Rendering', () => {
    it('hides payment methods not configured by admin', () => {
      render(
        <ContributorPaymentCard
          {...defaultProps}
          adminPaymentMethods={{ venmo: 'admin-venmo' }}
        />
      );

      expect(screen.getByRole('button', { name: /Venmo/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Cash App/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /PayPal/i })).not.toBeInTheDocument();
    });

    it('shows only available payment methods in confirmation dropdown', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      window.open = jest.fn();

      render(
        <ContributorPaymentCard
          {...defaultProps}
          adminPaymentMethods={{ venmo: 'admin-venmo', cashapp: 'admin-cash' }}
        />
      );

      await user.click(screen.getByRole('button', { name: /Venmo/i }));

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Venmo' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Cash App' })).toBeInTheDocument();
        // Cash and Other should always be available
        expect(screen.getByRole('option', { name: 'Cash' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Other' })).toBeInTheDocument();
      });
    });
  });
});
