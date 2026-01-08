/**
 * ProtectedPage Component Tests
 *
 * Tests for the ProtectedPage component that guards routes requiring authentication.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ProtectedPage from '@/components/auth/ProtectedPage';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

import { useSession } from 'next-auth/react';

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

describe('ProtectedPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading spinner when session is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      const { container } = render(
        <ProtectedPage>
          <div>Protected Content</div>
        </ProtectedPage>
      );

      // Should show loading spinner
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('shows "Loading..." text', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      render(
        <ProtectedPage>
          <div>Protected Content</div>
        </ProtectedPage>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('does not show children while loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      render(
        <ProtectedPage>
          <div>Protected Content</div>
        </ProtectedPage>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('does not redirect while loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      render(
        <ProtectedPage>
          <div>Protected Content</div>
        </ProtectedPage>
      );

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Unauthenticated State', () => {
    it('redirects to signin page when unauthenticated', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      render(
        <ProtectedPage>
          <div>Protected Content</div>
        </ProtectedPage>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin');
      });
    });

    it('does not show children when unauthenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      render(
        <ProtectedPage>
          <div>Protected Content</div>
        </ProtectedPage>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('returns null when unauthenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      const { container } = render(
        <ProtectedPage>
          <div>Protected Content</div>
        </ProtectedPage>
      );

      // After redirecting, renders nothing
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Authenticated State', () => {
    it('renders children when authenticated', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user-1',
            email: 'user@example.com',
            name: 'Test User',
          },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      render(
        <ProtectedPage>
          <div>Protected Content</div>
        </ProtectedPage>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('does not redirect when authenticated', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user-1',
            email: 'user@example.com',
            name: 'Test User',
          },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      render(
        <ProtectedPage>
          <div>Protected Content</div>
        </ProtectedPage>
      );

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('does not show loading spinner when authenticated', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user-1',
            email: 'user@example.com',
            name: 'Test User',
          },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      const { container } = render(
        <ProtectedPage>
          <div>Protected Content</div>
        </ProtectedPage>
      );

      expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
    });

    it('renders complex children correctly', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user-1',
            email: 'user@example.com',
            name: 'Test User',
          },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      render(
        <ProtectedPage>
          <div>
            <h1>Dashboard</h1>
            <p>Welcome back!</p>
            <button>Action</button>
          </div>
        </ProtectedPage>
      );

      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByText('Welcome back!')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
    });
  });

  describe('State Transitions', () => {
    it('transitions from loading to authenticated', async () => {
      // Start loading
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      const { rerender } = render(
        <ProtectedPage>
          <div>Protected Content</div>
        </ProtectedPage>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Transition to authenticated
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user-1',
            email: 'user@example.com',
            name: 'Test User',
          },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });

      rerender(
        <ProtectedPage>
          <div>Protected Content</div>
        </ProtectedPage>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('transitions from loading to unauthenticated', async () => {
      // Start loading
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      const { rerender } = render(
        <ProtectedPage>
          <div>Protected Content</div>
        </ProtectedPage>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Transition to unauthenticated
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      rerender(
        <ProtectedPage>
          <div>Protected Content</div>
        </ProtectedPage>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin');
      });
    });
  });

  describe('Layout', () => {
    it('centers loading spinner', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      const { container } = render(
        <ProtectedPage>
          <div>Protected Content</div>
        </ProtectedPage>
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('min-h-screen');
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('justify-center');
    });
  });
});
