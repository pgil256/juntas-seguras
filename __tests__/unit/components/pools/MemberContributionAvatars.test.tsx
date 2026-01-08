/**
 * MemberContributionAvatars Component Tests
 *
 * Tests for the MemberContributionAvatars and MemberContributionList components.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemberContributionAvatars,
  MemberContributionList,
} from '@/components/pools/MemberContributionAvatars';

// Mock ResizeObserver for Radix UI tooltips
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('MemberContributionAvatars Component', () => {
  const mockMembers = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      hasContributed: true,
      isRecipient: false,
      position: 1,
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      hasContributed: false,
      isRecipient: true,
      position: 2,
    },
    {
      id: '3',
      name: 'Bob Wilson',
      email: 'bob@example.com',
      hasContributed: true,
      isRecipient: false,
      position: 3,
    },
    {
      id: '4',
      name: 'Alice Brown',
      email: 'alice@example.com',
      hasContributed: false,
      isRecipient: false,
      position: 4,
    },
  ];

  describe('Rendering', () => {
    it('renders all member avatars', () => {
      render(<MemberContributionAvatars members={mockMembers} />);

      // Check for initials in avatars
      expect(screen.getByText('JD')).toBeInTheDocument();
      expect(screen.getByText('JS')).toBeInTheDocument();
      expect(screen.getByText('BW')).toBeInTheDocument();
      expect(screen.getByText('AB')).toBeInTheDocument();
    });

    it('renders members sorted by position', () => {
      const unsortedMembers = [
        { ...mockMembers[2], position: 3 },
        { ...mockMembers[0], position: 1 },
        { ...mockMembers[3], position: 4 },
        { ...mockMembers[1], position: 2 },
      ];

      render(<MemberContributionAvatars members={unsortedMembers} />);

      // All should still render regardless of input order
      expect(screen.getByText('JD')).toBeInTheDocument();
      expect(screen.getByText('JS')).toBeInTheDocument();
      expect(screen.getByText('BW')).toBeInTheDocument();
      expect(screen.getByText('AB')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(
        <MemberContributionAvatars members={mockMembers} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('renders empty state when no members', () => {
      const { container } = render(<MemberContributionAvatars members={[]} />);

      // Should render the container but no avatars
      expect(container.querySelector('.flex.items-center')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  describe('Member Initials', () => {
    it('generates correct initials for two-word names', () => {
      render(<MemberContributionAvatars members={mockMembers} />);

      expect(screen.getByText('JD')).toBeInTheDocument(); // John Doe
      expect(screen.getByText('JS')).toBeInTheDocument(); // Jane Smith
    });

    it('generates correct initials for single-word names', () => {
      const singleNameMembers = [
        { id: '1', name: 'Madonna', email: 'madonna@example.com', hasContributed: true, isRecipient: false, position: 1 },
      ];

      render(<MemberContributionAvatars members={singleNameMembers} />);

      expect(screen.getByText('M')).toBeInTheDocument();
    });

    it('limits initials to 2 characters', () => {
      const longNameMembers = [
        { id: '1', name: 'John Paul Smith', email: 'jps@example.com', hasContributed: true, isRecipient: false, position: 1 },
      ];

      render(<MemberContributionAvatars members={longNameMembers} />);

      expect(screen.getByText('JP')).toBeInTheDocument();
    });
  });

  describe('Status Badges', () => {
    it('shows check badge for members who have contributed', () => {
      const { container } = render(<MemberContributionAvatars members={mockMembers} />);

      // Members who contributed should have green badges
      const greenBadges = container.querySelectorAll('.bg-green-500');
      expect(greenBadges.length).toBe(2); // John and Bob
    });

    it('shows award badge for recipient', () => {
      const { container } = render(<MemberContributionAvatars members={mockMembers} />);

      // Recipient should have blue badge
      const blueBadges = container.querySelectorAll('.bg-blue-500');
      expect(blueBadges.length).toBe(1); // Jane
    });

    it('shows clock badge for pending members', () => {
      const { container } = render(<MemberContributionAvatars members={mockMembers} />);

      // Pending members should have amber badges
      const amberBadges = container.querySelectorAll('.bg-amber-500');
      expect(amberBadges.length).toBe(1); // Alice
    });
  });

  describe('Avatar Styling', () => {
    it('applies contributed styling to avatar fallback', () => {
      const { container } = render(<MemberContributionAvatars members={mockMembers} />);

      const greenFallbacks = container.querySelectorAll('.bg-green-100');
      expect(greenFallbacks.length).toBe(2); // John and Bob
    });

    it('applies recipient styling to avatar fallback', () => {
      const { container } = render(<MemberContributionAvatars members={mockMembers} />);

      const blueFallbacks = container.querySelectorAll('.bg-blue-100');
      expect(blueFallbacks.length).toBe(1); // Jane
    });

    it('applies pending styling to avatar fallback', () => {
      const { container } = render(<MemberContributionAvatars members={mockMembers} />);

      const amberFallbacks = container.querySelectorAll('.bg-amber-100');
      expect(amberFallbacks.length).toBe(1); // Alice
    });

    it('highlights current user avatar', () => {
      const { container } = render(
        <MemberContributionAvatars members={mockMembers} currentUserEmail="john@example.com" />
      );

      const highlightedAvatar = container.querySelector('.ring-blue-500');
      expect(highlightedAvatar).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('renders small size', () => {
      const { container } = render(<MemberContributionAvatars members={mockMembers} size="sm" />);

      expect(container.querySelector('.w-8')).toBeInTheDocument();
      expect(container.querySelector('.h-8')).toBeInTheDocument();
    });

    it('renders medium size (default)', () => {
      const { container } = render(<MemberContributionAvatars members={mockMembers} />);

      expect(container.querySelector('.w-10')).toBeInTheDocument();
      expect(container.querySelector('.h-10')).toBeInTheDocument();
    });

    it('renders large size', () => {
      const { container } = render(<MemberContributionAvatars members={mockMembers} size="lg" />);

      expect(container.querySelector('.w-12')).toBeInTheDocument();
      expect(container.querySelector('.h-12')).toBeInTheDocument();
    });
  });

  describe('Max Display', () => {
    it('displays limited number of avatars based on maxDisplay', () => {
      render(<MemberContributionAvatars members={mockMembers} maxDisplay={2} />);

      // Should show 2 avatars + remaining count
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('does not show remaining count when all members displayed', () => {
      render(<MemberContributionAvatars members={mockMembers} maxDisplay={10} />);

      expect(screen.queryByText(/\+\d+/)).not.toBeInTheDocument();
    });

    it('applies default maxDisplay of 8', () => {
      const manyMembers = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        name: `Member ${i}`,
        email: `member${i}@example.com`,
        hasContributed: false,
        isRecipient: false,
        position: i + 1,
      }));

      render(<MemberContributionAvatars members={manyMembers} />);

      expect(screen.getByText('+2')).toBeInTheDocument();
    });
  });

  describe('Tooltips', () => {
    it('shows tooltip by default', async () => {
      const user = userEvent.setup();
      render(<MemberContributionAvatars members={mockMembers} />);

      // Hover over first avatar
      const avatar = screen.getByText('JD').closest('div');
      if (avatar) {
        await user.hover(avatar);

        await waitFor(() => {
          expect(screen.getByText('John Doe')).toBeInTheDocument();
        }, { timeout: 1000 });
      }
    });

    it('shows "(You)" in tooltip for current user', async () => {
      const user = userEvent.setup();
      render(
        <MemberContributionAvatars members={mockMembers} currentUserEmail="john@example.com" showTooltip={true} />
      );

      const avatar = screen.getByText('JD').closest('div');
      if (avatar) {
        await user.hover(avatar);

        await waitFor(() => {
          expect(screen.getByText(/john doe/i)).toBeInTheDocument();
          expect(screen.getByText(/\(you\)/i)).toBeInTheDocument();
        }, { timeout: 1000 });
      }
    });

    it('shows "Paid" status in tooltip', async () => {
      const user = userEvent.setup();
      render(<MemberContributionAvatars members={mockMembers} showTooltip={true} />);

      const avatar = screen.getByText('JD').closest('div');
      if (avatar) {
        await user.hover(avatar);

        await waitFor(() => {
          expect(screen.getByText('Paid')).toBeInTheDocument();
        }, { timeout: 1000 });
      }
    });

    it('shows "Recipient this round" in tooltip', async () => {
      const user = userEvent.setup();
      render(<MemberContributionAvatars members={mockMembers} showTooltip={true} />);

      const avatar = screen.getByText('JS').closest('div');
      if (avatar) {
        await user.hover(avatar);

        await waitFor(() => {
          expect(screen.getByText('Recipient this round')).toBeInTheDocument();
        }, { timeout: 1000 });
      }
    });

    it('shows "Payment pending" in tooltip', async () => {
      const user = userEvent.setup();
      render(<MemberContributionAvatars members={mockMembers} showTooltip={true} />);

      const avatar = screen.getByText('AB').closest('div');
      if (avatar) {
        await user.hover(avatar);

        await waitFor(() => {
          expect(screen.getByText('Payment pending')).toBeInTheDocument();
        }, { timeout: 1000 });
      }
    });

    it('hides tooltips when showTooltip is false', () => {
      render(<MemberContributionAvatars members={mockMembers} showTooltip={false} />);

      // TooltipProvider shouldn't be rendered
      const tooltipTriggers = document.querySelectorAll('[data-state]');
      expect(tooltipTriggers.length).toBe(0);
    });
  });

  describe('Avatar Overlap', () => {
    it('applies overlap margin to avatars after the first', () => {
      const { container } = render(<MemberContributionAvatars members={mockMembers} />);

      // First avatar should not have negative margin, subsequent ones should
      const avatarContainers = container.querySelectorAll('.relative');

      // Check that some avatars have overlap class
      const overlappedAvatars = container.querySelectorAll('.-ml-2\\.5');
      expect(overlappedAvatars.length).toBeGreaterThan(0);
    });
  });
});

describe('MemberContributionList Component', () => {
  const mockMembers = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      hasContributed: true,
      isRecipient: false,
      position: 1,
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      hasContributed: false,
      isRecipient: true,
      position: 2,
    },
    {
      id: '3',
      name: 'Bob Wilson',
      email: 'bob@example.com',
      hasContributed: true,
      isRecipient: false,
      position: 3,
    },
  ];

  describe('Rendering', () => {
    it('renders all members in list format', () => {
      render(<MemberContributionList members={mockMembers} contributionAmount={50} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(
        <MemberContributionList members={mockMembers} contributionAmount={50} className="custom-list" />
      );

      expect(container.querySelector('.custom-list')).toBeInTheDocument();
    });
  });

  describe('Progress Summary', () => {
    it('shows contribution progress label', () => {
      render(<MemberContributionList members={mockMembers} contributionAmount={50} />);

      expect(screen.getByText('Contribution Progress')).toBeInTheDocument();
    });

    it('shows correct member count', () => {
      render(<MemberContributionList members={mockMembers} contributionAmount={50} />);

      // 2 out of 3 contributed
      expect(screen.getByText(/2\/3 members/)).toBeInTheDocument();
    });

    it('shows correct contribution total', () => {
      render(<MemberContributionList members={mockMembers} contributionAmount={50} />);

      // 2 members * $50 = $100
      expect(screen.getByText(/\$100\.00/)).toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('renders progress bar', () => {
      const { container } = render(
        <MemberContributionList members={mockMembers} contributionAmount={50} />
      );

      expect(container.querySelector('.h-2.bg-gray-100.rounded-full')).toBeInTheDocument();
    });

    it('shows correct progress percentage', () => {
      const { container } = render(
        <MemberContributionList members={mockMembers} contributionAmount={50} />
      );

      const progressFill = container.querySelector('.bg-green-500');
      // 2/3 = 66.67%
      expect(progressFill).toHaveStyle('width: 66.66666666666666%');
    });
  });

  describe('Member List Items', () => {
    it('shows position for each member', () => {
      render(<MemberContributionList members={mockMembers} contributionAmount={50} />);

      expect(screen.getByText(/position 1/i)).toBeInTheDocument();
      expect(screen.getByText(/position 2/i)).toBeInTheDocument();
      expect(screen.getByText(/position 3/i)).toBeInTheDocument();
    });

    it('shows "Paid" status for members who contributed', () => {
      render(<MemberContributionList members={mockMembers} contributionAmount={50} />);

      const paidStatuses = screen.getAllByText('Paid');
      expect(paidStatuses.length).toBe(2); // John and Bob
    });

    it('shows "Pending" status for members who have not contributed', () => {
      render(<MemberContributionList members={mockMembers} contributionAmount={50} />);

      const pendingStatuses = screen.getAllByText('Pending');
      expect(pendingStatuses.length).toBe(1); // Jane (recipient)
    });

    it('shows "Receiving this round" for recipient', () => {
      render(<MemberContributionList members={mockMembers} contributionAmount={50} />);

      expect(screen.getByText(/receiving this round/i)).toBeInTheDocument();
    });

    it('highlights current user', () => {
      const { container } = render(
        <MemberContributionList
          members={mockMembers}
          contributionAmount={50}
          currentUserEmail="john@example.com"
        />
      );

      // Current user should have blue background
      expect(container.querySelector('.bg-blue-50')).toBeInTheDocument();
    });

    it('shows "You" badge for current user', () => {
      render(
        <MemberContributionList
          members={mockMembers}
          contributionAmount={50}
          currentUserEmail="john@example.com"
        />
      );

      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('shows recipient badge', () => {
      const { container } = render(
        <MemberContributionList members={mockMembers} contributionAmount={50} />
      );

      // Recipient should have award badge
      const recipientBadge = container.querySelector('.bg-blue-500');
      expect(recipientBadge).toBeInTheDocument();
    });
  });

  describe('Member Sorting', () => {
    it('sorts members by position', () => {
      const unsortedMembers = [
        { ...mockMembers[2], position: 3 },
        { ...mockMembers[0], position: 1 },
        { ...mockMembers[1], position: 2 },
      ];

      render(<MemberContributionList members={unsortedMembers} contributionAmount={50} />);

      const memberElements = screen.getAllByText(/position \d/i);
      expect(memberElements[0]).toHaveTextContent('Position 1');
      expect(memberElements[1]).toHaveTextContent('Position 2');
      expect(memberElements[2]).toHaveTextContent('Position 3');
    });
  });

  describe('Currency Formatting', () => {
    it('formats currency correctly', () => {
      render(<MemberContributionList members={mockMembers} contributionAmount={50} />);

      // Should show $100.00 (2 * $50)
      expect(screen.getByText(/\$100\.00/)).toBeInTheDocument();
    });

    it('handles large amounts', () => {
      const manyMembers = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        name: `Member ${i}`,
        email: `member${i}@example.com`,
        hasContributed: true,
        isRecipient: false,
        position: i + 1,
      }));

      render(<MemberContributionList members={manyMembers} contributionAmount={1000} />);

      // Should show $10,000.00
      expect(screen.getByText(/\$10,000\.00/)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('renders with empty members array', () => {
      render(<MemberContributionList members={[]} contributionAmount={50} />);

      expect(screen.getByText('Contribution Progress')).toBeInTheDocument();
      expect(screen.getByText(/0\/0 members/)).toBeInTheDocument();
    });
  });

  describe('Avatar Fallback Colors', () => {
    it('applies green fallback for contributed members', () => {
      const { container } = render(
        <MemberContributionList members={mockMembers} contributionAmount={50} />
      );

      const greenFallbacks = container.querySelectorAll('.bg-green-100');
      expect(greenFallbacks.length).toBe(2); // John and Bob
    });

    it('applies amber fallback for pending members', () => {
      const { container } = render(
        <MemberContributionList members={mockMembers} contributionAmount={50} />
      );

      const amberFallbacks = container.querySelectorAll('.bg-amber-100');
      expect(amberFallbacks.length).toBe(1); // Jane (pending recipient)
    });
  });
});
