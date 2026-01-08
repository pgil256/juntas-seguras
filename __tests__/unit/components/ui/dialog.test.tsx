/**
 * Dialog Component Tests
 *
 * Tests for the Dialog component built on Radix UI Dialog primitive.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';

// Mock ResizeObserver for Radix UI
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('Dialog Component', () => {
  describe('Rendering', () => {
    it('renders trigger button', () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByRole('button', { name: /open dialog/i })).toBeInTheDocument();
    });

    it('does not render content when closed', () => {
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Hidden Title</DialogTitle>
            <DialogDescription>Hidden content</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      expect(screen.queryByText('Hidden Title')).not.toBeInTheDocument();
    });

    it('renders content when open', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Visible Title</DialogTitle>
            <DialogDescription>Visible content</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        expect(screen.getByText('Visible Title')).toBeInTheDocument();
      });
    });

    it('renders with controlled open state', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogTitle>Controlled Dialog</DialogTitle>
            <DialogDescription>This is controlled</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Controlled Dialog')).toBeInTheDocument();
    });
  });

  describe('Open/Close Behavior', () => {
    it('opens when trigger is clicked', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog Description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('closes when escape key is pressed', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Content</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('calls onOpenChange when state changes', async () => {
      const handleOpenChange = jest.fn();
      const user = userEvent.setup();

      render(
        <Dialog onOpenChange={handleOpenChange}>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Content</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      expect(handleOpenChange).toHaveBeenCalledWith(true);
    });
  });

  describe('DialogHeader', () => {
    it('renders with flex column layout', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader data-testid="header">
              <DialogTitle>Title</DialogTitle>
              <DialogDescription>Description</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        const header = screen.getByTestId('header');
        expect(header).toHaveClass('flex');
        expect(header).toHaveClass('flex-col');
        expect(header).toHaveClass('space-y-1.5');
      });
    });
  });

  describe('DialogFooter', () => {
    it('renders with responsive flex layout', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
            <DialogFooter data-testid="footer">
              <button>Cancel</button>
              <button>Confirm</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        const footer = screen.getByTestId('footer');
        expect(footer).toHaveClass('flex');
        expect(footer).toHaveClass('flex-col-reverse');
        expect(footer).toHaveClass('sm:flex-row');
      });
    });

    it('renders footer buttons', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>Are you sure?</DialogDescription>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
              <button>Confirm</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
      });
    });
  });

  describe('DialogTitle', () => {
    it('renders with correct styling', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle data-testid="title">Important Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        const title = screen.getByTestId('title');
        expect(title).toHaveClass('text-lg');
        expect(title).toHaveClass('font-semibold');
      });
    });
  });

  describe('DialogDescription', () => {
    it('renders with muted text styling', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription data-testid="desc">
              This is a description
            </DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        const desc = screen.getByTestId('desc');
        expect(desc).toHaveClass('text-sm');
        expect(desc).toHaveClass('text-gray-500');
      });
    });
  });

  describe('Accessibility', () => {
    it('has dialog role', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Accessible Dialog</DialogTitle>
            <DialogDescription>This dialog is accessible</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('associates title with dialog via aria-labelledby', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog Description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-labelledby');
      });
    });

    it('associates description with dialog via aria-describedby', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description for the dialog</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-describedby');
      });
    });
  });

  describe('Dialog Composition', () => {
    it('renders complete dialog with all parts', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open Complete Dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Dialog</DialogTitle>
              <DialogDescription>
                This dialog has all the standard parts
              </DialogDescription>
            </DialogHeader>
            <div>Main content goes here</div>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
              <button>Submit</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open complete/i }));

      await waitFor(() => {
        expect(screen.getByText('Complete Dialog')).toBeInTheDocument();
        expect(screen.getByText('This dialog has all the standard parts')).toBeInTheDocument();
        expect(screen.getByText('Main content goes here')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
      });
    });
  });
});
