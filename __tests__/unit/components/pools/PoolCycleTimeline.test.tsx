/**
 * PoolCycleTimeline Component Tests
 *
 * Tests for the PoolCycleTimeline component that displays the payout schedule timeline.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PoolCycleTimeline } from '@/components/pools/PoolCycleTimeline';

describe('PoolCycleTimeline Component', () => {
  const mockMembers = [
    {
      id: 'member-1',
      name: 'John Smith',
      email: 'john@example.com',
      position: 1,
      status: 'completed' as const,
      hasReceivedPayout: true,
      payoutDate: '2024-01-15',
    },
    {
      id: 'member-2',
      name: 'Jane Doe',
      email: 'jane@example.com',
      position: 2,
      status: 'current' as const,
      hasReceivedPayout: false,
      payoutDate: '2024-02-15',
    },
    {
      id: 'member-3',
      name: 'Bob Wilson',
      email: 'bob@example.com',
      position: 3,
      status: 'upcoming' as const,
      hasReceivedPayout: false,
      payoutDate: '2024-03-15',
    },
    {
      id: 'member-4',
      name: 'Alice Brown',
      email: 'alice@example.com',
      position: 4,
      status: 'upcoming' as const,
      hasReceivedPayout: false,
      payoutDate: '2024-04-15',
    },
  ];

  const defaultProps = {
    members: mockMembers,
    currentRound: 2,
    totalRounds: 4,
    contributionAmount: 50,
    frequency: 'monthly',
    currentUserEmail: 'bob@example.com',
  };

  describe('Rendering', () => {
    it('renders the header', () => {
      render(<PoolCycleTimeline {...defaultProps} />);

      expect(screen.getByText('Payout Schedule')).toBeInTheDocument();
    });

    it('renders payout amount per round', () => {
      render(<PoolCycleTimeline {...defaultProps} />);

      // $50 contribution * 4 members = $200 per round
      expect(screen.getByText(/\$200 per round/i)).toBeInTheDocument();
    });

    it('renders frequency in header', () => {
      render(<PoolCycleTimeline {...defaultProps} />);

      expect(screen.getByText(/monthly/i)).toBeInTheDocument();
    });

    it('renders current round information', () => {
      render(<PoolCycleTimeline {...defaultProps} />);

      expect(screen.getByText('Round 2 of 4')).toBeInTheDocument();
    });

    it('renders remaining rounds count', () => {
      render(<PoolCycleTimeline {...defaultProps} />);

      expect(screen.getByText('2 rounds remaining')).toBeInTheDocument();
    });

    it('renders all member names', () => {
      render(<PoolCycleTimeline {...defaultProps} />);

      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      expect(screen.getByText('Alice Brown')).toBeInTheDocument();
    });
  });

  describe('Member Positions', () => {
    it('displays position numbers for each member', () => {
      render(<PoolCycleTimeline {...defaultProps} />);

      expect(screen.getByText('Position 1')).toBeInTheDocument();
      expect(screen.getByText('Position 2')).toBeInTheDocument();
      expect(screen.getByText('Position 3')).toBeInTheDocument();
      expect(screen.getByText('Position 4')).toBeInTheDocument();
    });

    it('sorts members by position', () => {
      const unsortedMembers = [
        { ...mockMembers[3], position: 4 },
        { ...mockMembers[1], position: 2 },
        { ...mockMembers[0], position: 1 },
        { ...mockMembers[2], position: 3 },
      ];

      render(<PoolCycleTimeline {...defaultProps} members={unsortedMembers} />);

      const positions = screen.getAllByText(/Position \d/);
      expect(positions[0]).toHaveTextContent('Position 1');
      expect(positions[1]).toHaveTextContent('Position 2');
      expect(positions[2]).toHaveTextContent('Position 3');
      expect(positions[3]).toHaveTextContent('Position 4');
    });
  });

  describe('Member Status Indicators', () => {
    it('shows check icon for completed members', () => {
      render(<PoolCycleTimeline {...defaultProps} />);

      // The completed member (John Smith) should have a checkmark
      // We can verify by checking for the green styling or completed text
      const johnRow = screen.getByText('John Smith').closest('div');
      expect(johnRow?.parentElement?.querySelector('.bg-green-500')).toBeInTheDocument();
    });

    it('shows "Receiving" badge for current recipient', () => {
      render(<PoolCycleTimeline {...defaultProps} />);

      expect(screen.getByText('Receiving')).toBeInTheDocument();
    });

    it('shows position number for upcoming members', () => {
      render(<PoolCycleTimeline {...defaultProps} />);

      // Upcoming members (position 3 and 4) should display their position numbers in circles
      const bobRow = screen.getByText('Bob Wilson').closest('div');
      expect(bobRow).toBeInTheDocument();
    });
  });

  describe('Current User Highlighting', () => {
    it('shows "You" badge for current user', () => {
      render(<PoolCycleTimeline {...defaultProps} />);

      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('does not show "You" badge when currentUserEmail is not in members', () => {
      render(<PoolCycleTimeline {...defaultProps} currentUserEmail="unknown@example.com" />);

      expect(screen.queryByText('You')).not.toBeInTheDocument();
    });

    it('applies special styling for current user row', () => {
      const { container } = render(<PoolCycleTimeline {...defaultProps} />);

      // Bob Wilson (current user) should have special styling
      expect(container.querySelector('.border')).toBeInTheDocument();
    });
  });

  describe('Payout Dates', () => {
    it('shows "Received" label for completed payouts', () => {
      render(<PoolCycleTimeline {...defaultProps} />);

      expect(screen.getByText(/received:/i)).toBeInTheDocument();
    });

    it('shows "Expected" label for upcoming payouts', () => {
      render(<PoolCycleTimeline {...defaultProps} />);

      const expectedLabels = screen.getAllByText(/expected:/i);
      expect(expectedLabels.length).toBeGreaterThan(0);
    });

    it('formats payout dates correctly', () => {
      render(<PoolCycleTimeline {...defaultProps} />);

      // The dates should be formatted like "Jan 15", "Feb 15", etc.
      expect(screen.getByText(/jan 15/i)).toBeInTheDocument();
      expect(screen.getByText(/feb 15/i)).toBeInTheDocument();
    });

    it('shows payout amount for completed members', () => {
      render(<PoolCycleTimeline {...defaultProps} />);

      // Completed member should show payout amount ($200)
      expect(screen.getByText(/\$200/)).toBeInTheDocument();
    });
  });

  describe('Timeline Legend', () => {
    it('renders legend with all status types', () => {
      render(<PoolCycleTimeline {...defaultProps} />);

      expect(screen.getByText('Received')).toBeInTheDocument();
      expect(screen.getByText('Current')).toBeInTheDocument();
      expect(screen.getByText('Upcoming')).toBeInTheDocument();
    });
  });

  describe('Timeline Connector Lines', () => {
    it('renders connector lines between members', () => {
      const { container } = render(<PoolCycleTimeline {...defaultProps} />);

      // Should have connector lines (except for last item)
      const connectors = container.querySelectorAll('.absolute.left-5');
      expect(connectors.length).toBe(mockMembers.length - 1);
    });

    it('applies green color for completed connector lines', () => {
      const { container } = render(<PoolCycleTimeline {...defaultProps} />);

      const greenConnector = container.querySelector('.bg-green-500.absolute');
      expect(greenConnector).toBeInTheDocument();
    });

    it('applies gray color for upcoming connector lines', () => {
      const { container } = render(<PoolCycleTimeline {...defaultProps} />);

      const grayConnector = container.querySelector('.bg-gray-200.absolute');
      expect(grayConnector).toBeInTheDocument();
    });
  });

  describe('Status Styling', () => {
    it('applies completed styling (green background) for completed members', () => {
      const { container } = render(<PoolCycleTimeline {...defaultProps} />);

      expect(container.querySelector('.bg-green-500')).toBeInTheDocument();
    });

    it('applies current styling (blue background with ring) for current member', () => {
      const { container } = render(<PoolCycleTimeline {...defaultProps} />);

      expect(container.querySelector('.bg-blue-500')).toBeInTheDocument();
      expect(container.querySelector('.ring-4')).toBeInTheDocument();
    });

    it('applies upcoming styling (gray background) for upcoming members', () => {
      const { container } = render(<PoolCycleTimeline {...defaultProps} />);

      expect(container.querySelector('.bg-gray-100')).toBeInTheDocument();
    });
  });

  describe('Payout Calculations', () => {
    it('calculates payout amount correctly', () => {
      render(<PoolCycleTimeline {...defaultProps} contributionAmount={100} />);

      // 4 members * $100 = $400
      expect(screen.getByText(/\$400 per round/i)).toBeInTheDocument();
    });

    it('handles different member counts', () => {
      const twoMembers = mockMembers.slice(0, 2);
      render(<PoolCycleTimeline {...defaultProps} members={twoMembers} />);

      // 2 members * $50 = $100
      expect(screen.getByText(/\$100 per round/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty members array', () => {
      render(<PoolCycleTimeline {...defaultProps} members={[]} />);

      expect(screen.getByText('Payout Schedule')).toBeInTheDocument();
      expect(screen.getByText(/\$0 per round/i)).toBeInTheDocument();
    });

    it('handles single member', () => {
      const singleMember = [mockMembers[0]];
      render(<PoolCycleTimeline {...defaultProps} members={singleMember} />);

      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText(/\$50 per round/i)).toBeInTheDocument();
    });

    it('handles members without payout dates', () => {
      const membersWithoutDates = mockMembers.map(m => ({
        ...m,
        payoutDate: undefined,
      }));

      render(<PoolCycleTimeline {...defaultProps} members={membersWithoutDates} />);

      expect(screen.getByText('John Smith')).toBeInTheDocument();
      // Should not crash and should still render member names
    });

    it('handles different frequencies', () => {
      render(<PoolCycleTimeline {...defaultProps} frequency="weekly" />);

      expect(screen.getByText(/weekly/i)).toBeInTheDocument();
    });

    it('handles round 1 of many', () => {
      render(<PoolCycleTimeline {...defaultProps} currentRound={1} totalRounds={10} />);

      expect(screen.getByText('Round 1 of 10')).toBeInTheDocument();
      expect(screen.getByText('9 rounds remaining')).toBeInTheDocument();
    });

    it('handles last round', () => {
      render(<PoolCycleTimeline {...defaultProps} currentRound={4} totalRounds={4} />);

      expect(screen.getByText('Round 4 of 4')).toBeInTheDocument();
      expect(screen.getByText('0 rounds remaining')).toBeInTheDocument();
    });
  });

  describe('Mobile Badge', () => {
    it('shows "Paid" badge for completed members on mobile', () => {
      render(<PoolCycleTimeline {...defaultProps} />);

      expect(screen.getByText('Paid')).toBeInTheDocument();
    });

    it('shows "Now" badge for current member on mobile', () => {
      render(<PoolCycleTimeline {...defaultProps} />);

      expect(screen.getByText('Now')).toBeInTheDocument();
    });
  });
});
