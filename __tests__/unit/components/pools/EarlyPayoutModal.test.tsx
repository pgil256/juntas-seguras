/**
 * EarlyPayoutModal Component Tests
 *
 * Tests for the EarlyPayoutModal component that handles early payout processing.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EarlyPayoutModal } from '@/components/pools/EarlyPayoutModal';

// Mock ResizeObserver for Radix UI
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// Mock the useEarlyPayout hook
jest.mock('@/lib/hooks/useEarlyPayout', () => ({
  useEarlyPayout: jest.fn(),
}));

// Mock payment deep-links utilities
jest.mock('@/lib/payments/deep-links', () => ({
  generateJuntaPayoutLink: jest.fn(() => 'https://venmo.com/pay?recipient=@john'),
  getPayoutMethodLabel: jest.fn((type: string) => {
    const labels: Record<string, string> = {
      venmo: 'Venmo',
      paypal: 'PayPal',
      zelle: 'Zelle',
      cashapp: 'Cash App',
    };
    return labels[type] || type;
  }),
  getManualPaymentInstructions: jest.fn(() => 'Send payment manually'),
}));

import { useEarlyPayout } from '@/lib/hooks/useEarlyPayout';

const mockUseEarlyPayout = useEarlyPayout as jest.MockedFunction<typeof useEarlyPayout>;

describe('EarlyPayoutModal Component', () => {
  const defaultProps = {
    poolId: 'pool-123',
    poolName: 'Family Savings Pool',
    userId: 'user-123',
    isOpen: true,
    onClose: jest.fn(),
    onPayoutSuccess: jest.fn(),
  };

  const mockEarlyPayoutStatusAllowed = {
    allowed: true,
    reason: null,
    payoutAmount: 500,
    scheduledDate: '2024-03-15',
    currentRound: 2,
    recipient: {
      id: 'recipient-123',
      name: 'John Smith',
      email: 'john@example.com',
      payoutMethod: {
        type: 'venmo',
        handle: '@johnsmith',
        displayName: 'John S.',
      },
    },
    missingContributions: null,
    recipientConnectStatus: 'connected',
  };

  const mockEarlyPayoutStatusNotAllowed = {
    allowed: false,
    reason: 'Not all contributions have been received',
    payoutAmount: 500,
    scheduledDate: '2024-03-15',
    currentRound: 2,
    recipient: null,
    missingContributions: ['Jane Doe', 'Bob Wilson'],
    recipientConnectStatus: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEarlyPayout.mockReturnValue({
      isLoading: false,
      error: null,
      earlyPayoutStatus: mockEarlyPayoutStatusAllowed,
      checkEarlyPayoutStatus: jest.fn(),
      initiateEarlyPayout: jest.fn().mockResolvedValue({ success: true, message: 'Payout processed successfully' }),
    });
  });

  describe('Dialog Open/Close', () => {
    it('renders dialog when isOpen is true', () => {
      render(<EarlyPayoutModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render dialog when isOpen is false', () => {
      render(<EarlyPayoutModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('calls onClose when Cancel button is clicked', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();

      render(<EarlyPayoutModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when dialog is closed via escape', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();

      render(<EarlyPayoutModal {...defaultProps} onClose={onClose} />);

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Dialog Header', () => {
    it('shows dialog title', () => {
      render(<EarlyPayoutModal {...defaultProps} />);

      expect(screen.getByText('Initiate Early Payout')).toBeInTheDocument();
    });

    it('shows pool name in description', () => {
      render(<EarlyPayoutModal {...defaultProps} />);

      expect(screen.getByText(/family savings pool/i)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      mockUseEarlyPayout.mockReturnValue({
        isLoading: true,
        error: null,
        earlyPayoutStatus: null,
        checkEarlyPayoutStatus: jest.fn(),
        initiateEarlyPayout: jest.fn(),
      });

      const { container } = render(<EarlyPayoutModal {...defaultProps} />);

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('does not show content when loading', () => {
      mockUseEarlyPayout.mockReturnValue({
        isLoading: true,
        error: null,
        earlyPayoutStatus: null,
        checkEarlyPayoutStatus: jest.fn(),
        initiateEarlyPayout: jest.fn(),
      });

      render(<EarlyPayoutModal {...defaultProps} />);

      expect(screen.queryByText('Recipient')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error alert', () => {
      mockUseEarlyPayout.mockReturnValue({
        isLoading: false,
        error: 'Failed to check early payout status',
        earlyPayoutStatus: null,
        checkEarlyPayoutStatus: jest.fn(),
        initiateEarlyPayout: jest.fn(),
      });

      render(<EarlyPayoutModal {...defaultProps} />);

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to check early payout status')).toBeInTheDocument();
    });
  });

  describe('Early Payout Not Allowed', () => {
    beforeEach(() => {
      mockUseEarlyPayout.mockReturnValue({
        isLoading: false,
        error: null,
        earlyPayoutStatus: mockEarlyPayoutStatusNotAllowed,
        checkEarlyPayoutStatus: jest.fn(),
        initiateEarlyPayout: jest.fn(),
      });
    });

    it('shows "Early Payout Not Available" alert', () => {
      render(<EarlyPayoutModal {...defaultProps} />);

      expect(screen.getByText('Early Payout Not Available')).toBeInTheDocument();
    });

    it('shows reason for not being available', () => {
      render(<EarlyPayoutModal {...defaultProps} />);

      expect(screen.getByText('Not all contributions have been received')).toBeInTheDocument();
    });

    it('shows list of missing contributions', () => {
      render(<EarlyPayoutModal {...defaultProps} />);

      expect(screen.getByText('Missing contributions from:')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('does not show Confirm Payout button when not allowed', () => {
      render(<EarlyPayoutModal {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /confirm payout/i })).not.toBeInTheDocument();
    });
  });

  describe('Early Payout Allowed - Display Information', () => {
    it('shows recipient name', () => {
      render(<EarlyPayoutModal {...defaultProps} />);

      expect(screen.getByText('Recipient')).toBeInTheDocument();
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    it('shows recipient email', () => {
      render(<EarlyPayoutModal {...defaultProps} />);

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('shows payout amount', () => {
      render(<EarlyPayoutModal {...defaultProps} />);

      expect(screen.getByText('Amount')).toBeInTheDocument();
      expect(screen.getByText('$500.00')).toBeInTheDocument();
    });

    it('shows scheduled date', () => {
      render(<EarlyPayoutModal {...defaultProps} />);

      expect(screen.getByText('Scheduled Date')).toBeInTheDocument();
      // The formatted date
      expect(screen.getByText(/friday, march 15, 2024/i)).toBeInTheDocument();
    });

    it('shows processing now date', () => {
      render(<EarlyPayoutModal {...defaultProps} />);

      expect(screen.getByText('Processing Now')).toBeInTheDocument();
    });

    it('shows payout method information', () => {
      render(<EarlyPayoutModal {...defaultProps} />);

      expect(screen.getByText('Payout Method')).toBeInTheDocument();
      expect(screen.getByText('Venmo')).toBeInTheDocument();
      expect(screen.getByText('@johnsmith')).toBeInTheDocument();
    });

    it('shows payment link button when link is available', () => {
      render(<EarlyPayoutModal {...defaultProps} />);

      expect(screen.getByRole('link', { name: /send via venmo/i })).toBeInTheDocument();
    });

    it('shows important note about future payouts', () => {
      render(<EarlyPayoutModal {...defaultProps} />);

      expect(screen.getByText(/future payouts will remain on their scheduled dates/i)).toBeInTheDocument();
    });
  });

  describe('Reason Textarea', () => {
    it('renders reason textarea', () => {
      render(<EarlyPayoutModal {...defaultProps} />);

      expect(screen.getByPlaceholderText(/enter a reason for initiating early payout/i)).toBeInTheDocument();
    });

    it('allows typing in reason textarea', async () => {
      const user = userEvent.setup();
      render(<EarlyPayoutModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(/enter a reason for initiating early payout/i);
      await user.type(textarea, 'All members agreed to early payout');

      expect(textarea).toHaveValue('All members agreed to early payout');
    });
  });

  describe('Confirm Payout Button', () => {
    it('shows Confirm Payout button when allowed', () => {
      render(<EarlyPayoutModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /confirm payout/i })).toBeInTheDocument();
    });

    it('calls initiateEarlyPayout when clicked', async () => {
      const initiateEarlyPayout = jest.fn().mockResolvedValue({ success: true, message: 'Success' });
      mockUseEarlyPayout.mockReturnValue({
        isLoading: false,
        error: null,
        earlyPayoutStatus: mockEarlyPayoutStatusAllowed,
        checkEarlyPayoutStatus: jest.fn(),
        initiateEarlyPayout,
      });

      const user = userEvent.setup();
      render(<EarlyPayoutModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /confirm payout/i }));

      expect(initiateEarlyPayout).toHaveBeenCalled();
    });

    it('passes reason to initiateEarlyPayout', async () => {
      const initiateEarlyPayout = jest.fn().mockResolvedValue({ success: true, message: 'Success' });
      mockUseEarlyPayout.mockReturnValue({
        isLoading: false,
        error: null,
        earlyPayoutStatus: mockEarlyPayoutStatusAllowed,
        checkEarlyPayoutStatus: jest.fn(),
        initiateEarlyPayout,
      });

      const user = userEvent.setup();
      render(<EarlyPayoutModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(/enter a reason/i);
      await user.type(textarea, 'Emergency request');
      await user.click(screen.getByRole('button', { name: /confirm payout/i }));

      expect(initiateEarlyPayout).toHaveBeenCalledWith('Emergency request');
    });

    it('shows loading state while processing', async () => {
      const initiateEarlyPayout = jest.fn().mockImplementation(() => new Promise(() => {}));
      mockUseEarlyPayout.mockReturnValue({
        isLoading: false,
        error: null,
        earlyPayoutStatus: mockEarlyPayoutStatusAllowed,
        checkEarlyPayoutStatus: jest.fn(),
        initiateEarlyPayout,
      });

      const user = userEvent.setup();
      render(<EarlyPayoutModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /confirm payout/i }));

      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });
    });
  });

  describe('Success State', () => {
    it('shows success alert after successful payout', async () => {
      const user = userEvent.setup();
      render(<EarlyPayoutModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /confirm payout/i }));

      await waitFor(() => {
        expect(screen.getByText('Success!')).toBeInTheDocument();
      });
    });

    it('shows success message from response', async () => {
      const user = userEvent.setup();
      render(<EarlyPayoutModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /confirm payout/i }));

      await waitFor(() => {
        expect(screen.getByText('Payout processed successfully')).toBeInTheDocument();
      });
    });

    it('calls onPayoutSuccess callback', async () => {
      const onPayoutSuccess = jest.fn();
      const user = userEvent.setup();

      render(<EarlyPayoutModal {...defaultProps} onPayoutSuccess={onPayoutSuccess} />);

      await user.click(screen.getByRole('button', { name: /confirm payout/i }));

      await waitFor(() => {
        expect(onPayoutSuccess).toHaveBeenCalled();
      });
    });

    it('shows Close button after success', async () => {
      const user = userEvent.setup();
      render(<EarlyPayoutModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /confirm payout/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      });
    });

    it('hides Cancel and Confirm buttons after success', async () => {
      const user = userEvent.setup();
      render(<EarlyPayoutModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /confirm payout/i }));

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /confirm payout/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Failure State', () => {
    it('shows error alert after failed payout', async () => {
      const initiateEarlyPayout = jest.fn().mockResolvedValue({ success: false, error: 'Payout failed' });
      mockUseEarlyPayout.mockReturnValue({
        isLoading: false,
        error: null,
        earlyPayoutStatus: mockEarlyPayoutStatusAllowed,
        checkEarlyPayoutStatus: jest.fn(),
        initiateEarlyPayout,
      });

      const user = userEvent.setup();
      render(<EarlyPayoutModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /confirm payout/i }));

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Payout failed')).toBeInTheDocument();
      });
    });

    it('keeps form visible after failure', async () => {
      const initiateEarlyPayout = jest.fn().mockResolvedValue({ success: false, error: 'Payout failed' });
      mockUseEarlyPayout.mockReturnValue({
        isLoading: false,
        error: null,
        earlyPayoutStatus: mockEarlyPayoutStatusAllowed,
        checkEarlyPayoutStatus: jest.fn(),
        initiateEarlyPayout,
      });

      const user = userEvent.setup();
      render(<EarlyPayoutModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /confirm payout/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /confirm payout/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });
    });
  });

  describe('Recipient Without Payout Method', () => {
    it('shows action needed message when recipient has no payout method', () => {
      mockUseEarlyPayout.mockReturnValue({
        isLoading: false,
        error: null,
        earlyPayoutStatus: {
          ...mockEarlyPayoutStatusNotAllowed,
          recipientConnectStatus: 'no_payout_method',
        },
        checkEarlyPayoutStatus: jest.fn(),
        initiateEarlyPayout: jest.fn(),
      });

      render(<EarlyPayoutModal {...defaultProps} />);

      expect(screen.getByText(/the recipient needs to set up their payout method/i)).toBeInTheDocument();
    });
  });

  describe('Status Check on Open', () => {
    it('calls checkEarlyPayoutStatus when modal opens', () => {
      const checkEarlyPayoutStatus = jest.fn();
      mockUseEarlyPayout.mockReturnValue({
        isLoading: false,
        error: null,
        earlyPayoutStatus: mockEarlyPayoutStatusAllowed,
        checkEarlyPayoutStatus,
        initiateEarlyPayout: jest.fn(),
      });

      render(<EarlyPayoutModal {...defaultProps} />);

      expect(checkEarlyPayoutStatus).toHaveBeenCalled();
    });
  });
});
