/**
 * RulesAcknowledgmentDialog Component Tests
 *
 * Tests for the RulesAcknowledgmentDialog component that displays pool rules
 * users must acknowledge before joining.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RulesAcknowledgmentDialog } from '@/components/pools/RulesAcknowledgmentDialog';

// Mock ResizeObserver for Radix UI
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('RulesAcknowledgmentDialog Component', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    poolName: 'Family Savings Pool',
    contributionAmount: 100,
    frequency: 'monthly',
    onAccept: jest.fn(),
    isProcessing: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dialog Open/Close', () => {
    it('renders dialog when open is true', () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render dialog when open is false', () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} open={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('calls onOpenChange with false when Cancel button is clicked', async () => {
      const onOpenChange = jest.fn();
      const user = userEvent.setup();

      render(<RulesAcknowledgmentDialog {...defaultProps} onOpenChange={onOpenChange} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('calls onOpenChange with false when escape is pressed', async () => {
      const onOpenChange = jest.fn();
      const user = userEvent.setup();

      render(<RulesAcknowledgmentDialog {...defaultProps} onOpenChange={onOpenChange} />);

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('resets acknowledgment state when dialog closes', async () => {
      const onOpenChange = jest.fn();
      const user = userEvent.setup();

      const { rerender } = render(<RulesAcknowledgmentDialog {...defaultProps} onOpenChange={onOpenChange} />);

      // Check the checkbox
      await user.click(screen.getByRole('checkbox'));
      expect(screen.getByRole('checkbox')).toBeChecked();

      // Close the dialog
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Rerender with closed state then open again
      rerender(<RulesAcknowledgmentDialog {...defaultProps} open={false} onOpenChange={onOpenChange} />);
      rerender(<RulesAcknowledgmentDialog {...defaultProps} open={true} onOpenChange={onOpenChange} />);

      // Checkbox should be unchecked again
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });
  });

  describe('Dialog Header', () => {
    it('shows dialog title', () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} />);

      expect(screen.getByText('Pool Rules & Agreement')).toBeInTheDocument();
    });

    it('shows pool name in description', () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} />);

      expect(screen.getByText(/family savings pool/i)).toBeInTheDocument();
    });
  });

  describe('Pool Information Banner', () => {
    it('shows contribution amount', () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} />);

      expect(screen.getByText(/\$100/)).toBeInTheDocument();
    });

    it('shows frequency', () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} />);

      expect(screen.getByText(/monthly/)).toBeInTheDocument();
    });

    it('explains the pool cycle', () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} />);

      expect(screen.getByText(/each round, all members contribute and one member receives the full payout/i)).toBeInTheDocument();
    });
  });

  describe('Pool Rules', () => {
    it('displays all pool rules', () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} />);

      // Check for rule titles
      expect(screen.getByText('Contribute Every Round')).toBeInTheDocument();
      expect(screen.getByText('Manual Payments to Admin')).toBeInTheDocument();
      expect(screen.getByText('Position-Based Payouts')).toBeInTheDocument();
      expect(screen.getByText('Payout Method Required')).toBeInTheDocument();
      expect(screen.getByText('Full Cycle Commitment')).toBeInTheDocument();
      expect(screen.getByText('Trust & Responsibility')).toBeInTheDocument();
    });

    it('displays rule descriptions', () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} />);

      // Check for some rule descriptions
      expect(screen.getByText(/i understand that i must contribute every round/i)).toBeInTheDocument();
      expect(screen.getByText(/contributions are made manually via venmo, paypal, zelle, or cash app/i)).toBeInTheDocument();
      expect(screen.getByText(/members receive payouts based on their position in the queue/i)).toBeInTheDocument();
    });
  });

  describe('Acknowledgment Checkbox', () => {
    it('renders unchecked by default', () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} />);

      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('can be checked', async () => {
      const user = userEvent.setup();
      render(<RulesAcknowledgmentDialog {...defaultProps} />);

      await user.click(screen.getByRole('checkbox'));

      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('can be unchecked', async () => {
      const user = userEvent.setup();
      render(<RulesAcknowledgmentDialog {...defaultProps} />);

      await user.click(screen.getByRole('checkbox'));
      await user.click(screen.getByRole('checkbox'));

      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('displays acknowledgment label', () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} />);

      expect(screen.getByText(/i have read and agree to follow these pool rules/i)).toBeInTheDocument();
    });

    it('can be checked by clicking the label', async () => {
      const user = userEvent.setup();
      render(<RulesAcknowledgmentDialog {...defaultProps} />);

      await user.click(screen.getByText(/i have read and agree to follow these pool rules/i));

      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('is disabled when processing', () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} isProcessing={true} />);

      expect(screen.getByRole('checkbox')).toBeDisabled();
    });
  });

  describe('Accept Button', () => {
    it('is disabled when checkbox is not checked', () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /accept & join/i })).toBeDisabled();
    });

    it('is enabled when checkbox is checked', async () => {
      const user = userEvent.setup();
      render(<RulesAcknowledgmentDialog {...defaultProps} />);

      await user.click(screen.getByRole('checkbox'));

      expect(screen.getByRole('button', { name: /accept & join/i })).toBeEnabled();
    });

    it('calls onAccept when clicked and checkbox is checked', async () => {
      const onAccept = jest.fn();
      const user = userEvent.setup();

      render(<RulesAcknowledgmentDialog {...defaultProps} onAccept={onAccept} />);

      await user.click(screen.getByRole('checkbox'));
      await user.click(screen.getByRole('button', { name: /accept & join/i }));

      expect(onAccept).toHaveBeenCalled();
    });

    it('does not call onAccept when checkbox is not checked', async () => {
      const onAccept = jest.fn();
      const user = userEvent.setup();

      render(<RulesAcknowledgmentDialog {...defaultProps} onAccept={onAccept} />);

      // Try to click (button should be disabled)
      const button = screen.getByRole('button', { name: /accept & join/i });
      expect(button).toBeDisabled();
    });

    it('shows "Joining..." text when processing', async () => {
      const user = userEvent.setup();

      const { rerender } = render(<RulesAcknowledgmentDialog {...defaultProps} />);

      await user.click(screen.getByRole('checkbox'));
      rerender(<RulesAcknowledgmentDialog {...defaultProps} isProcessing={true} />);

      expect(screen.getByRole('button', { name: /joining\.\.\./i })).toBeInTheDocument();
    });

    it('is disabled when processing', async () => {
      const user = userEvent.setup();

      const { rerender } = render(<RulesAcknowledgmentDialog {...defaultProps} />);

      await user.click(screen.getByRole('checkbox'));
      rerender(<RulesAcknowledgmentDialog {...defaultProps} isProcessing={true} />);

      expect(screen.getByRole('button', { name: /joining/i })).toBeDisabled();
    });
  });

  describe('Cancel Button', () => {
    it('renders Cancel button', () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('is disabled when processing', () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} isProcessing={true} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('is enabled when not processing', () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeEnabled();
    });
  });

  describe('Different Contribution Amounts', () => {
    it('displays different contribution amount', () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} contributionAmount={250} />);

      expect(screen.getByText(/\$250/)).toBeInTheDocument();
    });

    it('displays different frequency', () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} frequency="weekly" />);

      expect(screen.getByText(/weekly/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has dialog role', () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('associates checkbox with label via htmlFor', async () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      const label = screen.getByText(/i have read and agree/i);

      // Clicking label should toggle checkbox
      const user = userEvent.setup();
      await user.click(label);

      expect(checkbox).toBeChecked();
    });
  });

  describe('Scrolling Content', () => {
    it('applies overflow-y-auto for scrollable content', () => {
      const { container } = render(<RulesAcknowledgmentDialog {...defaultProps} />);

      expect(container.querySelector('.overflow-y-auto')).toBeInTheDocument();
    });

    it('sets max-height for dialog content', () => {
      const { container } = render(<RulesAcknowledgmentDialog {...defaultProps} />);

      // The dialog content should have max-h-[90vh]
      expect(container.querySelector('.max-h-\\[90vh\\]')).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('displays ScrollText icon in title', () => {
      const { container } = render(<RulesAcknowledgmentDialog {...defaultProps} />);

      // Icon should be present in the title area
      const titleArea = screen.getByText('Pool Rules & Agreement').closest('div');
      expect(titleArea?.querySelector('svg')).toBeInTheDocument();
    });

    it('displays AlertCircle icon in info banner', () => {
      const { container } = render(<RulesAcknowledgmentDialog {...defaultProps} />);

      // Multiple SVG icons should be present
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe('Different Pool Names', () => {
    it('displays different pool name', () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} poolName="Community Fund" />);

      expect(screen.getByText(/community fund/i)).toBeInTheDocument();
    });

    it('handles special characters in pool name', () => {
      render(<RulesAcknowledgmentDialog {...defaultProps} poolName="John's Pool & Friends" />);

      expect(screen.getByText(/john's pool & friends/i)).toBeInTheDocument();
    });
  });
});
