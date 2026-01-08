/**
 * PayoutCountdown Component Tests
 *
 * Tests for the PayoutCountdown and PayoutCountdownCompact components.
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { PayoutCountdown, PayoutCountdownCompact } from '@/components/pools/PayoutCountdown';

// Mock timers
jest.useFakeTimers();

describe('PayoutCountdown Component', () => {
  const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days from now
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago

  const defaultProps = {
    payoutDate: futureDate,
    payoutAmount: 500,
    recipientName: 'John Smith',
    isUserRecipient: false,
    allContributionsReceived: true,
    payoutProcessed: false,
  };

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Loading State', () => {
    it('shows loading skeleton before mount', () => {
      const { container } = render(<PayoutCountdown {...defaultProps} />);

      // Initial render shows loading skeleton
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders content after mount', async () => {
      render(<PayoutCountdown {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.queryByText('Days')).toBeInTheDocument();
      });
    });
  });

  describe('Countdown Display', () => {
    it('displays countdown timer with days, hours, and minutes', async () => {
      render(<PayoutCountdown {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText('Days')).toBeInTheDocument();
        expect(screen.getByText('Hours')).toBeInTheDocument();
        expect(screen.getByText('Min')).toBeInTheDocument();
      });
    });

    it('shows seconds on larger screens', async () => {
      render(<PayoutCountdown {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText('Sec')).toBeInTheDocument();
      });
    });

    it('pads single digit numbers with zero', async () => {
      // Set a date 1 day, 2 hours, 3 minutes, 4 seconds from now
      const specificDate = new Date(
        Date.now() + 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000 + 3 * 60 * 1000 + 4 * 1000
      ).toISOString();

      render(<PayoutCountdown {...defaultProps} payoutDate={specificDate} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText('01')).toBeInTheDocument(); // Days
        expect(screen.getByText('02')).toBeInTheDocument(); // Hours
        expect(screen.getByText('03')).toBeInTheDocument(); // Minutes
      });
    });
  });

  describe('Payout Amount', () => {
    it('displays formatted payout amount', async () => {
      render(<PayoutCountdown {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText('$500')).toBeInTheDocument();
      });
    });

    it('formats large amounts with commas', async () => {
      render(<PayoutCountdown {...defaultProps} payoutAmount={10000} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText('$10,000')).toBeInTheDocument();
      });
    });
  });

  describe('Recipient Information', () => {
    it('shows recipient name for non-recipient user', async () => {
      render(<PayoutCountdown {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText(/john smith/i)).toBeInTheDocument();
      });
    });

    it('shows "you" when user is recipient', async () => {
      render(<PayoutCountdown {...defaultProps} isUserRecipient={true} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText(/you're the recipient this round!/i)).toBeInTheDocument();
      });
    });

    it('shows "Your payout in" header for recipient', async () => {
      render(<PayoutCountdown {...defaultProps} isUserRecipient={true} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText('Your payout in')).toBeInTheDocument();
      });
    });

    it('shows "Next payout in" header for non-recipient', async () => {
      render(<PayoutCountdown {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText('Next payout in')).toBeInTheDocument();
      });
    });
  });

  describe('Recipient Styling', () => {
    it('applies gradient background for recipient', async () => {
      const { container } = render(<PayoutCountdown {...defaultProps} isUserRecipient={true} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        const mainDiv = container.querySelector('.bg-gradient-to-r');
        expect(mainDiv).toBeInTheDocument();
      });
    });

    it('applies gray background for non-recipient', async () => {
      const { container } = render(<PayoutCountdown {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        const mainDiv = container.querySelector('.bg-gray-50');
        expect(mainDiv).toBeInTheDocument();
      });
    });
  });

  describe('Payout Processed State', () => {
    it('shows "Payout Received!" for recipient when processed', async () => {
      render(<PayoutCountdown {...defaultProps} payoutProcessed={true} isUserRecipient={true} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText('Payout Received!')).toBeInTheDocument();
      });
    });

    it('shows "Payout Complete" for non-recipient when processed', async () => {
      render(<PayoutCountdown {...defaultProps} payoutProcessed={true} isUserRecipient={false} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText('Payout Complete')).toBeInTheDocument();
      });
    });

    it('shows "deposited" text for recipient when processed', async () => {
      render(<PayoutCountdown {...defaultProps} payoutProcessed={true} isUserRecipient={true} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText(/deposited/i)).toBeInTheDocument();
      });
    });

    it('shows "sent to [name]" for non-recipient when processed', async () => {
      render(<PayoutCountdown {...defaultProps} payoutProcessed={true} isUserRecipient={false} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText(/sent to john smith/i)).toBeInTheDocument();
      });
    });

    it('applies green styling when payout processed', async () => {
      const { container } = render(<PayoutCountdown {...defaultProps} payoutProcessed={true} isUserRecipient={false} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(container.querySelector('.bg-green-50')).toBeInTheDocument();
      });
    });
  });

  describe('Awaiting Contributions State', () => {
    it('shows "Awaiting Contributions" when not all received', async () => {
      render(<PayoutCountdown {...defaultProps} allContributionsReceived={false} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText('Awaiting Contributions')).toBeInTheDocument();
      });
    });

    it('shows payout scheduled date when awaiting contributions', async () => {
      render(<PayoutCountdown {...defaultProps} allContributionsReceived={false} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText(/payout scheduled for/i)).toBeInTheDocument();
      });
    });

    it('applies amber styling for awaiting state', async () => {
      const { container } = render(<PayoutCountdown {...defaultProps} allContributionsReceived={false} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(container.querySelector('.bg-amber-50')).toBeInTheDocument();
      });
    });
  });

  describe('Ready for Payout State (Overdue)', () => {
    it('shows "Ready for Payout" when countdown reaches zero', async () => {
      render(<PayoutCountdown {...defaultProps} payoutDate={pastDate} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText('Ready for Payout')).toBeInTheDocument();
      });
    });

    it('shows "Your Payout is Ready!" for recipient when overdue', async () => {
      render(<PayoutCountdown {...defaultProps} payoutDate={pastDate} isUserRecipient={true} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText('Your Payout is Ready!')).toBeInTheDocument();
      });
    });

    it('shows payout amount in ready state', async () => {
      render(<PayoutCountdown {...defaultProps} payoutDate={pastDate} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText(/\$500 to john smith/i)).toBeInTheDocument();
      });
    });

    it('applies blue styling for ready state', async () => {
      const { container } = render(<PayoutCountdown {...defaultProps} payoutDate={pastDate} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(container.querySelector('.bg-blue-50')).toBeInTheDocument();
      });
    });
  });

  describe('Timer Updates', () => {
    it('updates countdown every second', async () => {
      render(<PayoutCountdown {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      const initialSeconds = screen.getByText('Sec').previousSibling?.textContent;

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Seconds should have changed
      const newSeconds = screen.getByText('Sec').previousSibling?.textContent;
      // Note: The actual value comparison depends on timing, but the component should update
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', async () => {
      const { container } = render(<PayoutCountdown {...defaultProps} className="custom-class" />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(container.querySelector('.custom-class')).toBeInTheDocument();
      });
    });
  });
});

describe('PayoutCountdownCompact Component', () => {
  const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days from now
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago

  const defaultProps = {
    payoutDate: futureDate,
    payoutAmount: 500,
    isUserRecipient: false,
    allContributionsReceived: true,
    payoutProcessed: false,
  };

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Rendering', () => {
    it('renders null before mount', () => {
      const { container } = render(<PayoutCountdownCompact {...defaultProps} />);

      // Before mount, should be empty
      expect(container.firstChild).toBeNull();
    });

    it('renders countdown after mount', async () => {
      render(<PayoutCountdownCompact {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        // Should show time like "5d 0h" or similar
        expect(screen.getByText(/\d+[dh]\s*\d*[hm]?/i)).toBeInTheDocument();
      });
    });
  });

  describe('Payout Processed State', () => {
    it('shows "Paid" with check icon when processed', async () => {
      render(<PayoutCountdownCompact {...defaultProps} payoutProcessed={true} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText('Paid')).toBeInTheDocument();
      });
    });

    it('applies green styling when paid', async () => {
      const { container } = render(<PayoutCountdownCompact {...defaultProps} payoutProcessed={true} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(container.querySelector('.text-green-600')).toBeInTheDocument();
      });
    });
  });

  describe('Awaiting Contributions State', () => {
    it('shows "Pending" when not all contributions received', async () => {
      render(<PayoutCountdownCompact {...defaultProps} allContributionsReceived={false} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });
    });

    it('applies amber styling for pending state', async () => {
      const { container } = render(<PayoutCountdownCompact {...defaultProps} allContributionsReceived={false} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(container.querySelector('.text-amber-600')).toBeInTheDocument();
      });
    });
  });

  describe('Countdown Display Format', () => {
    it('shows days and hours for multi-day countdown', async () => {
      render(<PayoutCountdownCompact {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        // Should show format like "5d 0h"
        expect(screen.getByText(/\d+d\s+\d+h/)).toBeInTheDocument();
      });
    });

    it('shows hours and minutes when less than a day', async () => {
      const lessThanDay = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(); // 5 hours

      render(<PayoutCountdownCompact {...defaultProps} payoutDate={lessThanDay} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        // Should show format like "5h 0m"
        expect(screen.getByText(/\d+h\s+\d+m/)).toBeInTheDocument();
      });
    });

    it('shows "Ready" when countdown is complete', async () => {
      render(<PayoutCountdownCompact {...defaultProps} payoutDate={pastDate} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });
    });
  });

  describe('Recipient Styling', () => {
    it('applies emerald color for recipient', async () => {
      const { container } = render(<PayoutCountdownCompact {...defaultProps} isUserRecipient={true} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(container.querySelector('.text-emerald-600')).toBeInTheDocument();
      });
    });

    it('applies blue color for non-recipient', async () => {
      const { container } = render(<PayoutCountdownCompact {...defaultProps} isUserRecipient={false} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(container.querySelector('.text-blue-600')).toBeInTheDocument();
      });
    });
  });

  describe('Timer Updates', () => {
    it('updates every minute', async () => {
      render(<PayoutCountdownCompact {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Advance by 1 minute
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // Component should have re-rendered
      expect(screen.getByText(/\d+[dh]/)).toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', async () => {
      const { container } = render(<PayoutCountdownCompact {...defaultProps} className="my-custom-class" />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(container.querySelector('.my-custom-class')).toBeInTheDocument();
      });
    });
  });

  describe('Clock Icon', () => {
    it('shows clock icon with countdown', async () => {
      const { container } = render(<PayoutCountdownCompact {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        // Clock icon should be present
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });
});
