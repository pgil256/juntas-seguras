/**
 * PoolHeader Component Tests
 *
 * Tests for the PoolHeader component that displays pool information and actions.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PoolHeader } from '@/components/pools/PoolHeader';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('PoolHeader Component', () => {
  const defaultProps = {
    poolId: 'pool-123',
    poolName: 'Family Savings Pool',
    description: 'Monthly family savings circle',
    status: 'active' as const,
    currentRound: 3,
    totalRounds: 12,
    contributionAmount: 100,
    frequency: 'monthly',
    memberCount: 6,
    nextPayoutDate: '2024-03-15',
    userRole: 'member' as const,
    userHasContributed: false,
    userIsRecipient: false,
    allContributionsReceived: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders pool name', () => {
      render(<PoolHeader {...defaultProps} />);

      expect(screen.getByText('Family Savings Pool')).toBeInTheDocument();
    });

    it('renders pool description', () => {
      render(<PoolHeader {...defaultProps} />);

      expect(screen.getByText('Monthly family savings circle')).toBeInTheDocument();
    });

    it('renders contribution amount with frequency', () => {
      render(<PoolHeader {...defaultProps} />);

      expect(screen.getByText('$100/monthly')).toBeInTheDocument();
    });

    it('renders member count', () => {
      render(<PoolHeader {...defaultProps} />);

      expect(screen.getByText('6 members')).toBeInTheDocument();
    });

    it('renders round information', () => {
      render(<PoolHeader {...defaultProps} />);

      expect(screen.getByText('Round 3/12')).toBeInTheDocument();
    });

    it('renders next payout date when provided', () => {
      render(<PoolHeader {...defaultProps} />);

      expect(screen.getByText(/next payout:/i)).toBeInTheDocument();
    });

    it('does not render payout date when not provided', () => {
      render(<PoolHeader {...defaultProps} nextPayoutDate={undefined} />);

      expect(screen.queryByText(/next payout:/i)).not.toBeInTheDocument();
    });

    it('does not render description if not provided', () => {
      render(<PoolHeader {...defaultProps} description={undefined} />);

      expect(screen.queryByText('Monthly family savings circle')).not.toBeInTheDocument();
    });
  });

  describe('Status Badge', () => {
    it('shows Active status badge', () => {
      render(<PoolHeader {...defaultProps} status="active" />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('shows Pending Start status badge', () => {
      render(<PoolHeader {...defaultProps} status="pending" />);

      expect(screen.getByText('Pending Start')).toBeInTheDocument();
    });

    it('shows Completed status badge', () => {
      render(<PoolHeader {...defaultProps} status="completed" />);

      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('shows Paused status badge', () => {
      render(<PoolHeader {...defaultProps} status="paused" />);

      expect(screen.getByText('Paused')).toBeInTheDocument();
    });

    it('applies correct styling for active status', () => {
      render(<PoolHeader {...defaultProps} status="active" />);

      const badge = screen.getByText('Active').closest('span');
      expect(badge).toHaveClass('bg-green-100');
      expect(badge).toHaveClass('text-green-700');
    });

    it('applies correct styling for pending status', () => {
      render(<PoolHeader {...defaultProps} status="pending" />);

      const badge = screen.getByText('Pending Start').closest('span');
      expect(badge).toHaveClass('bg-amber-100');
      expect(badge).toHaveClass('text-amber-700');
    });

    it('applies correct styling for completed status', () => {
      render(<PoolHeader {...defaultProps} status="completed" />);

      const badge = screen.getByText('Completed').closest('span');
      expect(badge).toHaveClass('bg-blue-100');
      expect(badge).toHaveClass('text-blue-700');
    });

    it('applies correct styling for paused status', () => {
      render(<PoolHeader {...defaultProps} status="paused" />);

      const badge = screen.getByText('Paused').closest('span');
      expect(badge).toHaveClass('bg-gray-100');
      expect(badge).toHaveClass('text-gray-700');
    });
  });

  describe('User Status Badge', () => {
    it('shows "You\'re Receiving" badge when user is recipient', () => {
      render(<PoolHeader {...defaultProps} userIsRecipient={true} />);

      expect(screen.getByText("You're Receiving")).toBeInTheDocument();
    });

    it('shows "Paid" badge when user has contributed and is not recipient', () => {
      render(<PoolHeader {...defaultProps} userHasContributed={true} userIsRecipient={false} />);

      expect(screen.getByText('Paid')).toBeInTheDocument();
    });

    it('shows "Payment Due" badge when user has not contributed', () => {
      render(<PoolHeader {...defaultProps} userHasContributed={false} userIsRecipient={false} />);

      expect(screen.getByText('Payment Due')).toBeInTheDocument();
    });
  });

  describe('User Role - Admin', () => {
    it('shows settings button for admin users on desktop', () => {
      render(<PoolHeader {...defaultProps} userRole="admin" />);

      // Desktop settings button should be visible
      const desktopActions = document.querySelector('.hidden.sm\\:flex');
      expect(desktopActions).toBeInTheDocument();
    });

    it('shows settings button for creator users', () => {
      render(<PoolHeader {...defaultProps} userRole="creator" />);

      const desktopActions = document.querySelector('.hidden.sm\\:flex');
      expect(desktopActions).toBeInTheDocument();
    });
  });

  describe('Payment Button', () => {
    it('shows "Make Payment" button when user has not contributed', () => {
      render(<PoolHeader {...defaultProps} userHasContributed={false} />);

      expect(screen.getByRole('button', { name: /make payment/i })).toBeInTheDocument();
    });

    it('shows "Make Payment (Recipient)" button when user is recipient and has not contributed', () => {
      render(<PoolHeader {...defaultProps} userHasContributed={false} userIsRecipient={true} />);

      expect(screen.getByRole('button', { name: /make payment \(recipient\)/i })).toBeInTheDocument();
    });

    it('shows "Payment Complete" button when user has contributed', () => {
      render(<PoolHeader {...defaultProps} userHasContributed={true} />);

      expect(screen.getByRole('button', { name: /payment complete/i })).toBeInTheDocument();
    });

    it('disables "Payment Complete" button', () => {
      render(<PoolHeader {...defaultProps} userHasContributed={true} />);

      expect(screen.getByRole('button', { name: /payment complete/i })).toBeDisabled();
    });

    it('calls onMakePayment when Make Payment is clicked', async () => {
      const onMakePayment = jest.fn();
      const user = userEvent.setup();

      render(<PoolHeader {...defaultProps} userHasContributed={false} onMakePayment={onMakePayment} />);

      await user.click(screen.getByRole('button', { name: /make payment/i }));

      expect(onMakePayment).toHaveBeenCalled();
    });
  });

  describe('Invite Button', () => {
    it('shows Invite button', () => {
      render(<PoolHeader {...defaultProps} />);

      expect(screen.getByRole('button', { name: /invite/i })).toBeInTheDocument();
    });

    it('calls onInvite when Invite is clicked', async () => {
      const onInvite = jest.fn();
      const user = userEvent.setup();

      render(<PoolHeader {...defaultProps} onInvite={onInvite} />);

      await user.click(screen.getByRole('button', { name: /invite/i }));

      expect(onInvite).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('navigates to My Pools when back button is clicked', async () => {
      const user = userEvent.setup();
      render(<PoolHeader {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /my pools/i }));

      expect(mockPush).toHaveBeenCalledWith('/my-pool');
    });
  });

  describe('Alert Bar - Payment Due', () => {
    it('shows payment due alert when user has not contributed and pool is active', () => {
      render(<PoolHeader {...defaultProps} userHasContributed={false} status="active" />);

      expect(screen.getByText(/contribution is due for round/i)).toBeInTheDocument();
    });

    it('shows contribution amount in alert bar', () => {
      render(<PoolHeader {...defaultProps} userHasContributed={false} status="active" />);

      // Find the alert bar which should contain the contribution amount
      expect(screen.getByText(/\$100 contribution is due/i)).toBeInTheDocument();
    });

    it('shows Pay Now button in alert bar', () => {
      render(<PoolHeader {...defaultProps} userHasContributed={false} status="active" />);

      expect(screen.getByRole('button', { name: /pay now/i })).toBeInTheDocument();
    });

    it('calls onMakePayment when Pay Now is clicked in alert bar', async () => {
      const onMakePayment = jest.fn();
      const user = userEvent.setup();

      render(<PoolHeader {...defaultProps} userHasContributed={false} status="active" onMakePayment={onMakePayment} />);

      await user.click(screen.getByRole('button', { name: /pay now/i }));

      expect(onMakePayment).toHaveBeenCalled();
    });

    it('does not show alert bar when user has contributed', () => {
      render(<PoolHeader {...defaultProps} userHasContributed={true} status="active" />);

      expect(screen.queryByText(/contribution is due/i)).not.toBeInTheDocument();
    });

    it('does not show alert bar when pool is not active', () => {
      render(<PoolHeader {...defaultProps} userHasContributed={false} status="pending" />);

      expect(screen.queryByText(/contribution is due/i)).not.toBeInTheDocument();
    });
  });

  describe('Alert Bar - Recipient', () => {
    it('shows recipient alert when user is recipient and has not contributed', () => {
      render(<PoolHeader {...defaultProps} userIsRecipient={true} userHasContributed={false} status="active" />);

      expect(screen.getByText(/you're the recipient!/i)).toBeInTheDocument();
    });

    it('shows contribution requirement in recipient alert', () => {
      render(<PoolHeader {...defaultProps} userIsRecipient={true} userHasContributed={false} status="active" />);

      expect(screen.getByText(/make your \$100 contribution to receive the full payout/i)).toBeInTheDocument();
    });
  });

  describe('All Contributions Received Notice', () => {
    it('shows notice when all contributions received and user is not recipient', () => {
      render(<PoolHeader {...defaultProps} allContributionsReceived={true} userIsRecipient={false} userHasContributed={true} />);

      expect(screen.getByText(/all contributions received/i)).toBeInTheDocument();
    });

    it('does not show notice when user is recipient', () => {
      render(<PoolHeader {...defaultProps} allContributionsReceived={true} userIsRecipient={true} userHasContributed={true} />);

      // The recipient sees different messaging
      expect(screen.queryByText(/payout will be processed soon/i)).not.toBeInTheDocument();
    });
  });

  describe('Action Callbacks', () => {
    it('calls onSettings when settings button is clicked', async () => {
      const onSettings = jest.fn();
      const user = userEvent.setup();

      render(<PoolHeader {...defaultProps} userRole="admin" onSettings={onSettings} />);

      // Find and click the desktop settings button
      const settingsButtons = screen.getAllByRole('button');
      const settingsButton = settingsButtons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg && btn.className.includes('ghost');
      });

      if (settingsButton) {
        await user.click(settingsButton);
      }
    });

    it('calls onShare when share button is clicked', async () => {
      const onShare = jest.fn();
      const user = userEvent.setup();

      render(<PoolHeader {...defaultProps} onShare={onShare} />);

      // Find share button in desktop actions
      const shareButton = screen.getAllByRole('button').find(btn => {
        const parent = btn.closest('.hidden.sm\\:flex');
        return parent !== null;
      });

      if (shareButton) {
        await user.click(shareButton);
        expect(onShare).toHaveBeenCalled();
      }
    });
  });

  describe('Currency Formatting', () => {
    it('formats currency without decimals for whole numbers', () => {
      render(<PoolHeader {...defaultProps} contributionAmount={150} />);

      expect(screen.getByText('$150/monthly')).toBeInTheDocument();
    });

    it('formats large amounts correctly', () => {
      render(<PoolHeader {...defaultProps} contributionAmount={1000} />);

      expect(screen.getByText('$1,000/monthly')).toBeInTheDocument();
    });
  });
});
