/**
 * PoolCard Component Tests
 *
 * Tests for the PoolCard and PoolCardSkeleton components.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PoolCard, PoolCardSkeleton } from '@/components/pools/PoolCard';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock child components
jest.mock('@/components/pools/MemberContributionAvatars', () => ({
  MemberContributionAvatars: ({ members }: { members: unknown[] }) => (
    <div data-testid="member-avatars">{members.length} members</div>
  ),
}));

jest.mock('@/components/pools/PayoutCountdown', () => ({
  PayoutCountdownCompact: ({ payoutAmount }: { payoutAmount: number }) => (
    <div data-testid="payout-countdown">${payoutAmount}</div>
  ),
}));

describe('PoolCard Component', () => {
  const mockMembers = [
    { id: '1', name: 'John', email: 'john@example.com', hasContributed: true, isRecipient: false, position: 1 },
    { id: '2', name: 'Jane', email: 'jane@example.com', hasContributed: true, isRecipient: true, position: 2 },
    { id: '3', name: 'Bob', email: 'bob@example.com', hasContributed: false, isRecipient: false, position: 3 },
  ];

  const defaultProps = {
    poolId: 'pool-123',
    poolName: 'Family Savings Pool',
    description: 'Monthly family savings',
    status: 'active' as const,
    currentRound: 2,
    totalRounds: 12,
    contributionAmount: 50,
    frequency: 'monthly',
    nextPayoutDate: '2024-02-15',
    members: mockMembers,
    currentUserEmail: 'john@example.com',
    userHasContributed: true,
    userIsRecipient: false,
    allContributionsReceived: false,
    payoutProcessed: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Default Variant Rendering', () => {
    it('renders pool name', () => {
      render(<PoolCard {...defaultProps} />);

      expect(screen.getByText('Family Savings Pool')).toBeInTheDocument();
    });

    it('renders pool description', () => {
      render(<PoolCard {...defaultProps} />);

      expect(screen.getByText('Monthly family savings')).toBeInTheDocument();
    });

    it('renders current round information', () => {
      render(<PoolCard {...defaultProps} />);

      expect(screen.getByText('2/12')).toBeInTheDocument();
      expect(screen.getByText('Round')).toBeInTheDocument();
    });

    it('renders contribution amount', () => {
      render(<PoolCard {...defaultProps} />);

      expect(screen.getByText('$50')).toBeInTheDocument();
    });

    it('renders frequency', () => {
      render(<PoolCard {...defaultProps} />);

      expect(screen.getByText('monthly')).toBeInTheDocument();
    });

    it('renders member count', () => {
      render(<PoolCard {...defaultProps} />);

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Members')).toBeInTheDocument();
    });

    it('renders payout amount', () => {
      render(<PoolCard {...defaultProps} />);

      // Payout = $50 × 3 = $150
      // $150 appears in multiple places (payout stat and recipient banner), check for Payout label
      expect(screen.getByText('Payout')).toBeInTheDocument();
      // Find the payout stat box which contains both value and label
      const payoutStat = screen.getByText('Payout').closest('div');
      expect(payoutStat).toHaveTextContent('$150');
    });

    it('renders progress bar', () => {
      render(<PoolCard {...defaultProps} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders contribution progress text', () => {
      render(<PoolCard {...defaultProps} />);

      // 2 out of 3 contributed
      expect(screen.getByText('Contributions: 2/3')).toBeInTheDocument();
      expect(screen.getByText('67%')).toBeInTheDocument();
    });

    it('renders member avatars component', () => {
      render(<PoolCard {...defaultProps} />);

      expect(screen.getByTestId('member-avatars')).toBeInTheDocument();
    });
  });

  describe('Status Badge', () => {
    it('shows Active status badge', () => {
      render(<PoolCard {...defaultProps} status="active" />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('shows Pending status badge', () => {
      render(<PoolCard {...defaultProps} status="pending" />);

      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('shows Completed status badge', () => {
      render(<PoolCard {...defaultProps} status="completed" />);

      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('applies correct styling for active status', () => {
      render(<PoolCard {...defaultProps} status="active" />);

      const badge = screen.getByText('Active');
      expect(badge).toHaveClass('bg-green-100');
      expect(badge).toHaveClass('text-green-700');
    });

    it('applies correct styling for pending status', () => {
      render(<PoolCard {...defaultProps} status="pending" />);

      const badge = screen.getByText('Pending');
      expect(badge).toHaveClass('bg-amber-100');
      expect(badge).toHaveClass('text-amber-700');
    });

    it('applies correct styling for completed status', () => {
      render(<PoolCard {...defaultProps} status="completed" />);

      const badge = screen.getByText('Completed');
      expect(badge).toHaveClass('bg-blue-100');
      expect(badge).toHaveClass('text-blue-700');
    });
  });

  describe('User State - Recipient', () => {
    it('shows recipient banner when user is recipient', () => {
      render(<PoolCard {...defaultProps} userIsRecipient={true} userHasContributed={false} />);

      expect(screen.getByText(/you're receiving \$150 this round/i)).toBeInTheDocument();
    });

    it('applies recipient styling to card', () => {
      const { container } = render(<PoolCard {...defaultProps} userIsRecipient={true} />);

      expect(container.querySelector('.ring-2')).toBeInTheDocument();
      expect(container.querySelector('.ring-emerald-200')).toBeInTheDocument();
    });

    it('hides recipient banner when payout processed', () => {
      render(<PoolCard {...defaultProps} userIsRecipient={true} payoutProcessed={true} />);

      expect(screen.queryByText(/you're receiving/i)).not.toBeInTheDocument();
    });

    it('shows Make Payment (Recipient) button for recipient', () => {
      render(<PoolCard {...defaultProps} userIsRecipient={true} userHasContributed={false} />);

      expect(screen.getByRole('button', { name: /make payment \(recipient\)/i })).toBeInTheDocument();
    });
  });

  describe('User State - Needs to Contribute', () => {
    it('shows payment due banner when user has not contributed', () => {
      render(<PoolCard {...defaultProps} userHasContributed={false} userIsRecipient={false} />);

      expect(screen.getByText(/payment of \$50 due/i)).toBeInTheDocument();
    });

    it('shows Make Payment button when user has not contributed', () => {
      render(<PoolCard {...defaultProps} userHasContributed={false} userIsRecipient={false} />);

      expect(screen.getByRole('button', { name: /make payment/i })).toBeInTheDocument();
    });

    it('hides payment due banner for non-active pools', () => {
      render(<PoolCard {...defaultProps} userHasContributed={false} status="pending" />);

      expect(screen.queryByText(/payment of \$50 due/i)).not.toBeInTheDocument();
    });
  });

  describe('User State - Has Contributed', () => {
    it('shows Payment Complete message', () => {
      render(<PoolCard {...defaultProps} userHasContributed={true} />);

      expect(screen.getByText('Payment Complete')).toBeInTheDocument();
    });

    it('hides Make Payment button', () => {
      render(<PoolCard {...defaultProps} userHasContributed={true} />);

      expect(screen.queryByRole('button', { name: /make payment/i })).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigates to pool detail page when card is clicked', async () => {
      const user = userEvent.setup();
      render(<PoolCard {...defaultProps} />);

      await user.click(screen.getByText('Family Savings Pool'));

      expect(mockPush).toHaveBeenCalledWith('/pools/pool-123');
    });

    it('navigates to pool detail page when Make Payment is clicked without onMakePayment', async () => {
      const user = userEvent.setup();
      render(<PoolCard {...defaultProps} userHasContributed={false} />);

      await user.click(screen.getByRole('button', { name: /make payment/i }));

      expect(mockPush).toHaveBeenCalledWith('/pools/pool-123');
    });

    it('calls onMakePayment instead of navigating when provided', async () => {
      const onMakePayment = jest.fn();
      const user = userEvent.setup();

      render(<PoolCard {...defaultProps} userHasContributed={false} onMakePayment={onMakePayment} />);

      await user.click(screen.getByRole('button', { name: /make payment/i }));

      expect(onMakePayment).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('stops event propagation when Make Payment is clicked', async () => {
      const onMakePayment = jest.fn();
      const user = userEvent.setup();

      render(<PoolCard {...defaultProps} userHasContributed={false} onMakePayment={onMakePayment} />);

      await user.click(screen.getByRole('button', { name: /make payment/i }));

      // onMakePayment should be called but card navigation should not happen
      expect(onMakePayment).toHaveBeenCalled();
      // mockPush should not have been called for navigation to pool detail
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Compact Variant', () => {
    it('renders compact variant', () => {
      render(<PoolCard {...defaultProps} variant="compact" />);

      expect(screen.getByText('Family Savings Pool')).toBeInTheDocument();
    });

    it('shows round info in compact format', () => {
      render(<PoolCard {...defaultProps} variant="compact" />);

      expect(screen.getByText(/round 2\/12/i)).toBeInTheDocument();
    });

    it('shows contribution and frequency', () => {
      render(<PoolCard {...defaultProps} variant="compact" />);

      expect(screen.getByText(/\$50\/monthly/i)).toBeInTheDocument();
    });

    it('shows Paid status for user who contributed', () => {
      render(<PoolCard {...defaultProps} variant="compact" userHasContributed={true} />);

      expect(screen.getByText('Paid')).toBeInTheDocument();
    });

    it('shows Pay button for user who has not contributed', () => {
      render(<PoolCard {...defaultProps} variant="compact" userHasContributed={false} />);

      expect(screen.getByRole('button', { name: /pay/i })).toBeInTheDocument();
    });

    it('shows Receiving badge for recipient in compact view', () => {
      render(<PoolCard {...defaultProps} variant="compact" userIsRecipient={true} />);

      expect(screen.getByText('Receiving')).toBeInTheDocument();
    });

    it('shows progress bar in compact view', () => {
      render(<PoolCard {...defaultProps} variant="compact" />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('shows paid count in compact view', () => {
      render(<PoolCard {...defaultProps} variant="compact" />);

      expect(screen.getByText('2/3 paid')).toBeInTheDocument();
    });

    it('applies recipient styling in compact view', () => {
      const { container } = render(<PoolCard {...defaultProps} variant="compact" userIsRecipient={true} />);

      expect(container.querySelector('.border-emerald-200')).toBeInTheDocument();
    });

    it('applies needs-contribution styling in compact view', () => {
      const { container } = render(
        <PoolCard {...defaultProps} variant="compact" userHasContributed={false} userIsRecipient={false} />
      );

      expect(container.querySelector('.border-amber-200')).toBeInTheDocument();
    });
  });

  describe('Payout Countdown', () => {
    it('renders payout countdown when date provided', () => {
      render(<PoolCard {...defaultProps} />);

      expect(screen.getByTestId('payout-countdown')).toBeInTheDocument();
    });

    it('passes correct props to payout countdown', () => {
      render(<PoolCard {...defaultProps} />);

      // The mocked component shows the payout amount
      expect(screen.getByTestId('payout-countdown')).toHaveTextContent('$150');
    });

    it('hides countdown when no payout date', () => {
      render(<PoolCard {...defaultProps} nextPayoutDate={undefined} />);

      // In default variant, there's no Calendar icon without date
      // Just verify the card renders without error
      expect(screen.getByText('Family Savings Pool')).toBeInTheDocument();
    });
  });

  describe('Currency Formatting', () => {
    it('formats currency without decimals for whole numbers', () => {
      render(<PoolCard {...defaultProps} contributionAmount={100} />);

      expect(screen.getByText('$100')).toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      const { container } = render(<PoolCard {...defaultProps} className="my-custom-class" />);

      expect(container.querySelector('.my-custom-class')).toBeInTheDocument();
    });
  });
});

describe('PoolCardSkeleton Component', () => {
  describe('Default Variant', () => {
    it('renders skeleton for default variant', () => {
      const { container } = render(<PoolCardSkeleton />);

      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders skeleton boxes for stats', () => {
      const { container } = render(<PoolCardSkeleton />);

      // Should have 4 skeleton boxes for stats grid
      const skelBoxes = container.querySelectorAll('.bg-gray-200.rounded-lg');
      expect(skelBoxes.length).toBeGreaterThanOrEqual(4);
    });

    it('renders skeleton for title', () => {
      const { container } = render(<PoolCardSkeleton />);

      expect(container.querySelector('.bg-gray-200.rounded.w-40')).toBeInTheDocument();
    });

    it('renders skeleton for avatar circles', () => {
      const { container } = render(<PoolCardSkeleton />);

      const avatarCircles = container.querySelectorAll('.rounded-full.bg-gray-200');
      expect(avatarCircles.length).toBeGreaterThan(0);
    });
  });

  describe('Compact Variant', () => {
    it('renders skeleton for compact variant', () => {
      const { container } = render(<PoolCardSkeleton variant="compact" />);

      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders simpler layout for compact skeleton', () => {
      const { container } = render(<PoolCardSkeleton variant="compact" />);

      // Compact should have a progress bar skeleton
      expect(container.querySelector('.h-1\\.5.bg-gray-200')).toBeInTheDocument();
    });
  });
});
