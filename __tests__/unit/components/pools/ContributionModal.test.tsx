/**
 * ContributionModal Component Tests
 *
 * Tests for the ContributionModal component that handles pool contributions.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContributionModal } from '@/components/pools/ContributionModal';

// Mock ResizeObserver for Radix UI
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// Mock the usePoolContributions hook
const mockGetContributionStatus = jest.fn();
jest.mock('@/lib/hooks/usePoolContributions', () => ({
  usePoolContributions: jest.fn(() => ({
    isLoading: false,
    error: null,
    contributionStatus: {
      currentRound: 2,
      totalRounds: 4,
      contributionAmount: 50,
      recipient: {
        name: 'Jane Doe',
        position: 2,
      },
      contributions: [
        { memberId: '1', memberName: 'John', hasContributed: true },
        { memberId: '2', memberName: 'Jane', hasContributed: false },
        { memberId: '3', memberName: 'Bob', hasContributed: true },
        { memberId: '4', memberName: 'Alice', hasContributed: false },
      ],
    },
    userContributionInfo: {
      hasContributed: false,
      isRecipient: false,
    },
    getContributionStatus: mockGetContributionStatus,
  })),
}));

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// Mock window.open
const mockWindowOpen = jest.fn();
window.open = mockWindowOpen;

// Import the mock so we can change its implementation
import { usePoolContributions } from '@/lib/hooks/usePoolContributions';
const mockUsePoolContributions = usePoolContributions as jest.Mock;

// Mock ZelleInstructionsCard
jest.mock('@/components/payments/ZelleCopyButton', () => ({
  ZelleInstructionsCard: ({ identifier, amount }: { identifier: string; amount: number }) => (
    <div data-testid="zelle-instructions">
      Zelle: {identifier} - ${amount}
    </div>
  ),
}));

describe('ContributionModal Component', () => {
  const defaultProps = {
    poolId: 'pool-123',
    poolName: 'Family Savings Pool',
    userEmail: 'john@example.com',
    isOpen: true,
    onClose: jest.fn(),
    onContributionSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        adminPaymentMethods: {
          venmo: 'admin-venmo',
          cashapp: 'admin-cashapp',
          paypal: 'admin-paypal',
          zelle: 'admin@zelle.com',
          preferred: 'venmo',
        },
      }),
    });
  });

  describe('Rendering', () => {
    it('renders modal with title', async () => {
      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Make Contribution')).toBeInTheDocument();
      });
    });

    it('renders pool name and round info in description', async () => {
      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Family Savings Pool/)).toBeInTheDocument();
        expect(screen.getByText(/Round 2/)).toBeInTheDocument();
      });
    });

    it('renders recipient information', async () => {
      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("This Round's Recipient")).toBeInTheDocument();
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        expect(screen.getByText(/Position 2 of 4/)).toBeInTheDocument();
      });
    });

    it('renders contribution amount', async () => {
      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Contribution Amount:')).toBeInTheDocument();
        expect(screen.getByText('$50.00')).toBeInTheDocument();
      });
    });

    it('renders contribution progress', async () => {
      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Contribution Progress:')).toBeInTheDocument();
        expect(screen.getByText('2/4')).toBeInTheDocument();
      });
    });

    it('does not render content when closed', () => {
      render(<ContributionModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Make Contribution')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', async () => {
      mockUsePoolContributions.mockReturnValueOnce({
        isLoading: true,
        error: null,
        contributionStatus: null,
        userContributionInfo: null,
        getContributionStatus: mockGetContributionStatus,
      });

      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('displays error message when there is an error', async () => {
      mockUsePoolContributions.mockReturnValueOnce({
        isLoading: false,
        error: 'Failed to load contribution status',
        contributionStatus: null,
        userContributionInfo: null,
        getContributionStatus: mockGetContributionStatus,
      });

      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load contribution status')).toBeInTheDocument();
      });
    });
  });

  describe('User States', () => {
    it('shows already contributed message when user has contributed', async () => {
      mockUsePoolContributions.mockReturnValueOnce({
        isLoading: false,
        error: null,
        contributionStatus: {
          currentRound: 2,
          totalRounds: 4,
          contributionAmount: 50,
          recipient: { name: 'Jane Doe', position: 2 },
          contributions: [
            { memberId: '1', memberName: 'John', hasContributed: true },
          ],
        },
        userContributionInfo: {
          hasContributed: true,
          isRecipient: false,
        },
        getContributionStatus: mockGetContributionStatus,
      });

      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Already Contributed')).toBeInTheDocument();
        expect(screen.getByText(/already made your contribution for Round 2/)).toBeInTheDocument();
      });
    });

    it('shows recipient message when user is recipient', async () => {
      mockUsePoolContributions.mockReturnValueOnce({
        isLoading: false,
        error: null,
        contributionStatus: {
          currentRound: 2,
          totalRounds: 4,
          contributionAmount: 50,
          recipient: { name: 'John Doe', position: 2 },
          contributions: [
            { memberId: '1', memberName: 'John', hasContributed: false },
            { memberId: '2', memberName: 'Jane', hasContributed: true },
          ],
        },
        userContributionInfo: {
          hasContributed: false,
          isRecipient: true,
        },
        getContributionStatus: mockGetContributionStatus,
      });

      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("You're the Recipient!")).toBeInTheDocument();
        expect(screen.getByText(/You will receive the payout this round/)).toBeInTheDocument();
      });
    });

    it('shows undo button when user has contributed', async () => {
      mockUsePoolContributions.mockReturnValueOnce({
        isLoading: false,
        error: null,
        contributionStatus: {
          currentRound: 2,
          totalRounds: 4,
          contributionAmount: 50,
          recipient: { name: 'Jane Doe', position: 2 },
          contributions: [],
        },
        userContributionInfo: {
          hasContributed: true,
          isRecipient: false,
        },
        getContributionStatus: mockGetContributionStatus,
      });

      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /undo payment/i })).toBeInTheDocument();
      });
    });
  });

  describe('Payment Methods', () => {
    it('renders available payment methods', async () => {
      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Venmo')).toBeInTheDocument();
        expect(screen.getByText('Cash App')).toBeInTheDocument();
        expect(screen.getByText('PayPal')).toBeInTheDocument();
      });
    });

    it('shows preferred badge on preferred payment method', async () => {
      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Preferred')).toBeInTheDocument();
      });
    });

    it('shows no payment methods message when none available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ adminPaymentMethods: null }),
      });

      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No Payment Methods Available')).toBeInTheDocument();
      });
    });

    it('renders Zelle instructions when available', async () => {
      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('zelle-instructions')).toBeInTheDocument();
      });
    });
  });

  describe('Modal Open/Close Behavior', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();

      render(<ContributionModal {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('fetches contribution status when modal opens', async () => {
      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetContributionStatus).toHaveBeenCalled();
      });
    });

    it('fetches admin payment methods when modal opens', async () => {
      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/pools/pool-123/admin-payment-methods');
      });
    });
  });

  describe('Form Submission', () => {
    it('confirms payment when clicking "I\'ve Paid" button', async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            adminPaymentMethods: {
              venmo: 'admin-venmo',
              preferred: 'venmo',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/I've Paid via Venmo/)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/I've Paid via Venmo/));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/pools/pool-123/contributions',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              action: 'confirm_manual',
              paymentMethod: 'venmo',
            }),
          })
        );
      });
    });

    it('shows success message after successful payment confirmation', async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            adminPaymentMethods: {
              venmo: 'admin-venmo',
              preferred: 'venmo',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/I've Paid via Venmo/)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/I've Paid via Venmo/));

      await waitFor(() => {
        expect(screen.getByText('Success!')).toBeInTheDocument();
        expect(screen.getByText('Payment recorded successfully!')).toBeInTheDocument();
      });
    });

    it('calls onContributionSuccess after successful payment', async () => {
      const onContributionSuccess = jest.fn();
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            adminPaymentMethods: {
              venmo: 'admin-venmo',
              preferred: 'venmo',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      render(<ContributionModal {...defaultProps} onContributionSuccess={onContributionSuccess} />);

      await waitFor(() => {
        expect(screen.getByText(/I've Paid via Venmo/)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/I've Paid via Venmo/));

      await waitFor(() => {
        expect(onContributionSuccess).toHaveBeenCalled();
      });
    });

    it('shows error message on payment failure', async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            adminPaymentMethods: {
              venmo: 'admin-venmo',
              preferred: 'venmo',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Payment verification failed' }),
        });

      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/I've Paid via Venmo/)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/I've Paid via Venmo/));

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Payment verification failed')).toBeInTheDocument();
      });
    });
  });

  describe('Undo Payment', () => {
    it('allows undoing a payment', async () => {
      const user = userEvent.setup();
      mockUsePoolContributions.mockReturnValue({
        isLoading: false,
        error: null,
        contributionStatus: {
          currentRound: 2,
          totalRounds: 4,
          contributionAmount: 50,
          recipient: { name: 'Jane Doe', position: 2 },
          contributions: [],
        },
        userContributionInfo: {
          hasContributed: true,
          isRecipient: false,
        },
        getContributionStatus: mockGetContributionStatus,
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ adminPaymentMethods: null }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, message: 'Payment undone successfully!' }),
        });

      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /undo payment/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /undo payment/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/pools/pool-123/contributions',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ action: 'undo_payment' }),
          })
        );
      });
    });
  });

  describe('Copy to Clipboard', () => {
    it('copies payment handle to clipboard when copy button is clicked', async () => {
      const user = userEvent.setup();

      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Venmo')).toBeInTheDocument();
      });

      // Find and click the copy button (first one for venmo)
      const copyButtons = screen.getAllByTitle('Copy handle');
      await user.click(copyButtons[0]);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('admin-venmo');
    });
  });

  describe('Open Payment App', () => {
    it('opens payment app link when Open App button is clicked', async () => {
      const user = userEvent.setup();

      render(<ContributionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText('Open App').length).toBeGreaterThan(0);
      });

      await user.click(screen.getAllByText('Open App')[0]);

      expect(mockWindowOpen).toHaveBeenCalled();
    });
  });
});
