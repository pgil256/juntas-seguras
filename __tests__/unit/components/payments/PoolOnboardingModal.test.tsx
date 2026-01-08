/**
 * PoolOnboardingModal Component Tests
 *
 * Tests for the PoolOnboardingModal component used for onboarding new pool members.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PoolOnboardingModal } from '@/components/payments/PoolOnboardingModal';
import { PaymentMethodType } from '@/types/pool';

// Mock fetch for PayoutMethodForm
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock setTimeout to control auto-close behavior
jest.useFakeTimers();

// Mock PayoutMethodForm
jest.mock('@/components/payments/PayoutMethodForm', () => ({
  PayoutMethodForm: function MockPayoutMethodForm({
    onSuccess,
    onSkip,
    allowedMethods,
  }: {
    onSuccess: () => void;
    onSkip: () => void;
    allowedMethods?: PaymentMethodType[];
  }) {
    return (
      <div data-testid="payout-method-form">
        <div data-testid="allowed-methods">
          {allowedMethods ? allowedMethods.join(', ') : 'all'}
        </div>
        <button onClick={onSuccess} data-testid="payout-save">
          Save Payout Method
        </button>
        <button onClick={onSkip} data-testid="payout-skip">
          Skip
        </button>
      </div>
    );
  },
}));

describe('PoolOnboardingModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onComplete: jest.fn(),
    poolId: 'pool123',
    poolName: 'Test Pool',
    contributionAmount: 100,
    frequency: 'monthly',
    allowedPaymentMethods: ['venmo', 'paypal'] as PaymentMethodType[],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('Rendering', () => {
    it('renders dialog when open', () => {
      render(<PoolOnboardingModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render dialog when closed', () => {
      render(<PoolOnboardingModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays payout step title', () => {
      render(<PoolOnboardingModal {...defaultProps} />);

      expect(screen.getByText('How Will You Receive Payouts?')).toBeInTheDocument();
    });

    it('displays payout step description', () => {
      render(<PoolOnboardingModal {...defaultProps} />);

      expect(screen.getByText("Tell us where to send your payout when it's your turn.")).toBeInTheDocument();
    });

    it('displays progress bar', () => {
      render(<PoolOnboardingModal {...defaultProps} />);

      // Progress component should be present
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('shows Wallet icon on payout step', () => {
      const { container } = render(<PoolOnboardingModal {...defaultProps} />);

      // Wallet icon should be present in the header
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('PayoutMethodForm Integration', () => {
    it('renders PayoutMethodForm on initial step', () => {
      render(<PoolOnboardingModal {...defaultProps} />);

      expect(screen.getByTestId('payout-method-form')).toBeInTheDocument();
    });

    it('passes allowed methods to PayoutMethodForm', () => {
      render(<PoolOnboardingModal {...defaultProps} />);

      expect(screen.getByTestId('allowed-methods')).toHaveTextContent('venmo, paypal');
    });

    it('passes all methods when allowedPaymentMethods is undefined', () => {
      render(
        <PoolOnboardingModal
          {...defaultProps}
          allowedPaymentMethods={undefined}
        />
      );

      expect(screen.getByTestId('allowed-methods')).toHaveTextContent('all');
    });
  });

  describe('Step Transitions', () => {
    it('transitions to complete step after saving payout method', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(<PoolOnboardingModal {...defaultProps} />);

      await user.click(screen.getByTestId('payout-save'));

      expect(screen.getByText('All Set!')).toBeInTheDocument();
      expect(screen.getByText("You're ready to participate in the pool.")).toBeInTheDocument();
    });

    it('transitions to complete step after skipping payout method', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(<PoolOnboardingModal {...defaultProps} />);

      await user.click(screen.getByTestId('payout-skip'));

      expect(screen.getByText('All Set!')).toBeInTheDocument();
    });

    it('shows pool name in completion message', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(<PoolOnboardingModal {...defaultProps} />);

      await user.click(screen.getByTestId('payout-save'));

      expect(screen.getByText('Welcome to Test Pool!')).toBeInTheDocument();
    });

    it('shows contribution info on completion', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(<PoolOnboardingModal {...defaultProps} />);

      await user.click(screen.getByTestId('payout-save'));

      expect(screen.getByText('$100')).toBeInTheDocument();
      expect(screen.getByText(/monthly/)).toBeInTheDocument();
    });
  });

  describe('Progress Indicator', () => {
    it('shows 50% progress on payout step', () => {
      render(<PoolOnboardingModal {...defaultProps} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('shows 100% progress on complete step', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(<PoolOnboardingModal {...defaultProps} />);

      await user.click(screen.getByTestId('payout-save'));

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });
  });

  describe('Completion Callbacks', () => {
    it('calls onComplete after saving payout method with delay', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onComplete = jest.fn();

      render(<PoolOnboardingModal {...defaultProps} onComplete={onComplete} />);

      await user.click(screen.getByTestId('payout-save'));

      expect(onComplete).not.toHaveBeenCalled();

      // Fast-forward timer
      jest.advanceTimersByTime(2000);

      expect(onComplete).toHaveBeenCalled();
    });

    it('calls onComplete after skipping with shorter delay', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onComplete = jest.fn();

      render(<PoolOnboardingModal {...defaultProps} onComplete={onComplete} />);

      await user.click(screen.getByTestId('payout-skip'));

      expect(onComplete).not.toHaveBeenCalled();

      // Fast-forward timer (1500ms for skip)
      jest.advanceTimersByTime(1500);

      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('Close Handlers', () => {
    it('calls onClose when dialog is closed', async () => {
      const onClose = jest.fn();

      render(<PoolOnboardingModal {...defaultProps} onClose={onClose} />);

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('resets step to payout when dialog is closed', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onClose = jest.fn();

      const { rerender } = render(
        <PoolOnboardingModal {...defaultProps} onClose={onClose} />
      );

      // Go to complete step
      await user.click(screen.getByTestId('payout-save'));
      expect(screen.getByText('All Set!')).toBeInTheDocument();

      // Close dialog
      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

      // Reopen dialog
      rerender(<PoolOnboardingModal {...defaultProps} isOpen={false} onClose={onClose} />);
      rerender(<PoolOnboardingModal {...defaultProps} onClose={onClose} />);

      // Should be back to payout step
      expect(screen.getByText('How Will You Receive Payouts?')).toBeInTheDocument();
    });

    it('closes on Escape key press', async () => {
      const onClose = jest.fn();

      render(<PoolOnboardingModal {...defaultProps} onClose={onClose} />);

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Complete Step Display', () => {
    it('shows CheckCircle icon on complete step', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const { container } = render(<PoolOnboardingModal {...defaultProps} />);

      await user.click(screen.getByTestId('payout-save'));

      // Should have green checkmark icon
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('displays setup complete message', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(<PoolOnboardingModal {...defaultProps} />);

      await user.click(screen.getByTestId('payout-save'));

      expect(screen.getByText("Your setup is complete. You're ready to participate in the pool.")).toBeInTheDocument();
    });

    it('displays contribution amount and frequency', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <PoolOnboardingModal
          {...defaultProps}
          contributionAmount={250}
          frequency="weekly"
        />
      );

      await user.click(screen.getByTestId('payout-save'));

      expect(screen.getByText('$250')).toBeInTheDocument();
      expect(screen.getByText(/weekly/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible dialog role', () => {
      render(<PoolOnboardingModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has dialog title', () => {
      render(<PoolOnboardingModal {...defaultProps} />);

      expect(screen.getByText('How Will You Receive Payouts?')).toBeInTheDocument();
    });

    it('has dialog description', () => {
      render(<PoolOnboardingModal {...defaultProps} />);

      expect(screen.getByText("Tell us where to send your payout when it's your turn.")).toBeInTheDocument();
    });

    it('has accessible progress bar', () => {
      render(<PoolOnboardingModal {...defaultProps} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow');
    });
  });

  describe('Different Pool Configurations', () => {
    it('handles different payment method combinations', () => {
      render(
        <PoolOnboardingModal
          {...defaultProps}
          allowedPaymentMethods={['zelle', 'cashapp'] as PaymentMethodType[]}
        />
      );

      expect(screen.getByTestId('allowed-methods')).toHaveTextContent('zelle, cashapp');
    });

    it('handles single payment method', () => {
      render(
        <PoolOnboardingModal
          {...defaultProps}
          allowedPaymentMethods={['venmo'] as PaymentMethodType[]}
        />
      );

      expect(screen.getByTestId('allowed-methods')).toHaveTextContent('venmo');
    });

    it('handles different contribution amounts', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <PoolOnboardingModal
          {...defaultProps}
          contributionAmount={500.50}
        />
      );

      await user.click(screen.getByTestId('payout-save'));

      expect(screen.getByText('$500.5')).toBeInTheDocument();
    });

    it('handles different frequencies', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <PoolOnboardingModal
          {...defaultProps}
          frequency="bi-weekly"
        />
      );

      await user.click(screen.getByTestId('payout-save'));

      expect(screen.getByText(/bi-weekly/)).toBeInTheDocument();
    });
  });

  describe('Step Title and Description', () => {
    it('updates title for payout step', () => {
      render(<PoolOnboardingModal {...defaultProps} />);

      expect(screen.getByText('How Will You Receive Payouts?')).toBeInTheDocument();
    });

    it('updates title for complete step', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(<PoolOnboardingModal {...defaultProps} />);

      await user.click(screen.getByTestId('payout-save'));

      expect(screen.getByText('All Set!')).toBeInTheDocument();
    });

    it('updates description for payout step', () => {
      render(<PoolOnboardingModal {...defaultProps} />);

      expect(screen.getByText("Tell us where to send your payout when it's your turn.")).toBeInTheDocument();
    });

    it('updates description for complete step', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(<PoolOnboardingModal {...defaultProps} />);

      await user.click(screen.getByTestId('payout-save'));

      expect(screen.getByText("You're ready to participate in the pool.")).toBeInTheDocument();
    });
  });
});
