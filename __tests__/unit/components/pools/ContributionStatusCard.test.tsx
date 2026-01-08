/**
 * ContributionStatusCard Component Tests
 *
 * Tests for the ContributionStatusCard component that displays pool contribution status.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContributionStatusCard } from '@/components/pools/ContributionStatusCard';

// Mock the usePoolContributions hook
jest.mock('@/lib/hooks/usePoolContributions', () => ({
  usePoolContributions: jest.fn(),
}));

import { usePoolContributions } from '@/lib/hooks/usePoolContributions';

const mockUsePoolContributions = usePoolContributions as jest.MockedFunction<typeof usePoolContributions>;

describe('ContributionStatusCard Component', () => {
  const defaultProps = {
    poolId: 'pool-123',
    userEmail: 'user@example.com',
    onMakeContribution: jest.fn(),
  };

  const mockContributionStatus = {
    currentRound: 2,
    contributionAmount: 50,
    allContributionsReceived: false,
    recipient: {
      id: 'user-2',
      name: 'Jane Doe',
      email: 'jane@example.com',
    },
    contributions: [
      {
        memberId: 'member-1',
        name: 'John Smith',
        email: 'user@example.com',
        position: 1,
        hasContributed: true,
        isRecipient: false,
        paymentMethod: 'venmo',
      },
      {
        memberId: 'member-2',
        name: 'Jane Doe',
        email: 'jane@example.com',
        position: 2,
        hasContributed: false,
        isRecipient: true,
        paymentMethod: null,
      },
      {
        memberId: 'member-3',
        name: 'Bob Wilson',
        email: 'bob@example.com',
        position: 3,
        hasContributed: false,
        isRecipient: false,
        paymentMethod: null,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePoolContributions.mockReturnValue({
      isLoading: false,
      error: null,
      contributionStatus: mockContributionStatus,
      userContributionInfo: {
        hasContributed: true,
        isRecipient: false,
        paymentMethod: 'venmo',
      },
      getContributionStatus: jest.fn(),
      makeContribution: jest.fn(),
      resetError: jest.fn(),
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      mockUsePoolContributions.mockReturnValue({
        isLoading: true,
        error: null,
        contributionStatus: null,
        userContributionInfo: null,
        getContributionStatus: jest.fn(),
        makeContribution: jest.fn(),
        resetError: jest.fn(),
      });

      const { container } = render(<ContributionStatusCard {...defaultProps} />);

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('shows loading state in card', () => {
      mockUsePoolContributions.mockReturnValue({
        isLoading: true,
        error: null,
        contributionStatus: null,
        userContributionInfo: null,
        getContributionStatus: jest.fn(),
        makeContribution: jest.fn(),
        resetError: jest.fn(),
      });

      render(<ContributionStatusCard {...defaultProps} />);

      // Loading state should not show error or content
      expect(screen.queryByText('Error')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error message', () => {
      mockUsePoolContributions.mockReturnValue({
        isLoading: false,
        error: 'Failed to load contribution status',
        contributionStatus: null,
        userContributionInfo: null,
        getContributionStatus: jest.fn(),
        makeContribution: jest.fn(),
        resetError: jest.fn(),
      });

      render(<ContributionStatusCard {...defaultProps} />);

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load contribution status')).toBeInTheDocument();
    });
  });

  describe('Round Information', () => {
    it('displays current round number', () => {
      render(<ContributionStatusCard {...defaultProps} />);

      expect(screen.getByText('Round 2 Contributions')).toBeInTheDocument();
    });

    it('shows "In Progress" status when not all contributions received', () => {
      render(<ContributionStatusCard {...defaultProps} />);

      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('shows "All Received" status when all contributions received', () => {
      mockUsePoolContributions.mockReturnValue({
        isLoading: false,
        error: null,
        contributionStatus: {
          ...mockContributionStatus,
          allContributionsReceived: true,
        },
        userContributionInfo: {
          hasContributed: true,
          isRecipient: false,
          paymentMethod: 'venmo',
        },
        getContributionStatus: jest.fn(),
        makeContribution: jest.fn(),
        resetError: jest.fn(),
      });

      render(<ContributionStatusCard {...defaultProps} />);

      expect(screen.getByText('All Received')).toBeInTheDocument();
    });
  });

  describe('Recipient Information', () => {
    it('displays recipient name', () => {
      render(<ContributionStatusCard {...defaultProps} />);

      expect(screen.getByText("This Round's Recipient")).toBeInTheDocument();
      // Jane Doe appears as the recipient - just check it exists somewhere
      expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0);
    });

    it('displays payout amount', () => {
      render(<ContributionStatusCard {...defaultProps} />);

      // Payout = $50 × 3 members = $150
      expect(screen.getByText('Will receive $150.00')).toBeInTheDocument();
    });
  });

  describe('User Status - Recipient', () => {
    it('shows recipient alert when user is recipient and has not contributed', () => {
      mockUsePoolContributions.mockReturnValue({
        isLoading: false,
        error: null,
        contributionStatus: mockContributionStatus,
        userContributionInfo: {
          hasContributed: false,
          isRecipient: true,
          paymentMethod: null,
        },
        getContributionStatus: jest.fn(),
        makeContribution: jest.fn(),
        resetError: jest.fn(),
      });

      render(<ContributionStatusCard {...defaultProps} />);

      expect(screen.getByText("You're the Recipient!")).toBeInTheDocument();
      expect(screen.getByText(/you still need to make your contribution/i)).toBeInTheDocument();
    });

    it('shows completed recipient alert when user is recipient and has contributed', () => {
      mockUsePoolContributions.mockReturnValue({
        isLoading: false,
        error: null,
        contributionStatus: mockContributionStatus,
        userContributionInfo: {
          hasContributed: true,
          isRecipient: true,
          paymentMethod: 'venmo',
        },
        getContributionStatus: jest.fn(),
        makeContribution: jest.fn(),
        resetError: jest.fn(),
      });

      render(<ContributionStatusCard {...defaultProps} />);

      expect(screen.getByText("You're the Recipient!")).toBeInTheDocument();
      expect(screen.getByText(/you've contributed and will receive the payout/i)).toBeInTheDocument();
    });
  });

  describe('User Status - Non-Recipient', () => {
    it('shows contribution complete alert when user has contributed', () => {
      render(<ContributionStatusCard {...defaultProps} />);

      expect(screen.getByText('Contribution Complete')).toBeInTheDocument();
      expect(screen.getByText(/you've paid \$50.00/i)).toBeInTheDocument();
    });

    it('shows payment method in completion alert', () => {
      render(<ContributionStatusCard {...defaultProps} />);

      // The completion alert should mention the payment method
      const completionAlert = screen.getByText('Contribution Complete').closest('div');
      expect(completionAlert).toHaveTextContent(/via Venmo/i);
    });

    it('shows contribution needed alert when user has not contributed', () => {
      mockUsePoolContributions.mockReturnValue({
        isLoading: false,
        error: null,
        contributionStatus: mockContributionStatus,
        userContributionInfo: {
          hasContributed: false,
          isRecipient: false,
          paymentMethod: null,
        },
        getContributionStatus: jest.fn(),
        makeContribution: jest.fn(),
        resetError: jest.fn(),
      });

      render(<ContributionStatusCard {...defaultProps} />);

      expect(screen.getByText('Contribution Needed')).toBeInTheDocument();
      expect(screen.getByText(/you haven't contributed for this round yet/i)).toBeInTheDocument();
    });
  });

  describe('Member Contributions List', () => {
    it('displays all members', () => {
      render(<ContributionStatusCard {...defaultProps} />);

      // Check that all member names appear somewhere in the document
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0); // Also appears in recipient section
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('shows contribution count', () => {
      render(<ContributionStatusCard {...defaultProps} />);

      expect(screen.getByText('1/3 complete')).toBeInTheDocument();
    });

    it('shows "Paid" status for members who contributed', () => {
      render(<ContributionStatusCard {...defaultProps} />);

      expect(screen.getByText('Paid via Venmo')).toBeInTheDocument();
    });

    it('shows "Pending" status for members who have not contributed', () => {
      render(<ContributionStatusCard {...defaultProps} />);

      expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
    });

    it('highlights current user in the list', () => {
      const { container } = render(<ContributionStatusCard {...defaultProps} />);

      // Current user row should have special styling (bg-blue-50)
      expect(container.querySelector('.bg-blue-50')).toBeInTheDocument();
    });

    it('shows "You" badge for current user', () => {
      render(<ContributionStatusCard {...defaultProps} />);

      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('shows "Recipient" badge for recipient', () => {
      render(<ContributionStatusCard {...defaultProps} />);

      expect(screen.getByText('Recipient')).toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('renders progress bar', () => {
      render(<ContributionStatusCard {...defaultProps} />);

      // Progress component should be present
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('shows refresh button', () => {
      render(<ContributionStatusCard {...defaultProps} />);

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('calls getContributionStatus when refresh is clicked', async () => {
      const getContributionStatus = jest.fn();
      mockUsePoolContributions.mockReturnValue({
        isLoading: false,
        error: null,
        contributionStatus: mockContributionStatus,
        userContributionInfo: {
          hasContributed: true,
          isRecipient: false,
          paymentMethod: 'venmo',
        },
        getContributionStatus,
        makeContribution: jest.fn(),
        resetError: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ContributionStatusCard {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /refresh/i }));

      expect(getContributionStatus).toHaveBeenCalled();
    });

    it('shows loading state on refresh button', () => {
      mockUsePoolContributions.mockReturnValue({
        isLoading: true,
        error: null,
        contributionStatus: mockContributionStatus,
        userContributionInfo: {
          hasContributed: true,
          isRecipient: false,
          paymentMethod: 'venmo',
        },
        getContributionStatus: jest.fn(),
        makeContribution: jest.fn(),
        resetError: jest.fn(),
      });

      render(<ContributionStatusCard {...defaultProps} />);

      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    });

    it('shows Make Contribution button when user has not contributed', () => {
      mockUsePoolContributions.mockReturnValue({
        isLoading: false,
        error: null,
        contributionStatus: mockContributionStatus,
        userContributionInfo: {
          hasContributed: false,
          isRecipient: false,
          paymentMethod: null,
        },
        getContributionStatus: jest.fn(),
        makeContribution: jest.fn(),
        resetError: jest.fn(),
      });

      render(<ContributionStatusCard {...defaultProps} />);

      expect(screen.getByRole('button', { name: /make contribution/i })).toBeInTheDocument();
    });

    it('hides Make Contribution button when user has contributed', () => {
      render(<ContributionStatusCard {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /make contribution/i })).not.toBeInTheDocument();
    });

    it('calls onMakeContribution when button is clicked', async () => {
      const onMakeContribution = jest.fn();
      mockUsePoolContributions.mockReturnValue({
        isLoading: false,
        error: null,
        contributionStatus: mockContributionStatus,
        userContributionInfo: {
          hasContributed: false,
          isRecipient: false,
          paymentMethod: null,
        },
        getContributionStatus: jest.fn(),
        makeContribution: jest.fn(),
        resetError: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ContributionStatusCard {...defaultProps} onMakeContribution={onMakeContribution} />);

      await user.click(screen.getByRole('button', { name: /make contribution/i }));

      expect(onMakeContribution).toHaveBeenCalled();
    });
  });

  describe('Payment Method Labels', () => {
    it('displays correct labels for payment methods', () => {
      mockUsePoolContributions.mockReturnValue({
        isLoading: false,
        error: null,
        contributionStatus: {
          ...mockContributionStatus,
          contributions: [
            { ...mockContributionStatus.contributions[0], paymentMethod: 'cashapp', hasContributed: true },
            { ...mockContributionStatus.contributions[1], paymentMethod: 'paypal', hasContributed: true },
            { ...mockContributionStatus.contributions[2], paymentMethod: 'zelle', hasContributed: true },
          ],
        },
        userContributionInfo: {
          hasContributed: true,
          isRecipient: false,
          paymentMethod: 'cashapp',
        },
        getContributionStatus: jest.fn(),
        makeContribution: jest.fn(),
        resetError: jest.fn(),
      });

      render(<ContributionStatusCard {...defaultProps} />);

      expect(screen.getByText('Paid via Cash App')).toBeInTheDocument();
      expect(screen.getByText('Paid via PayPal')).toBeInTheDocument();
      expect(screen.getByText('Paid via Zelle')).toBeInTheDocument();
    });
  });

  describe('Universal Contribution Model', () => {
    it('shows contribution button for recipients (universal model)', () => {
      mockUsePoolContributions.mockReturnValue({
        isLoading: false,
        error: null,
        contributionStatus: mockContributionStatus,
        userContributionInfo: {
          hasContributed: false,
          isRecipient: true,
          paymentMethod: null,
        },
        getContributionStatus: jest.fn(),
        makeContribution: jest.fn(),
        resetError: jest.fn(),
      });

      render(<ContributionStatusCard {...defaultProps} />);

      // Recipients should also see the make contribution button (universal model)
      expect(screen.getByRole('button', { name: /make contribution/i })).toBeInTheDocument();
    });
  });
});
