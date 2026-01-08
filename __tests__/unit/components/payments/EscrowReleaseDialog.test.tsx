/**
 * EscrowReleaseDialog Component Tests
 *
 * Tests for the EscrowReleaseDialog component used for releasing escrowed payments.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EscrowReleaseDialog } from '@/components/payments/EscrowReleaseDialog';
import { Transaction, TransactionType, TransactionStatus } from '@/types/payment';

// Mock usePayments hook
const mockReleaseEscrowPayment = jest.fn();
jest.mock('@/lib/hooks/usePayments', () => ({
  usePayments: () => ({
    releaseEscrowPayment: mockReleaseEscrowPayment,
    isReleasing: false,
  }),
}));

// Mock setTimeout to control auto-close behavior
jest.useFakeTimers();

describe('EscrowReleaseDialog Component', () => {
  const mockPayment: Transaction = {
    id: 'payment123',
    type: TransactionType.ESCROW,
    amount: 500,
    date: '2024-01-15',
    status: TransactionStatus.ESCROWED,
    description: 'Pool contribution',
    member: 'John Doe',
    poolId: 'pool456',
    releaseDate: '2024-02-01',
  };

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    payment: mockPayment,
    poolId: 'pool456',
    userId: 'user123',
    onReleaseComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockReleaseEscrowPayment.mockReset();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('Rendering', () => {
    it('renders dialog when open', () => {
      render(<EscrowReleaseDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Release Escrowed Payment')).toBeInTheDocument();
    });

    it('does not render dialog when closed', () => {
      render(<EscrowReleaseDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays dialog description', () => {
      render(<EscrowReleaseDialog {...defaultProps} />);

      expect(screen.getByText('Review and release the payment currently held in escrow.')).toBeInTheDocument();
    });

    it('displays payment in escrow info box', () => {
      render(<EscrowReleaseDialog {...defaultProps} />);

      expect(screen.getByText('Payment in Escrow')).toBeInTheDocument();
      expect(screen.getByText(/This payment is currently held in escrow/)).toBeInTheDocument();
    });
  });

  describe('Payment Details Display', () => {
    it('displays member name', () => {
      render(<EscrowReleaseDialog {...defaultProps} />);

      expect(screen.getByText('Member')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('displays payment amount formatted correctly', () => {
      render(<EscrowReleaseDialog {...defaultProps} />);

      expect(screen.getByText('Amount')).toBeInTheDocument();
      expect(screen.getByText('$500.00')).toBeInTheDocument();
    });

    it('displays payment date', () => {
      render(<EscrowReleaseDialog {...defaultProps} />);

      expect(screen.getByText('Payment Date')).toBeInTheDocument();
      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
    });

    it('displays scheduled release date', () => {
      render(<EscrowReleaseDialog {...defaultProps} />);

      expect(screen.getByText('Scheduled Release')).toBeInTheDocument();
      expect(screen.getByText(/Feb 1, 2024/)).toBeInTheDocument();
    });

    it('displays payment ID', () => {
      render(<EscrowReleaseDialog {...defaultProps} />);

      expect(screen.getByText('Payment ID')).toBeInTheDocument();
      expect(screen.getByText('payment123')).toBeInTheDocument();
    });

    it('handles missing release date gracefully', () => {
      const paymentWithoutReleaseDate = {
        ...mockPayment,
        releaseDate: undefined,
      };

      render(
        <EscrowReleaseDialog
          {...defaultProps}
          payment={paymentWithoutReleaseDate}
        />
      );

      expect(screen.getByText('Scheduled Release')).toBeInTheDocument();
      expect(screen.getByText('Not set')).toBeInTheDocument();
    });
  });

  describe('Early Release Warning', () => {
    it('shows early release warning when release date is in the future', () => {
      // Set date to before release date
      const futureReleaseDate = new Date();
      futureReleaseDate.setMonth(futureReleaseDate.getMonth() + 1);

      const paymentWithFutureRelease = {
        ...mockPayment,
        releaseDate: futureReleaseDate.toISOString(),
      };

      render(
        <EscrowReleaseDialog
          {...defaultProps}
          payment={paymentWithFutureRelease}
        />
      );

      expect(screen.getByText('Early Release')).toBeInTheDocument();
      expect(screen.getByText(/The scheduled release date has not yet arrived/)).toBeInTheDocument();
    });

    it('does not show early release warning when release date has passed', () => {
      const pastReleaseDate = new Date();
      pastReleaseDate.setMonth(pastReleaseDate.getMonth() - 1);

      const paymentWithPastRelease = {
        ...mockPayment,
        releaseDate: pastReleaseDate.toISOString(),
      };

      render(
        <EscrowReleaseDialog
          {...defaultProps}
          payment={paymentWithPastRelease}
        />
      );

      expect(screen.queryByText('Early Release')).not.toBeInTheDocument();
    });

    it('does not show early release warning when no release date is set', () => {
      const paymentWithoutReleaseDate = {
        ...mockPayment,
        releaseDate: undefined,
      };

      render(
        <EscrowReleaseDialog
          {...defaultProps}
          payment={paymentWithoutReleaseDate}
        />
      );

      expect(screen.queryByText('Early Release')).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('shows Cancel button', () => {
      render(<EscrowReleaseDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('shows Release Funds button', () => {
      render(<EscrowReleaseDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /release funds/i })).toBeInTheDocument();
    });
  });

  describe('Release Processing', () => {
    it('shows processing state when release is initiated', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      // Mock a pending release
      mockReleaseEscrowPayment.mockImplementation(() => new Promise(() => {}));

      render(<EscrowReleaseDialog {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /release funds/i }));

      expect(screen.getByText('Releasing Funds')).toBeInTheDocument();
      expect(screen.getByText(/Please wait while we process the release/)).toBeInTheDocument();
    });

    it('shows loading spinner during processing', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      mockReleaseEscrowPayment.mockImplementation(() => new Promise(() => {}));

      const { container } = render(<EscrowReleaseDialog {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /release funds/i }));

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('calls releaseEscrowPayment with correct parameters', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      mockReleaseEscrowPayment.mockResolvedValueOnce({ success: true });

      render(<EscrowReleaseDialog {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /release funds/i }));

      expect(mockReleaseEscrowPayment).toHaveBeenCalledWith('payment123', 'pool456');
    });
  });

  describe('Success State', () => {
    it('shows success state after successful release', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      mockReleaseEscrowPayment.mockResolvedValueOnce({ success: true });

      render(<EscrowReleaseDialog {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /release funds/i }));

      await waitFor(() => {
        expect(screen.getByText('Funds Released!')).toBeInTheDocument();
      });

      expect(screen.getByText(/The payment has been successfully released from escrow/)).toBeInTheDocument();
    });

    it('shows Close button in success state', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      mockReleaseEscrowPayment.mockResolvedValueOnce({ success: true });

      render(<EscrowReleaseDialog {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /release funds/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      });
    });

    it('auto-closes dialog after success', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onClose = jest.fn();
      const onReleaseComplete = jest.fn();

      mockReleaseEscrowPayment.mockResolvedValueOnce({ success: true });

      render(
        <EscrowReleaseDialog
          {...defaultProps}
          onClose={onClose}
          onReleaseComplete={onReleaseComplete}
        />
      );

      await user.click(screen.getByRole('button', { name: /release funds/i }));

      await waitFor(() => {
        expect(screen.getByText('Funds Released!')).toBeInTheDocument();
      });

      // Fast-forward timers to trigger auto-close
      jest.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
        expect(onReleaseComplete).toHaveBeenCalled();
      });
    });
  });

  describe('Error State', () => {
    it('shows error state when release fails', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      mockReleaseEscrowPayment.mockResolvedValueOnce({
        success: false,
        error: 'Insufficient permissions',
      });

      render(<EscrowReleaseDialog {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /release funds/i }));

      await waitFor(() => {
        expect(screen.getByText('Release Failed')).toBeInTheDocument();
        expect(screen.getByText('Insufficient permissions')).toBeInTheDocument();
      });
    });

    it('shows generic error when no error message provided', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      mockReleaseEscrowPayment.mockResolvedValueOnce({ success: false });

      render(<EscrowReleaseDialog {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /release funds/i }));

      await waitFor(() => {
        expect(screen.getByText('Failed to release payment. Please try again.')).toBeInTheDocument();
      });
    });

    it('shows error state when hook throws', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      mockReleaseEscrowPayment.mockRejectedValueOnce(new Error('Network error'));

      render(<EscrowReleaseDialog {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /release funds/i }));

      await waitFor(() => {
        expect(screen.getByText('Release Failed')).toBeInTheDocument();
        expect(screen.getByText('An unexpected error occurred. Please try again later.')).toBeInTheDocument();
      });
    });

    it('shows Try Again button in error state', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      mockReleaseEscrowPayment.mockResolvedValueOnce({
        success: false,
        error: 'Error',
      });

      render(<EscrowReleaseDialog {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /release funds/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('returns to initial state when Try Again is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      mockReleaseEscrowPayment.mockResolvedValueOnce({
        success: false,
        error: 'Error',
      });

      render(<EscrowReleaseDialog {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /release funds/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /try again/i }));

      expect(screen.getByRole('button', { name: /release funds/i })).toBeInTheDocument();
      expect(screen.getByText('$500.00')).toBeInTheDocument();
    });

    it('shows Cancel button in error state', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      mockReleaseEscrowPayment.mockResolvedValueOnce({
        success: false,
        error: 'Error',
      });

      render(<EscrowReleaseDialog {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /release funds/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });
    });
  });

  describe('Close Handlers', () => {
    it('calls onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onClose = jest.fn();

      render(<EscrowReleaseDialog {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when Close button is clicked in success state', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onClose = jest.fn();

      mockReleaseEscrowPayment.mockResolvedValueOnce({ success: true });

      render(<EscrowReleaseDialog {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /release funds/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /close/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('resets state when dialog is closed', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onClose = jest.fn();

      mockReleaseEscrowPayment.mockResolvedValueOnce({
        success: false,
        error: 'Test error',
      });

      render(<EscrowReleaseDialog {...defaultProps} onClose={onClose} />);

      // Trigger error state
      await user.click(screen.getByRole('button', { name: /release funds/i }));

      await waitFor(() => {
        expect(screen.getByText('Release Failed')).toBeInTheDocument();
      });

      // Close dialog
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('closes on Escape key press', async () => {
      const onClose = jest.fn();

      render(<EscrowReleaseDialog {...defaultProps} onClose={onClose} />);

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible dialog role', () => {
      render(<EscrowReleaseDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has dialog title', () => {
      render(<EscrowReleaseDialog {...defaultProps} />);

      expect(screen.getByText('Release Escrowed Payment')).toBeInTheDocument();
    });

    it('has dialog description', () => {
      render(<EscrowReleaseDialog {...defaultProps} />);

      expect(screen.getByText('Review and release the payment currently held in escrow.')).toBeInTheDocument();
    });
  });

  describe('Currency Formatting', () => {
    it('formats large amounts correctly', () => {
      render(
        <EscrowReleaseDialog
          {...defaultProps}
          payment={{
            ...mockPayment,
            amount: 12345.67,
          }}
        />
      );

      expect(screen.getByText('$12,345.67')).toBeInTheDocument();
    });

    it('formats small amounts correctly', () => {
      render(
        <EscrowReleaseDialog
          {...defaultProps}
          payment={{
            ...mockPayment,
            amount: 0.99,
          }}
        />
      );

      expect(screen.getByText('$0.99')).toBeInTheDocument();
    });
  });
});
