/**
 * CreatePoolModal Component Tests
 *
 * Tests for the CreatePoolModal component that handles pool creation.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreatePoolModal from '@/components/pools/CreatePoolModal';

// Mock ResizeObserver for Radix UI
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock next-auth
const mockUseSession = jest.fn();
jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

// Mock useCreatePool hook
const mockCreatePool = jest.fn();
jest.mock('@/lib/hooks/useCreatePool', () => ({
  useCreatePool: jest.fn(({ onSuccess }) => ({
    createPool: async (data: unknown) => {
      mockCreatePool(data);
      if (onSuccess) {
        onSuccess('new-pool-123');
      }
    },
    isLoading: false,
    error: null,
  })),
}));

// Mock child components
jest.mock('@/components/pools/CreatorRulesAcknowledgmentDialog', () => ({
  CreatorRulesAcknowledgmentDialog: ({
    open,
    onAccept,
    poolName,
  }: {
    open: boolean;
    onAccept: () => void;
    poolName: string;
  }) =>
    open ? (
      <div data-testid="rules-dialog">
        <p>Rules for {poolName}</p>
        <button onClick={onAccept} data-testid="accept-rules">
          Accept Rules
        </button>
      </div>
    ) : null,
}));

jest.mock('@/components/payments/PoolOnboardingModal', () => ({
  PoolOnboardingModal: ({
    isOpen,
    onComplete,
    poolName,
  }: {
    isOpen: boolean;
    onComplete: () => void;
    poolName: string;
  }) =>
    isOpen ? (
      <div data-testid="onboarding-modal">
        <p>Onboarding for {poolName}</p>
        <button onClick={onComplete} data-testid="complete-onboarding">
          Complete
        </button>
      </div>
    ) : null,
}));

import { useCreatePool } from '@/lib/hooks/useCreatePool';
const mockUseCreatePool = useCreatePool as jest.Mock;

describe('CreatePoolModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onCreatePool: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: { user: { email: 'test@example.com' } },
      status: 'authenticated',
    });
  });

  describe('Rendering', () => {
    it('renders modal with title', async () => {
      render(<CreatePoolModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Create a New Savings Pool')).toBeInTheDocument();
      });
    });

    it('renders step indicators', async () => {
      render(<CreatePoolModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });

    it('does not render when closed', () => {
      render(<CreatePoolModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Create a New Savings Pool')).not.toBeInTheDocument();
    });

    it('renders close button', async () => {
      render(<CreatePoolModal {...defaultProps} />);

      await waitFor(() => {
        // The X icon button should be present
        const closeButton = document.querySelector('button.absolute');
        expect(closeButton).toBeInTheDocument();
      });
    });
  });

  describe('Step 1 - Basic Pool Information', () => {
    it('renders pool name input', async () => {
      render(<CreatePoolModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/pool name/i)).toBeInTheDocument();
      });
    });

    it('renders description input', async () => {
      render(<CreatePoolModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      });
    });

    it('renders contribution amount selector', async () => {
      render(<CreatePoolModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/contribution amount/i)).toBeInTheDocument();
      });
    });

    it('allows entering pool name', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/pool name/i);
      await user.type(nameInput, 'My Test Pool');

      expect(nameInput).toHaveValue('My Test Pool');
    });

    it('allows entering description', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      const descInput = screen.getByLabelText(/description/i);
      await user.type(descInput, 'A pool for testing');

      expect(descInput).toHaveValue('A pool for testing');
    });
  });

  describe('Step Navigation', () => {
    it('shows Next button on step 1', async () => {
      render(<CreatePoolModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      });
    });

    it('validates step 1 before proceeding', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      // Try to go to next step without filling required fields
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText(/pool name is required/i)).toBeInTheDocument();
      });
    });

    it('proceeds to step 2 with valid data', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      // Fill in step 1 data
      const nameInput = screen.getByLabelText(/pool name/i);
      await user.type(nameInput, 'My Test Pool');

      // Select contribution amount
      const amountTrigger = screen.getByRole('combobox');
      await user.click(amountTrigger);
      await waitFor(() => {
        expect(screen.getByRole('option', { name: '$10' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: '$10' }));

      // Click Next
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Should now be on step 2 with frequency options
      await waitFor(() => {
        expect(screen.getByText(/contribution frequency/i)).toBeInTheDocument();
      });
    });

    it('shows Back button on step 2', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      // Fill in step 1 and proceed
      await user.type(screen.getByLabelText(/pool name/i), 'My Test Pool');
      const amountTrigger = screen.getByRole('combobox');
      await user.click(amountTrigger);
      await user.click(screen.getByRole('option', { name: '$10' }));
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });
    });

    it('goes back to step 1 when Back is clicked', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      // Go to step 2
      await user.type(screen.getByLabelText(/pool name/i), 'My Test Pool');
      const amountTrigger = screen.getByRole('combobox');
      await user.click(amountTrigger);
      await user.click(screen.getByRole('option', { name: '$10' }));
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });

      // Click Back
      await user.click(screen.getByRole('button', { name: /back/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/pool name/i)).toBeInTheDocument();
      });
    });
  });

  describe('Step 2 - Pool Schedule', () => {
    const goToStep2 = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.type(screen.getByLabelText(/pool name/i), 'My Test Pool');
      const amountTrigger = screen.getByRole('combobox');
      await user.click(amountTrigger);
      await user.click(screen.getByRole('option', { name: '$10' }));
      await user.click(screen.getByRole('button', { name: /next/i }));
    };

    it('renders frequency options', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      await goToStep2(user);

      await waitFor(() => {
        expect(screen.getByLabelText(/weekly/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/bi-weekly/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/monthly/i)).toBeInTheDocument();
      });
    });

    it('renders member count selector', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      await goToStep2(user);

      await waitFor(() => {
        expect(screen.getByLabelText(/number of members/i)).toBeInTheDocument();
      });
    });

    it('renders duration selector', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      await goToStep2(user);

      await waitFor(() => {
        expect(screen.getByLabelText(/duration/i)).toBeInTheDocument();
      });
    });

    it('renders start date input', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      await goToStep2(user);

      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      });
    });

    it('renders payment method checkboxes', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      await goToStep2(user);

      await waitFor(() => {
        expect(screen.getByText(/allowed payment methods/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/venmo/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/cash app/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/paypal/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/zelle/i)).toBeInTheDocument();
      });
    });

    it('allows selecting frequency', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      await goToStep2(user);

      await waitFor(() => {
        expect(screen.getByLabelText(/monthly/i)).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText(/monthly/i));

      expect(screen.getByLabelText(/monthly/i)).toBeChecked();
    });

    it('validates start date before proceeding to step 3', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      await goToStep2(user);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText(/start date is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Step 3 - Invite Members', () => {
    const goToStep3 = async (user: ReturnType<typeof userEvent.setup>) => {
      // Step 1
      await user.type(screen.getByLabelText(/pool name/i), 'My Test Pool');
      const amountTrigger = screen.getByRole('combobox');
      await user.click(amountTrigger);
      await user.click(screen.getByRole('option', { name: '$10' }));
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 2
      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      });
      const startDateInput = screen.getByLabelText(/start date/i);
      await user.type(startDateInput, '2025-06-01');
      await user.click(screen.getByRole('button', { name: /next/i }));
    };

    it('renders invite method options', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      await goToStep3(user);

      await waitFor(() => {
        expect(screen.getByText(/how would you like to invite members/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/send email invitations/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/create a sharing link/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/i'll invite members later/i)).toBeInTheDocument();
      });
    });

    it('shows email input when email option selected', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      await goToStep3(user);

      await waitFor(() => {
        expect(screen.getByLabelText(/enter email addresses/i)).toBeInTheDocument();
      });
    });

    it('shows sharing link info when link option selected', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      await goToStep3(user);

      await waitFor(() => {
        expect(screen.getByLabelText(/create a sharing link/i)).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText(/create a sharing link/i));

      await waitFor(() => {
        expect(screen.getByText(/you'll receive a link/i)).toBeInTheDocument();
      });
    });

    it('renders pool summary', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      await goToStep3(user);

      await waitFor(() => {
        expect(screen.getByText('Summary')).toBeInTheDocument();
        expect(screen.getByText(/pool name: my test pool/i)).toBeInTheDocument();
        expect(screen.getByText(/contribution: \$10 weekly/i)).toBeInTheDocument();
      });
    });

    it('shows Create Pool button on step 3', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      await goToStep3(user);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create pool/i })).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    const fillAndSubmitForm = async (user: ReturnType<typeof userEvent.setup>) => {
      // Step 1
      await user.type(screen.getByLabelText(/pool name/i), 'My Test Pool');
      const amountTrigger = screen.getByRole('combobox');
      await user.click(amountTrigger);
      await user.click(screen.getByRole('option', { name: '$10' }));
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 2
      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      });
      await user.type(screen.getByLabelText(/start date/i), '2025-06-01');
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 3
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create pool/i })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /create pool/i }));
    };

    it('shows rules acknowledgment dialog before creating pool', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      await fillAndSubmitForm(user);

      await waitFor(() => {
        expect(screen.getByTestId('rules-dialog')).toBeInTheDocument();
      });
    });

    it('creates pool after accepting rules', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      await fillAndSubmitForm(user);

      await waitFor(() => {
        expect(screen.getByTestId('rules-dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('accept-rules'));

      await waitFor(() => {
        expect(mockCreatePool).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'My Test Pool',
            contributionAmount: 10,
            frequency: 'weekly',
            startDate: '2025-06-01',
          })
        );
      });
    });

    it('shows onboarding modal after pool creation', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      await fillAndSubmitForm(user);

      await waitFor(() => {
        expect(screen.getByTestId('rules-dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('accept-rules'));

      await waitFor(() => {
        expect(screen.getByTestId('onboarding-modal')).toBeInTheDocument();
      });
    });

    it('calls onCreatePool callback after pool creation', async () => {
      const onCreatePool = jest.fn();
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} onCreatePool={onCreatePool} />);

      await fillAndSubmitForm(user);

      await waitFor(() => {
        expect(screen.getByTestId('rules-dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('accept-rules'));

      await waitFor(() => {
        expect(onCreatePool).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'new-pool-123',
            name: 'My Test Pool',
          })
        );
      });
    });

    it('redirects to member management after onboarding completion', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} onClose={onClose} />);

      await fillAndSubmitForm(user);

      await user.click(screen.getByTestId('accept-rules'));

      await waitFor(() => {
        expect(screen.getByTestId('onboarding-modal')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('complete-onboarding'));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/member-management/new-pool-123');
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Modal Close', () => {
    it('calls onClose when close button is clicked', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        const closeButton = document.querySelector('button.absolute');
        expect(closeButton).toBeInTheDocument();
      });

      const closeButton = document.querySelector('button.absolute') as HTMLButtonElement;
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('validates contribution amount is within range', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      await user.type(screen.getByLabelText(/pool name/i), 'Test Pool');
      // Don't select an amount

      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText(/contribution amount must be/i)).toBeInTheDocument();
      });
    });

    it('requires authentication to create pool', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      await user.type(screen.getByLabelText(/pool name/i), 'Test Pool');
      const amountTrigger = screen.getByRole('combobox');
      await user.click(amountTrigger);
      await user.click(screen.getByRole('option', { name: '$10' }));

      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText(/must be signed in/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading state when creating pool', async () => {
      mockUseCreatePool.mockReturnValue({
        createPool: jest.fn(),
        isLoading: true,
        error: null,
      });

      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      // Go to step 3
      await user.type(screen.getByLabelText(/pool name/i), 'Test Pool');
      const amountTrigger = screen.getByRole('combobox');
      await user.click(amountTrigger);
      await user.click(screen.getByRole('option', { name: '$10' }));
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      });
      await user.type(screen.getByLabelText(/start date/i), '2025-06-01');
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error from useCreatePool hook', async () => {
      mockUseCreatePool.mockReturnValue({
        createPool: jest.fn(),
        isLoading: false,
        error: 'Failed to create pool',
      });

      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      // Go to step 3
      await user.type(screen.getByLabelText(/pool name/i), 'Test Pool');
      const amountTrigger = screen.getByRole('combobox');
      await user.click(amountTrigger);
      await user.click(screen.getByRole('option', { name: '$10' }));
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      });
      await user.type(screen.getByLabelText(/start date/i), '2025-06-01');
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText('Failed to create pool')).toBeInTheDocument();
      });
    });
  });

  describe('Payment Method Selection', () => {
    const goToStep2 = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.type(screen.getByLabelText(/pool name/i), 'My Test Pool');
      const amountTrigger = screen.getByRole('combobox');
      await user.click(amountTrigger);
      await user.click(screen.getByRole('option', { name: '$10' }));
      await user.click(screen.getByRole('button', { name: /next/i }));
    };

    it('allows toggling payment methods', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      await goToStep2(user);

      await waitFor(() => {
        expect(screen.getByLabelText(/venmo/i)).toBeInTheDocument();
      });

      // Venmo should be checked by default
      const venmoCheckbox = screen.getByLabelText(/venmo/i);
      expect(venmoCheckbox).toBeChecked();

      // Uncheck Venmo
      await user.click(venmoCheckbox);
      expect(venmoCheckbox).not.toBeChecked();
    });

    it('prevents unchecking last payment method', async () => {
      const user = userEvent.setup();
      render(<CreatePoolModal {...defaultProps} />);

      await goToStep2(user);

      await waitFor(() => {
        expect(screen.getByLabelText(/venmo/i)).toBeInTheDocument();
      });

      // Uncheck all but one
      await user.click(screen.getByLabelText(/venmo/i));
      await user.click(screen.getByLabelText(/cash app/i));
      await user.click(screen.getByLabelText(/paypal/i));

      // Zelle should still be checked and cannot be unchecked
      const zelleCheckbox = screen.getByLabelText(/zelle/i);
      expect(zelleCheckbox).toBeChecked();
      expect(zelleCheckbox).toBeDisabled();

      // Warning message should appear
      expect(screen.getByText(/at least one payment method must be selected/i)).toBeInTheDocument();
    });
  });
});
