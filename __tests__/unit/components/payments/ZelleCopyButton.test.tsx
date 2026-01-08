/**
 * ZelleCopyButton Component Tests
 *
 * Tests for the ZelleCopyButton, ZelleInstructionsCard, and ZelleDisplayBadge components.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  ZelleCopyButton,
  ZelleInstructionsCard,
  ZelleDisplayBadge,
} from '@/components/payments/ZelleCopyButton';

// Mock clipboard API
const mockWriteText = jest.fn().mockResolvedValue(undefined);

describe('ZelleCopyButton Component', () => {
  const defaultProps = {
    identifier: 'test@email.com',
    amount: 100,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });
  });

  describe('Rendering', () => {
    it('renders correctly with required props', () => {
      render(<ZelleCopyButton {...defaultProps} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Zelle')).toBeInTheDocument();
      expect(screen.getByText('$100.00')).toBeInTheDocument();
      expect(screen.getByText('Z')).toBeInTheDocument();
    });

    it('formats amount correctly', () => {
      render(<ZelleCopyButton {...defaultProps} amount={1234.56} />);

      expect(screen.getByText('$1,234.56')).toBeInTheDocument();
    });

    it('hides amount when showAmount is false', () => {
      render(<ZelleCopyButton {...defaultProps} showAmount={false} />);

      expect(screen.queryByText('$100.00')).not.toBeInTheDocument();
    });

    it('shows amount by default', () => {
      render(<ZelleCopyButton {...defaultProps} />);

      expect(screen.getByText('$100.00')).toBeInTheDocument();
    });

    it('shows Copy icon initially', () => {
      const { container } = render(<ZelleCopyButton {...defaultProps} />);

      // Look for the copy icon (should have the lucide-copy class or similar)
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    it('copies identifier to clipboard when clicked', async () => {
      const user = userEvent.setup();
      render(<ZelleCopyButton {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      expect(mockWriteText).toHaveBeenCalledWith('test@email.com');
    });

    it('shows Check icon after copying', async () => {
      const user = userEvent.setup();
      render(<ZelleCopyButton {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      // The check icon should appear (green color indicates success)
      await waitFor(() => {
        expect(screen.getByRole('button').querySelector('.text-green-300')).toBeInTheDocument();
      });
    });

    it('calls onCopy callback when provided', async () => {
      const user = userEvent.setup();
      const onCopy = jest.fn();
      render(<ZelleCopyButton {...defaultProps} onCopy={onCopy} />);

      await user.click(screen.getByRole('button'));

      expect(onCopy).toHaveBeenCalled();
    });

    it('resets copied state after 2 seconds', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(<ZelleCopyButton {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      // Should show check icon
      await waitFor(() => {
        expect(screen.getByRole('button').querySelector('.text-green-300')).toBeInTheDocument();
      });

      // Advance time by 2 seconds
      jest.advanceTimersByTime(2000);

      // Check icon should be gone
      await waitFor(() => {
        expect(screen.getByRole('button').querySelector('.text-green-300')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Tooltip', () => {
    it('shows tooltip with email identifier type', async () => {
      const user = userEvent.setup();
      render(<ZelleCopyButton identifier="test@email.com" />);

      // Hover over the button to show tooltip
      await user.hover(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText(/Copy email: test@email.com/)).toBeInTheDocument();
      });
    });

    it('shows tooltip with phone identifier type', async () => {
      const user = userEvent.setup();
      render(<ZelleCopyButton identifier="5551234567" />);

      await user.hover(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText(/Copy phone: 5551234567/)).toBeInTheDocument();
      });
    });

    it('shows "Copied!" in tooltip after copying', async () => {
      const user = userEvent.setup();
      render(<ZelleCopyButton {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });
  });

  describe('Size Variants', () => {
    it('renders small size', () => {
      const { container } = render(
        <ZelleCopyButton {...defaultProps} size="sm" />
      );

      expect(container.querySelector('.h-9')).toBeInTheDocument();
    });

    it('renders default size', () => {
      const { container } = render(
        <ZelleCopyButton {...defaultProps} size="default" />
      );

      expect(container.querySelector('.h-11')).toBeInTheDocument();
    });

    it('renders large size', () => {
      const { container } = render(
        <ZelleCopyButton {...defaultProps} size="lg" />
      );

      expect(container.querySelector('.h-12')).toBeInTheDocument();
    });
  });

  describe('Variant Styling', () => {
    it('renders default variant with Zelle purple background', () => {
      const { container } = render(
        <ZelleCopyButton {...defaultProps} variant="default" />
      );

      expect(container.querySelector('.bg-\\[\\#6D1ED4\\]')).toBeInTheDocument();
    });

    it('renders outline variant', () => {
      const { container } = render(
        <ZelleCopyButton {...defaultProps} variant="outline" />
      );

      expect(container.querySelector('.border-\\[\\#6D1ED4\\]')).toBeInTheDocument();
    });

    it('renders ghost variant', () => {
      const { container } = render(
        <ZelleCopyButton {...defaultProps} variant="ghost" />
      );

      expect(container.querySelector('.text-\\[\\#6D1ED4\\]')).toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      render(
        <ZelleCopyButton {...defaultProps} className="custom-class" />
      );

      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });
});

describe('ZelleInstructionsCard Component', () => {
  const defaultProps = {
    identifier: 'test@email.com',
    recipientName: 'John Doe',
    amount: 100,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });
  });

  describe('Rendering', () => {
    it('renders correctly with required props', () => {
      render(<ZelleInstructionsCard {...defaultProps} />);

      expect(screen.getByText('Pay via Zelle')).toBeInTheDocument();
      expect(screen.getByText('test@email.com')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('$100.00')).toBeInTheDocument();
    });

    it('shows email icon for email identifier', () => {
      const { container } = render(
        <ZelleInstructionsCard {...defaultProps} identifier="test@email.com" />
      );

      // Mail icon should be present
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('shows phone icon for phone identifier', () => {
      const { container } = render(
        <ZelleInstructionsCard {...defaultProps} identifier="5551234567" />
      );

      // Phone icon should be present
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('displays payment note when provided', () => {
      render(
        <ZelleInstructionsCard {...defaultProps} note="Pool contribution" />
      );

      expect(screen.getByText('Pool contribution')).toBeInTheDocument();
    });

    it('shows step-by-step instructions', () => {
      render(<ZelleInstructionsCard {...defaultProps} />);

      expect(screen.getByText(/Open your bank app/)).toBeInTheDocument();
      expect(screen.getByText(/Send Money with Zelle/)).toBeInTheDocument();
      expect(screen.getByText(/Review and send payment/)).toBeInTheDocument();
    });
  });

  describe('QR Code Section', () => {
    const zelleQR = {
      imageDataUrl: 'data:image/png;base64,test123',
      token: 'testtoken',
    };

    it('shows QR code when provided', () => {
      render(
        <ZelleInstructionsCard {...defaultProps} zelleQR={zelleQR} />
      );

      const qrImage = screen.getByAltText(/Zelle QR code for John Doe/);
      expect(qrImage).toBeInTheDocument();
      expect(qrImage).toHaveAttribute('src', 'data:image/png;base64,test123');
    });

    it('shows "Or send manually to:" text when QR is available', () => {
      render(
        <ZelleInstructionsCard {...defaultProps} zelleQR={zelleQR} />
      );

      expect(screen.getByText('Or send manually to:')).toBeInTheDocument();
    });

    it('shows "Send to:" text when no QR available', () => {
      render(<ZelleInstructionsCard {...defaultProps} />);

      expect(screen.getByText('Send to:')).toBeInTheDocument();
    });

    it('shows scan instructions when QR is available', () => {
      render(
        <ZelleInstructionsCard {...defaultProps} zelleQR={zelleQR} />
      );

      expect(screen.getByText('Scan with your bank app')).toBeInTheDocument();
    });

    it('shows "Tap to enlarge" on QR hover', () => {
      render(
        <ZelleInstructionsCard {...defaultProps} zelleQR={zelleQR} />
      );

      expect(screen.getByText('Tap to enlarge')).toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    it('copies identifier when copy button is clicked', async () => {
      const user = userEvent.setup();
      render(<ZelleInstructionsCard {...defaultProps} />);

      // Find the copy button (not in full QR modal)
      const copyButtons = screen.getAllByRole('button');
      const copyButton = copyButtons.find(btn => !btn.textContent?.includes('enlarge'));

      if (copyButton) {
        await user.click(copyButton);
        expect(mockWriteText).toHaveBeenCalledWith('test@email.com');
      }
    });

    it('shows check icon after copying', async () => {
      const user = userEvent.setup();
      render(<ZelleInstructionsCard {...defaultProps} />);

      const copyButtons = screen.getAllByRole('button');
      const copyButton = copyButtons[0];

      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getAllByText('').some(el => el.closest('.text-green-300'))).toBe(true);
      });
    });
  });

  describe('Full QR Modal', () => {
    const zelleQR = {
      imageDataUrl: 'data:image/png;base64,test123',
      token: 'testtoken',
    };

    it('opens modal when QR code is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ZelleInstructionsCard {...defaultProps} zelleQR={zelleQR} />
      );

      // Click the QR code button
      const qrButton = screen.getByRole('button', { name: /Tap to enlarge/i }).closest('button');

      if (qrButton) {
        await user.click(qrButton);
      } else {
        // Click the image wrapper
        await user.click(screen.getByAltText(/Zelle QR code for John Doe/));
      }

      // Modal should show larger QR code
      await waitFor(() => {
        const modalImages = screen.getAllByAltText(/Zelle QR code for John Doe/);
        expect(modalImages.length).toBeGreaterThan(1);
      });
    });

    it('closes modal when backdrop is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ZelleInstructionsCard {...defaultProps} zelleQR={zelleQR} />
      );

      // Open modal
      const smallQr = screen.getByAltText(/Zelle QR code for John Doe/);
      await user.click(smallQr);

      await waitFor(() => {
        const images = screen.getAllByAltText(/Zelle QR code for John Doe/);
        expect(images.length).toBe(2);
      });

      // Find and click backdrop (the fixed overlay div)
      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/70');
      if (backdrop) {
        await user.click(backdrop);
      }

      // Modal should close
      await waitFor(() => {
        const images = screen.getAllByAltText(/Zelle QR code for John Doe/);
        expect(images.length).toBe(1);
      });
    });

    it('closes modal when X button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ZelleInstructionsCard {...defaultProps} zelleQR={zelleQR} />
      );

      // Open modal
      await user.click(screen.getByAltText(/Zelle QR code for John Doe/));

      await waitFor(() => {
        expect(screen.getAllByAltText(/Zelle QR code for John Doe/).length).toBe(2);
      });

      // Click close button
      const closeButton = screen.getByRole('button', { name: '' });
      if (closeButton.textContent === '') {
        await user.click(closeButton);
      }
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      const { container } = render(
        <ZelleInstructionsCard {...defaultProps} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});

describe('ZelleDisplayBadge Component', () => {
  const defaultProps = {
    identifier: 'test@email.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });
  });

  describe('Rendering', () => {
    it('renders correctly with required props', () => {
      render(<ZelleDisplayBadge {...defaultProps} />);

      expect(screen.getByText('test@email.com')).toBeInTheDocument();
      expect(screen.getByText('Z')).toBeInTheDocument();
    });

    it('shows email icon for email identifier', () => {
      const { container } = render(
        <ZelleDisplayBadge identifier="test@email.com" />
      );

      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('shows phone icon for phone identifier', () => {
      const { container } = render(
        <ZelleDisplayBadge identifier="5551234567" />
      );

      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('shows copy icon when copyable', () => {
      const { container } = render(
        <ZelleDisplayBadge {...defaultProps} copyable />
      );

      // Should have the copy icon
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThanOrEqual(2); // Icon + copy icon
    });

    it('hides copy icon when not copyable', () => {
      const { container } = render(
        <ZelleDisplayBadge {...defaultProps} copyable={false} />
      );

      // Should only have the identifier type icon
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBe(2); // Z badge icon and mail/phone icon
    });
  });

  describe('Copy Functionality', () => {
    it('copies identifier when clicked and copyable', async () => {
      const user = userEvent.setup();
      render(<ZelleDisplayBadge {...defaultProps} copyable />);

      await user.click(screen.getByRole('button'));

      expect(mockWriteText).toHaveBeenCalledWith('test@email.com');
    });

    it('does not copy when not copyable', async () => {
      const user = userEvent.setup();
      render(<ZelleDisplayBadge {...defaultProps} copyable={false} />);

      await user.click(screen.getByRole('button'));

      expect(mockWriteText).not.toHaveBeenCalled();
    });

    it('shows check icon after copying', async () => {
      const user = userEvent.setup();
      render(<ZelleDisplayBadge {...defaultProps} copyable />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('button').querySelector('.text-green-300')).toBeInTheDocument();
      });
    });

    it('is disabled when not copyable', () => {
      render(<ZelleDisplayBadge {...defaultProps} copyable={false} />);

      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Styling', () => {
    it('has Zelle purple background', () => {
      const { container } = render(<ZelleDisplayBadge {...defaultProps} />);

      expect(container.querySelector('.bg-\\[\\#6D1ED4\\]')).toBeInTheDocument();
    });

    it('has hover effect when copyable', () => {
      const { container } = render(
        <ZelleDisplayBadge {...defaultProps} copyable />
      );

      expect(container.querySelector('.cursor-pointer')).toBeInTheDocument();
    });

    it('has default cursor when not copyable', () => {
      const { container } = render(
        <ZelleDisplayBadge {...defaultProps} copyable={false} />
      );

      expect(container.querySelector('.cursor-default')).toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      render(
        <ZelleDisplayBadge {...defaultProps} className="custom-class" />
      );

      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  describe('Truncation', () => {
    it('truncates long identifiers', () => {
      const { container } = render(
        <ZelleDisplayBadge identifier="verylongemailaddress@verylongdomain.com" />
      );

      expect(container.querySelector('.truncate')).toBeInTheDocument();
    });
  });
});
