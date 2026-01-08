/**
 * DiscussionCard Component Tests
 *
 * Tests for the DiscussionCard component used in pool discussions/activity feeds.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiscussionCard, DiscussionPost, DiscussionReply } from '@/components/discussions/DiscussionCard';

// Mock date-fns to avoid timezone issues in tests
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn((date) => '2 hours ago'),
}));

describe('DiscussionCard Component', () => {
  const mockPost: DiscussionPost = {
    id: 'post-1',
    content: 'This is a test discussion post about our pool.',
    author: {
      id: 'user-1',
      name: 'John Doe',
      avatar: 'https://example.com/avatar.jpg',
      role: 'member',
    },
    poolId: 'pool-1',
    poolName: 'Family Savings',
    createdAt: '2024-01-15T10:00:00Z',
    likes: 5,
    isLiked: false,
    isPinned: false,
    replyCount: 2,
    replies: [
      {
        id: 'reply-1',
        content: 'Great post!',
        author: {
          id: 'user-2',
          name: 'Jane Smith',
        },
        createdAt: '2024-01-15T11:00:00Z',
        likes: 1,
        isLiked: false,
      },
    ],
  };

  const mockCallbacks = {
    onLike: jest.fn(),
    onReply: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onPin: jest.fn(),
    onReport: jest.fn(),
    onShare: jest.fn(),
    onUserClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders post content correctly', () => {
      render(<DiscussionCard post={mockPost} {...mockCallbacks} />);

      expect(screen.getByText('This is a test discussion post about our pool.')).toBeInTheDocument();
    });

    it('renders author name', () => {
      render(<DiscussionCard post={mockPost} {...mockCallbacks} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('renders avatar with fallback initials', () => {
      const postWithoutAvatar = {
        ...mockPost,
        author: { ...mockPost.author, avatar: undefined },
      };

      render(<DiscussionCard post={postWithoutAvatar} {...mockCallbacks} />);

      expect(screen.getByText('JD')).toBeInTheDocument(); // John Doe initials
    });

    it('renders timestamp', () => {
      render(<DiscussionCard post={mockPost} {...mockCallbacks} />);

      expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    });

    it('renders like count when greater than 0', () => {
      render(<DiscussionCard post={mockPost} {...mockCallbacks} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders "Like" when like count is 0', () => {
      const postWithNoLikes = { ...mockPost, likes: 0 };

      render(<DiscussionCard post={postWithNoLikes} {...mockCallbacks} />);

      expect(screen.getByText('Like')).toBeInTheDocument();
    });

    it('renders reply count when greater than 0', () => {
      render(<DiscussionCard post={mockPost} {...mockCallbacks} />);

      expect(screen.getByText('2 replies')).toBeInTheDocument();
    });

    it('renders singular "reply" when count is 1', () => {
      const postWithOneReply = { ...mockPost, replyCount: 1 };

      render(<DiscussionCard post={postWithOneReply} {...mockCallbacks} />);

      expect(screen.getByText('1 reply')).toBeInTheDocument();
    });

    it('shows pool name when showPoolName is true', () => {
      render(<DiscussionCard post={mockPost} showPoolName={true} {...mockCallbacks} />);

      expect(screen.getByText('Family Savings')).toBeInTheDocument();
    });

    it('hides pool name when showPoolName is false', () => {
      render(<DiscussionCard post={mockPost} showPoolName={false} {...mockCallbacks} />);

      expect(screen.queryByText('Family Savings')).not.toBeInTheDocument();
    });
  });

  describe('Pinned Posts', () => {
    it('shows pinned indicator for pinned posts', () => {
      const pinnedPost = { ...mockPost, isPinned: true };

      render(<DiscussionCard post={pinnedPost} {...mockCallbacks} />);

      expect(screen.getByText('Pinned post')).toBeInTheDocument();
    });

    it('applies pinned styling to card', () => {
      const pinnedPost = { ...mockPost, isPinned: true };

      const { container } = render(<DiscussionCard post={pinnedPost} {...mockCallbacks} />);

      // Check for border-blue-200 class on the card
      expect(container.firstChild).toHaveClass('border-blue-200');
    });

    it('does not show pinned indicator for non-pinned posts', () => {
      render(<DiscussionCard post={mockPost} {...mockCallbacks} />);

      expect(screen.queryByText('Pinned post')).not.toBeInTheDocument();
    });
  });

  describe('Edited Posts', () => {
    it('shows edited indicator when post has been updated', () => {
      const editedPost = {
        ...mockPost,
        updatedAt: '2024-01-15T12:00:00Z', // Different from createdAt
      };

      render(<DiscussionCard post={editedPost} {...mockCallbacks} />);

      expect(screen.getByText('(edited)')).toBeInTheDocument();
    });

    it('does not show edited indicator when timestamps match', () => {
      const uneditedPost = {
        ...mockPost,
        updatedAt: mockPost.createdAt,
      };

      render(<DiscussionCard post={uneditedPost} {...mockCallbacks} />);

      expect(screen.queryByText('(edited)')).not.toBeInTheDocument();
    });
  });

  describe('Role Badges', () => {
    it('shows Admin badge for admin role', () => {
      const adminPost = {
        ...mockPost,
        author: { ...mockPost.author, role: 'admin' as const },
      };

      render(<DiscussionCard post={adminPost} {...mockCallbacks} />);

      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('shows Creator badge for creator role', () => {
      const creatorPost = {
        ...mockPost,
        author: { ...mockPost.author, role: 'creator' as const },
      };

      render(<DiscussionCard post={creatorPost} {...mockCallbacks} />);

      expect(screen.getByText('Creator')).toBeInTheDocument();
    });

    it('does not show badge for member role', () => {
      render(<DiscussionCard post={mockPost} {...mockCallbacks} />);

      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
      expect(screen.queryByText('Creator')).not.toBeInTheDocument();
    });
  });

  describe('Like Functionality', () => {
    it('calls onLike when like button is clicked', async () => {
      render(<DiscussionCard post={mockPost} {...mockCallbacks} />);

      const likeButton = screen.getByText('5').closest('button');
      if (likeButton) {
        fireEvent.click(likeButton);
      }

      expect(mockCallbacks.onLike).toHaveBeenCalledWith('post-1');
    });

    it('shows filled heart when post is liked', () => {
      const likedPost = { ...mockPost, isLiked: true };

      render(<DiscussionCard post={likedPost} {...mockCallbacks} />);

      // The heart should have fill-current class when liked
      const heartIcon = document.querySelector('.fill-current');
      expect(heartIcon).toBeInTheDocument();
    });
  });

  describe('Reply Functionality', () => {
    it('shows reply input when Reply button is clicked', async () => {
      const user = userEvent.setup();

      render(<DiscussionCard post={mockPost} {...mockCallbacks} />);

      const replyButton = screen.getByText('Reply');
      await user.click(replyButton);

      expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument();
    });

    it('hides reply input when Cancel is clicked', async () => {
      const user = userEvent.setup();

      render(<DiscussionCard post={mockPost} {...mockCallbacks} />);

      await user.click(screen.getByText('Reply'));
      expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument();

      await user.click(screen.getByText('Cancel'));
      expect(screen.queryByPlaceholderText('Write a reply...')).not.toBeInTheDocument();
    });

    it('calls onReply with correct content when submitted', async () => {
      const user = userEvent.setup();

      render(<DiscussionCard post={mockPost} {...mockCallbacks} />);

      await user.click(screen.getByText('Reply'));
      await user.type(screen.getByPlaceholderText('Write a reply...'), 'This is my reply');

      // Find the submit button (second "Reply" button)
      const buttons = screen.getAllByRole('button', { name: /reply/i });
      const submitButton = buttons[buttons.length - 1];
      await user.click(submitButton);

      expect(mockCallbacks.onReply).toHaveBeenCalledWith('post-1', 'This is my reply');
    });

    it('disables submit button when reply is empty', async () => {
      const user = userEvent.setup();

      render(<DiscussionCard post={mockPost} {...mockCallbacks} />);

      await user.click(screen.getByText('Reply'));

      const buttons = screen.getAllByRole('button', { name: /reply/i });
      const submitButton = buttons[buttons.length - 1];

      expect(submitButton).toBeDisabled();
    });

    it('toggles replies visibility when reply count is clicked', async () => {
      const user = userEvent.setup();

      render(<DiscussionCard post={mockPost} {...mockCallbacks} />);

      // Initially replies should be hidden
      expect(screen.queryByText('Great post!')).not.toBeInTheDocument();

      // Click to show replies
      await user.click(screen.getByText('2 replies'));

      // Replies should now be visible
      expect(screen.getByText('Great post!')).toBeInTheDocument();
    });
  });

  describe('Author Actions (Own Post)', () => {
    it('shows Edit option for own post', async () => {
      const user = userEvent.setup();

      render(
        <DiscussionCard
          post={mockPost}
          currentUserId="user-1"
          {...mockCallbacks}
        />
      );

      // Open dropdown menu
      const moreButton = screen.getByRole('button', { name: /post options/i });
      await user.click(moreButton);

      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('shows Delete option for own post', async () => {
      const user = userEvent.setup();

      render(
        <DiscussionCard
          post={mockPost}
          currentUserId="user-1"
          {...mockCallbacks}
        />
      );

      const moreButton = screen.getByRole('button', { name: /post options/i });
      await user.click(moreButton);

      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('does not show Report option for own post', async () => {
      const user = userEvent.setup();

      render(
        <DiscussionCard
          post={mockPost}
          currentUserId="user-1"
          {...mockCallbacks}
        />
      );

      const moreButton = screen.getByRole('button', { name: /post options/i });
      await user.click(moreButton);

      expect(screen.queryByText('Report')).not.toBeInTheDocument();
    });
  });

  describe('Other User Actions', () => {
    it('shows Report option for other users posts', async () => {
      const user = userEvent.setup();

      render(
        <DiscussionCard
          post={mockPost}
          currentUserId="user-999"
          {...mockCallbacks}
        />
      );

      const moreButton = screen.getByRole('button', { name: /post options/i });
      await user.click(moreButton);

      expect(screen.getByText('Report')).toBeInTheDocument();
    });

    it('does not show Edit option for other users posts', async () => {
      const user = userEvent.setup();

      render(
        <DiscussionCard
          post={mockPost}
          currentUserId="user-999"
          {...mockCallbacks}
        />
      );

      const moreButton = screen.getByRole('button', { name: /post options/i });
      await user.click(moreButton);

      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });
  });

  describe('Admin Actions', () => {
    it('shows Pin option for admin', async () => {
      const user = userEvent.setup();

      render(
        <DiscussionCard
          post={mockPost}
          currentUserId="user-999"
          isAdmin={true}
          {...mockCallbacks}
        />
      );

      const moreButton = screen.getByRole('button', { name: /post options/i });
      await user.click(moreButton);

      expect(screen.getByText('Pin post')).toBeInTheDocument();
    });

    it('shows Unpin option for pinned posts', async () => {
      const user = userEvent.setup();
      const pinnedPost = { ...mockPost, isPinned: true };

      render(
        <DiscussionCard
          post={pinnedPost}
          currentUserId="user-999"
          isAdmin={true}
          {...mockCallbacks}
        />
      );

      const moreButton = screen.getByRole('button', { name: /post options/i });
      await user.click(moreButton);

      expect(screen.getByText('Unpin post')).toBeInTheDocument();
    });

    it('shows Delete option for admin on any post', async () => {
      const user = userEvent.setup();

      render(
        <DiscussionCard
          post={mockPost}
          currentUserId="user-999"
          isAdmin={true}
          {...mockCallbacks}
        />
      );

      const moreButton = screen.getByRole('button', { name: /post options/i });
      await user.click(moreButton);

      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  describe('Share Functionality', () => {
    it('shows Share option in menu', async () => {
      const user = userEvent.setup();

      render(<DiscussionCard post={mockPost} {...mockCallbacks} />);

      const moreButton = screen.getByRole('button', { name: /post options/i });
      await user.click(moreButton);

      expect(screen.getByText('Share')).toBeInTheDocument();
    });

    it('calls onShare when Share is clicked', async () => {
      const user = userEvent.setup();

      render(<DiscussionCard post={mockPost} {...mockCallbacks} />);

      const moreButton = screen.getByRole('button', { name: /post options/i });
      await user.click(moreButton);
      await user.click(screen.getByText('Share'));

      expect(mockCallbacks.onShare).toHaveBeenCalledWith('post-1');
    });
  });

  describe('Mentions', () => {
    it('renders mentions with special styling', () => {
      const postWithMentions = {
        ...mockPost,
        content: 'Hey @JaneSmith, check this out!',
        mentions: ['JaneSmith'],
      };

      render(<DiscussionCard post={postWithMentions} {...mockCallbacks} />);

      const mention = screen.getByText('@JaneSmith');
      expect(mention).toHaveClass('text-blue-600');
    });

    it('calls onUserClick when mention is clicked', async () => {
      const user = userEvent.setup();
      const postWithMentions = {
        ...mockPost,
        content: 'Hey @JaneSmith, check this out!',
        mentions: ['JaneSmith'],
      };

      render(<DiscussionCard post={postWithMentions} {...mockCallbacks} />);

      await user.click(screen.getByText('@JaneSmith'));

      expect(mockCallbacks.onUserClick).toHaveBeenCalledWith('JaneSmith');
    });
  });

  describe('User Click Handlers', () => {
    it('calls onUserClick when author name is clicked', async () => {
      const user = userEvent.setup();

      render(<DiscussionCard post={mockPost} {...mockCallbacks} />);

      await user.click(screen.getByText('John Doe'));

      expect(mockCallbacks.onUserClick).toHaveBeenCalledWith('user-1');
    });
  });

  describe('Delete Confirmation', () => {
    it('shows confirmation dialog before delete', async () => {
      const user = userEvent.setup();
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <DiscussionCard
          post={mockPost}
          currentUserId="user-1"
          {...mockCallbacks}
        />
      );

      const moreButton = screen.getByRole('button', { name: /post options/i });
      await user.click(moreButton);
      await user.click(screen.getByText('Delete'));

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this post?');
      expect(mockCallbacks.onDelete).toHaveBeenCalledWith('post-1');

      confirmSpy.mockRestore();
    });

    it('does not delete when confirmation is cancelled', async () => {
      const user = userEvent.setup();
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <DiscussionCard
          post={mockPost}
          currentUserId="user-1"
          {...mockCallbacks}
        />
      );

      const moreButton = screen.getByRole('button', { name: /post options/i });
      await user.click(moreButton);
      await user.click(screen.getByText('Delete'));

      expect(mockCallbacks.onDelete).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has accessible button labels', () => {
      render(<DiscussionCard post={mockPost} {...mockCallbacks} />);

      expect(screen.getByRole('button', { name: /post options/i })).toBeInTheDocument();
    });
  });
});
