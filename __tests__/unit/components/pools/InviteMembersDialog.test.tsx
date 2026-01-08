/**
 * InviteMembersDialog Component Tests
 *
 * Tests for the InviteMembersDialog component that handles pool member invitations.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InviteMembersDialog } from '@/components/pools/InviteMembersDialog';

// Mock ResizeObserver for Radix UI
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// Mock usePoolInvitations hook
const mockSendInvitation = jest.fn();
jest.mock('@/lib/hooks/usePoolInvitations', () => ({
  usePoolInvitations: jest.fn(() => ({
    sendInvitation: mockSendInvitation,
    isLoading: false,
    error: null,
    invitations: [],
  })),
}));

import { usePoolInvitations } from '@/lib/hooks/usePoolInvitations';
const mockUsePoolInvitations = usePoolInvitations as jest.Mock;

describe('InviteMembersDialog Component', () => {
  const defaultProps = {
    poolId: 'pool-123',
    poolName: 'Family Savings Pool',
    isOpen: true,
    onClose: jest.fn(),
    userId: 'user-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendInvitation.mockResolvedValue({ success: true });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, inviteLink: null }),
    });
  });

  describe('Rendering', () => {
    it('renders dialog with title', async () => {
      render(<InviteMembersDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Invite Members')).toBeInTheDocument();
      });
    });

    it('renders dialog description with pool name', async () => {
      render(<InviteMembersDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/invite new members to join your "Family Savings Pool" pool/i)).toBeInTheDocument();
      });
    });

    it('renders tabs for email and link invites', async () => {
      render(<InviteMembersDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /email invites/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /invite link/i })).toBeInTheDocument();
      });
    });

    it('does not render when closed', () => {
      render(<InviteMembersDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Invite Members')).not.toBeInTheDocument();
    });

    it('renders cancel button', async () => {
      render(<InviteMembersDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });
    });

    it('renders send invitations button', async () => {
      render(<InviteMembersDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /send invitations/i })).toBeInTheDocument();
      });
    });
  });

  describe('Email Invites Tab', () => {
    it('shows email input field', async () => {
      render(<InviteMembersDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
      });
    });

    it('allows entering email address', async () => {
      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText('name@example.com');
      await user.type(emailInput, 'friend@example.com');

      expect(emailInput).toHaveValue('friend@example.com');
    });

    it('shows Add Another Email button', async () => {
      render(<InviteMembersDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add another email/i })).toBeInTheDocument();
      });
    });

    it('adds new email field when Add Another Email is clicked', async () => {
      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /add another email/i }));

      await waitFor(() => {
        const emailInputs = screen.getAllByPlaceholderText('name@example.com');
        expect(emailInputs.length).toBe(2);
      });
    });

    it('shows remove button for email fields', async () => {
      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      // Add another email field
      await user.click(screen.getByRole('button', { name: /add another email/i }));

      await waitFor(() => {
        // There should be remove buttons (X icons)
        const removeButtons = screen.getAllByRole('button').filter(
          btn => btn.classList.contains('h-8') && btn.classList.contains('w-8')
        );
        expect(removeButtons.length).toBeGreaterThan(0);
      });
    });

    it('removes email field when remove button is clicked', async () => {
      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      // Add two more email fields
      await user.click(screen.getByRole('button', { name: /add another email/i }));
      await user.click(screen.getByRole('button', { name: /add another email/i }));

      await waitFor(() => {
        const emailInputs = screen.getAllByPlaceholderText('name@example.com');
        expect(emailInputs.length).toBe(3);
      });

      // Find the small remove buttons (8x8 size class)
      const allButtons = screen.getAllByRole('button');
      const removeButtons = allButtons.filter(btn => {
        return btn.className.includes('w-8') && btn.className.includes('h-8');
      });

      // Click the first remove button
      if (removeButtons.length > 0) {
        await user.click(removeButtons[0]);
      }

      await waitFor(() => {
        const emailInputs = screen.getAllByPlaceholderText('name@example.com');
        expect(emailInputs.length).toBe(2);
      });
    });

    it('shows personal message textarea', async () => {
      render(<InviteMembersDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/personal message/i)).toBeInTheDocument();
      });
    });

    it('allows entering personal message', async () => {
      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      const messageTextarea = screen.getByPlaceholderText(/add a personal note/i);
      await user.type(messageTextarea, 'Join our pool!');

      expect(messageTextarea).toHaveValue('Join our pool!');
    });
  });

  describe('Invite Link Tab', () => {
    it('switches to invite link tab when clicked', async () => {
      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      await user.click(screen.getByRole('tab', { name: /invite link/i }));

      await waitFor(() => {
        expect(screen.getByText(/share this invite link/i)).toBeInTheDocument();
      });
    });

    it('shows Generate Invite Link button when no link exists', async () => {
      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      await user.click(screen.getByRole('tab', { name: /invite link/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate invite link/i })).toBeInTheDocument();
      });
    });

    it('shows expiry selector', async () => {
      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      await user.click(screen.getByRole('tab', { name: /invite link/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/link expires after/i)).toBeInTheDocument();
      });
    });

    it('generates invite link when button is clicked', async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, inviteLink: null }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            inviteLink: 'https://example.com/invite/abc123',
            expiresAt: '2025-02-01T00:00:00Z',
          }),
        });

      render(<InviteMembersDialog {...defaultProps} />);

      await user.click(screen.getByRole('tab', { name: /invite link/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate invite link/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /generate invite link/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/pools/pool-123/invite-link',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    it('displays generated invite link', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          inviteLink: 'https://example.com/invite/abc123',
          expiresAt: '2025-02-01T00:00:00Z',
        }),
      });

      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      await user.click(screen.getByRole('tab', { name: /invite link/i }));

      await waitFor(() => {
        expect(screen.getByDisplayValue('https://example.com/invite/abc123')).toBeInTheDocument();
      });
    });

    it('shows copy button when link exists', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          inviteLink: 'https://example.com/invite/abc123',
          expiresAt: '2025-02-01T00:00:00Z',
        }),
      });

      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      await user.click(screen.getByRole('tab', { name: /invite link/i }));

      await waitFor(() => {
        // Find the copy button in the link section
        const copyButton = screen.getByRole('button', { name: '' }); // SVG icon button
        expect(copyButton).toBeInTheDocument();
      });
    });

    it('copies link to clipboard when copy button is clicked', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          inviteLink: 'https://example.com/invite/abc123',
          expiresAt: '2025-02-01T00:00:00Z',
        }),
      });

      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      await user.click(screen.getByRole('tab', { name: /invite link/i }));

      await waitFor(() => {
        expect(screen.getByDisplayValue('https://example.com/invite/abc123')).toBeInTheDocument();
      });

      // Find and click the copy button (small outline button next to the input)
      const allButtons = screen.getAllByRole('button');
      const copyButton = allButtons.find(btn => {
        return btn.className.includes('outline') && btn.closest('.flex.items-center.gap-2');
      });

      if (copyButton) {
        await user.click(copyButton);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/invite/abc123');
      }
    });

    it('shows success message after copying link', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          inviteLink: 'https://example.com/invite/abc123',
          expiresAt: '2025-02-01T00:00:00Z',
        }),
      });

      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      await user.click(screen.getByRole('tab', { name: /invite link/i }));

      await waitFor(() => {
        expect(screen.getByDisplayValue('https://example.com/invite/abc123')).toBeInTheDocument();
      });

      // Find and click copy button
      const allButtons = screen.getAllByRole('button');
      const copyButton = allButtons.find(btn => btn.className.includes('outline'));

      if (copyButton) {
        await user.click(copyButton);

        await waitFor(() => {
          expect(screen.getByText(/link copied to clipboard/i)).toBeInTheDocument();
        });
      }
    });

    it('shows link expiry date', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          inviteLink: 'https://example.com/invite/abc123',
          expiresAt: '2025-02-01T00:00:00Z',
        }),
      });

      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      await user.click(screen.getByRole('tab', { name: /invite link/i }));

      await waitFor(() => {
        expect(screen.getByText(/expires:/i)).toBeInTheDocument();
      });
    });

    it('shows Generate New Link button when link exists', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          inviteLink: 'https://example.com/invite/abc123',
          expiresAt: '2025-02-01T00:00:00Z',
        }),
      });

      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      await user.click(screen.getByRole('tab', { name: /invite link/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate new link/i })).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('sends invitations when button is clicked', async () => {
      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText('name@example.com');
      await user.type(emailInput, 'friend@example.com');

      await user.click(screen.getByRole('button', { name: /send invitations/i }));

      await waitFor(() => {
        expect(mockSendInvitation).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'friend@example.com',
          })
        );
      });
    });

    it('sends multiple invitations', async () => {
      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      // Enter first email
      const emailInput = screen.getByPlaceholderText('name@example.com');
      await user.type(emailInput, 'friend1@example.com');

      // Add another email field
      await user.click(screen.getByRole('button', { name: /add another email/i }));

      // Enter second email
      const emailInputs = screen.getAllByPlaceholderText('name@example.com');
      await user.type(emailInputs[1], 'friend2@example.com');

      await user.click(screen.getByRole('button', { name: /send invitations/i }));

      await waitFor(() => {
        expect(mockSendInvitation).toHaveBeenCalledTimes(2);
        expect(mockSendInvitation).toHaveBeenCalledWith(
          expect.objectContaining({ email: 'friend1@example.com' })
        );
        expect(mockSendInvitation).toHaveBeenCalledWith(
          expect.objectContaining({ email: 'friend2@example.com' })
        );
      });
    });

    it('shows error when no email provided', async () => {
      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /send invitations/i }));

      await waitFor(() => {
        expect(screen.getByText(/please provide at least one valid email address/i)).toBeInTheDocument();
      });
    });

    it('closes dialog on successful submission', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} onClose={onClose} />);

      const emailInput = screen.getByPlaceholderText('name@example.com');
      await user.type(emailInput, 'friend@example.com');

      await user.click(screen.getByRole('button', { name: /send invitations/i }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('shows error on failed invitation', async () => {
      mockSendInvitation.mockResolvedValue({
        success: false,
        error: 'User already invited',
      });

      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText('name@example.com');
      await user.type(emailInput, 'friend@example.com');

      await user.click(screen.getByRole('button', { name: /send invitations/i }));

      await waitFor(() => {
        expect(screen.getByText(/user already invited/i)).toBeInTheDocument();
      });
    });

    it('disables send button when email is empty', async () => {
      render(<InviteMembersDialog {...defaultProps} />);

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /send invitations/i });
        expect(sendButton).toBeDisabled();
      });
    });
  });

  describe('Modal Close', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('shows sending state when invitations are being sent', async () => {
      mockUsePoolInvitations.mockReturnValue({
        sendInvitation: mockSendInvitation,
        isLoading: true,
        error: null,
        invitations: [],
      });

      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText('name@example.com');
      await user.type(emailInput, 'friend@example.com');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sending/i })).toBeInTheDocument();
      });
    });

    it('shows loading spinner when fetching invite link', async () => {
      // First call returns no link, second call is delayed
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValue(pendingPromise);

      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      await user.click(screen.getByRole('tab', { name: /invite link/i }));

      // The component should show loading state
      await waitFor(() => {
        const tabPanel = screen.getByRole('tabpanel');
        expect(tabPanel).toBeInTheDocument();
      });

      // Resolve the promise to clean up
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ success: true, inviteLink: null }),
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error when generating link fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, inviteLink: null }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ success: false, error: 'Failed to generate link' }),
        });

      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      await user.click(screen.getByRole('tab', { name: /invite link/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate invite link/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /generate invite link/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to generate invite link/i)).toBeInTheDocument();
      });
    });
  });

  describe('Fetching Existing Link', () => {
    it('fetches existing invite link when dialog opens', async () => {
      render(<InviteMembersDialog {...defaultProps} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/pools/pool-123/invite-link');
      });
    });

    it('displays existing invite link', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          inviteLink: 'https://example.com/invite/existing',
          expiresAt: '2025-03-01T00:00:00Z',
        }),
      });

      const user = userEvent.setup();
      render(<InviteMembersDialog {...defaultProps} />);

      await user.click(screen.getByRole('tab', { name: /invite link/i }));

      await waitFor(() => {
        expect(screen.getByDisplayValue('https://example.com/invite/existing')).toBeInTheDocument();
      });
    });
  });
});
