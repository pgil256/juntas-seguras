/**
 * ZelleQrDisplay Component Tests
 *
 * Tests for the ZelleQrDisplay, ZelleQrBadge, and ZelleQrCard components.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  ZelleQrDisplay,
  ZelleQrBadge,
  ZelleQrCard,
} from '@/components/payments/ZelleQrDisplay';

// Mock clipboard API
const mockWriteText = jest.fn().mockResolvedValue(undefined);

describe('ZelleQrDisplay Component', () => {
  const zelleQRData = {
    imageDataUrl: 'data:image/png;base64,testQRCode123',
    rawContent: 'zelle:test@email.com',
    token: 'testtoken',
    uploadedAt: '2025-01-01T00:00:00.000Z',
  };

  const defaultProps = {
    zelleQR: zelleQRData,
    zelleIdentifier: 'test@email.com',
    recipientName: 'John Doe',
    amount: 100,
    note: 'Test payment',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });
  });

  describe('Rendering with QR Code', () => {
    it('renders QR code image when zelleQR is provided', () => {
      render(<ZelleQrDisplay {...defaultProps} />);

      const qrImage = screen.getByAltText(/Zelle QR code for John Doe/);
      expect(qrImage).toBeInTheDocument();
      expect(qrImage).toHaveAttribute('src', 'data:image/png;base64,testQRCode123');
    });

    it('displays Zelle label', () => {
      render(<ZelleQrDisplay {...defaultProps} />);

      expect(screen.getByText('Zelle')).toBeInTheDocument();
    });

    it('displays recipient name', () => {
      render(<ZelleQrDisplay {...defaultProps} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Pay')).toBeInTheDocument();
    });

    it('displays formatted amount', () => {
      render(<ZelleQrDisplay {...defaultProps} />);

      expect(screen.getByText('$100.00')).toBeInTheDocument();
    });

    it('displays note when provided', () => {
      render(<ZelleQrDisplay {...defaultProps} />);

      expect(screen.getByText('Test payment')).toBeInTheDocument();
    });

    it('shows scan instructions', () => {
      render(<ZelleQrDisplay {...defaultProps} />);

      expect(screen.getByText('Scan with your Zelle app')).toBeInTheDocument();
    });

    it('shows fallback identifier link', () => {
      render(<ZelleQrDisplay {...defaultProps} />);

      expect(screen.getByText('or send to')).toBeInTheDocument();
      expect(screen.getByText('test@email.com')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('renders small size QR code', () => {
      render(<ZelleQrDisplay {...defaultProps} size="small" />);

      const qrImage = screen.getByAltText(/Zelle QR code/);
      expect(qrImage).toHaveAttribute('width', '128');
      expect(qrImage).toHaveAttribute('height', '128');
    });

    it('renders medium size QR code (default)', () => {
      render(<ZelleQrDisplay {...defaultProps} size="medium" />);

      const qrImage = screen.getByAltText(/Zelle QR code/);
      expect(qrImage).toHaveAttribute('width', '200');
      expect(qrImage).toHaveAttribute('height', '200');
    });

    it('renders large size QR code', () => {
      render(<ZelleQrDisplay {...defaultProps} size="large" />);

      const qrImage = screen.getByAltText(/Zelle QR code/);
      expect(qrImage).toHaveAttribute('width', '300');
      expect(qrImage).toHaveAttribute('height', '300');
    });
  });

  describe('No QR Code - Identifier Only', () => {
    it('shows identifier-based interface when no QR code', () => {
      render(
        <ZelleQrDisplay
          zelleQR={null}
          zelleIdentifier="test@email.com"
          recipientName="John Doe"
          amount={100}
        />
      );

      expect(screen.getByText('Send to')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('test@email.com')).toBeInTheDocument();
    });

    it('shows Zelle branding in identifier-only mode', () => {
      render(
        <ZelleQrDisplay
          zelleQR={null}
          zelleIdentifier="test@email.com"
        />
      );

      expect(screen.getByText('Z')).toBeInTheDocument();
    });

    it('shows copy button in identifier-only mode', () => {
      render(
        <ZelleQrDisplay
          zelleQR={null}
          zelleIdentifier="test@email.com"
        />
      );

      // There should be a copy button (ghost variant)
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('shows instructions in identifier-only mode', () => {
      render(
        <ZelleQrDisplay
          zelleQR={null}
          zelleIdentifier="test@email.com"
        />
      );

      expect(screen.getByText(/Open your Zelle app and send to this email\/phone/)).toBeInTheDocument();
    });
  });

  describe('No QR and No Identifier - Placeholder', () => {
    it('shows placeholder when neither QR nor identifier provided', () => {
      render(<ZelleQrDisplay zelleQR={null} />);

      expect(screen.getByText('No Zelle QR code available')).toBeInTheDocument();
      expect(screen.getByText(/Ask the recipient for their Zelle info/)).toBeInTheDocument();
    });

    it('shows QR code icon in placeholder', () => {
      const { container } = render(<ZelleQrDisplay zelleQR={null} />);

      // QrCode icon should be present
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    it('copies identifier when copy button is clicked', async () => {
      const user = userEvent.setup();
      render(<ZelleQrDisplay {...defaultProps} />);

      // Find the copy button by looking for the identifier text
      const copyButton = screen.getByText('test@email.com').closest('button');
      if (copyButton) {
        await user.click(copyButton);
        expect(mockWriteText).toHaveBeenCalledWith('test@email.com');
      }
    });

    it('shows check icon after copying', async () => {
      const user = userEvent.setup();
      render(<ZelleQrDisplay {...defaultProps} />);

      const copyButton = screen.getByText('test@email.com').closest('button');
      if (copyButton) {
        await user.click(copyButton);

        await waitFor(() => {
          expect(copyButton.querySelector('.text-green-600')).toBeInTheDocument();
        });
      }
    });

    it('falls back to rawContent if no identifier', async () => {
      const user = userEvent.setup();
      render(
        <ZelleQrDisplay
          zelleQR={zelleQRData}
          recipientName="John Doe"
        />
      );

      // Find any copy button and click it
      const buttons = screen.getAllByRole('button');
      const copyButton = buttons.find(btn => btn.querySelector('svg'));
      if (copyButton) {
        await user.click(copyButton);
        // Should copy rawContent from zelleQR
        expect(mockWriteText).toHaveBeenCalled();
      }
    });
  });

  describe('Download Functionality', () => {
    it('shows download button by default', () => {
      render(<ZelleQrDisplay {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Save QR Code/i })).toBeInTheDocument();
    });

    it('hides download button when showDownload is false', () => {
      render(<ZelleQrDisplay {...defaultProps} showDownload={false} />);

      expect(screen.queryByRole('button', { name: /Save QR Code/i })).not.toBeInTheDocument();
    });

    it('downloads QR code when download button is clicked', async () => {
      const user = userEvent.setup();

      // Mock createElement and click
      const mockClick = jest.fn();
      const mockRemove = jest.fn();
      const originalCreateElement = document.createElement.bind(document);
      jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          element.click = mockClick;
        }
        return element;
      });
      jest.spyOn(document.body, 'appendChild').mockImplementation(() => document.body);
      jest.spyOn(document.body, 'removeChild').mockImplementation(() => document.body);

      render(<ZelleQrDisplay {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /Save QR Code/i }));

      expect(mockClick).toHaveBeenCalled();

      jest.restoreAllMocks();
    });
  });

  describe('Expand/Full Screen Functionality', () => {
    it('shows expand button by default', () => {
      render(<ZelleQrDisplay {...defaultProps} />);

      expect(screen.getByRole('button', { name: /View full screen/i })).toBeInTheDocument();
    });

    it('hides expand button when showExpand is false', () => {
      render(<ZelleQrDisplay {...defaultProps} showExpand={false} />);

      expect(screen.queryByRole('button', { name: /View full screen/i })).not.toBeInTheDocument();
    });

    it('opens full screen dialog when expand button is clicked', async () => {
      const user = userEvent.setup();
      render(<ZelleQrDisplay {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /View full screen/i }));

      // Dialog should be open with larger QR code
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('shows recipient info in full screen dialog', async () => {
      const user = userEvent.setup();
      render(<ZelleQrDisplay {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /View full screen/i }));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveTextContent('John Doe');
        expect(dialog).toHaveTextContent('$100.00');
      });
    });

    it('shows download button in full screen dialog', async () => {
      const user = userEvent.setup();
      render(<ZelleQrDisplay {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /View full screen/i }));

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /Download/i }).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      const { container } = render(
        <ZelleQrDisplay {...defaultProps} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible alt text for QR code image', () => {
      render(<ZelleQrDisplay {...defaultProps} />);

      expect(screen.getByAltText(/Zelle QR code for John Doe/)).toBeInTheDocument();
    });

    it('has accessible label for expand button', () => {
      render(<ZelleQrDisplay {...defaultProps} />);

      expect(screen.getByRole('button', { name: /View full screen/i })).toBeInTheDocument();
    });
  });
});

describe('ZelleQrBadge Component', () => {
  const zelleQRData = {
    imageDataUrl: 'data:image/png;base64,testQRCode123',
    rawContent: 'zelle:test@email.com',
  };

  const defaultProps = {
    zelleQR: zelleQRData,
    zelleIdentifier: 'test@email.com',
    recipientName: 'John Doe',
  };

  describe('Rendering', () => {
    it('renders badge with QR code icon when QR is available', () => {
      render(<ZelleQrBadge {...defaultProps} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Scan Zelle QR')).toBeInTheDocument();
    });

    it('renders badge with Zelle text when only identifier available', () => {
      render(
        <ZelleQrBadge
          zelleQR={null}
          zelleIdentifier="test@email.com"
          recipientName="John Doe"
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Zelle')).toBeInTheDocument();
    });

    it('returns null when neither QR nor identifier available', () => {
      const { container } = render(
        <ZelleQrBadge zelleQR={null} />
      );

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('Dialog Functionality', () => {
    it('opens dialog when badge is clicked', async () => {
      const user = userEvent.setup();
      render(<ZelleQrBadge {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Pay with Zelle')).toBeInTheDocument();
      });
    });

    it('shows ZelleQrDisplay in dialog', async () => {
      const user = userEvent.setup();
      render(<ZelleQrBadge {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        // Large QR code should be displayed
        const qrImage = screen.getByAltText(/Zelle QR code/);
        expect(qrImage).toHaveAttribute('width', '300'); // large size
      });
    });

    it('closes dialog when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<ZelleQrBadge {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Find and click the close button (X button in dialog header)
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Styling', () => {
    it('has Zelle purple styling', () => {
      const { container } = render(<ZelleQrBadge {...defaultProps} />);

      expect(container.querySelector('.text-\\[\\#6D1ED4\\]')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<ZelleQrBadge {...defaultProps} className="custom-class" />);

      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });
});

describe('ZelleQrCard Component', () => {
  const zelleQRData = {
    imageDataUrl: 'data:image/png;base64,testQRCode123',
    rawContent: 'zelle:test@email.com',
  };

  const defaultProps = {
    zelleQR: zelleQRData,
    zelleIdentifier: 'test@email.com',
    recipientName: 'John Doe',
    amount: 100,
    note: 'Pool contribution',
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
    it('renders correctly with all props', () => {
      render(<ZelleQrCard {...defaultProps} />);

      expect(screen.getByText('Zelle')).toBeInTheDocument();
      expect(screen.getByText('test@email.com')).toBeInTheDocument();
      expect(screen.getByText('$100.00')).toBeInTheDocument();
      expect(screen.getByText(/Send to John Doe/)).toBeInTheDocument();
      expect(screen.getByText('Pool contribution')).toBeInTheDocument();
    });

    it('shows QR code thumbnail when available', () => {
      render(<ZelleQrCard {...defaultProps} />);

      const qrImage = screen.getByAltText('Zelle QR Code');
      expect(qrImage).toBeInTheDocument();
      expect(qrImage).toHaveClass('w-24', 'h-24');
    });

    it('hides QR thumbnail when no QR available', () => {
      render(
        <ZelleQrCard
          {...defaultProps}
          zelleQR={null}
        />
      );

      expect(screen.queryByAltText('Zelle QR Code')).not.toBeInTheDocument();
    });

    it('formats amount correctly', () => {
      render(<ZelleQrCard {...defaultProps} amount={1234.56} />);

      expect(screen.getByText('$1,234.56')).toBeInTheDocument();
    });

    it('hides amount when not provided', () => {
      render(
        <ZelleQrCard
          {...defaultProps}
          amount={undefined}
        />
      );

      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    });
  });

  describe('Copy ID Button', () => {
    it('shows Copy ID button when identifier is available', () => {
      render(<ZelleQrCard {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Copy ID/i })).toBeInTheDocument();
    });

    it('copies identifier when Copy ID button is clicked', async () => {
      const user = userEvent.setup();
      render(<ZelleQrCard {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /Copy ID/i }));

      expect(mockWriteText).toHaveBeenCalledWith('test@email.com');
    });

    it('shows "Copied!" after copying', async () => {
      const user = userEvent.setup();
      render(<ZelleQrCard {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /Copy ID/i }));

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });

    it('hides Copy ID button when no identifier', () => {
      render(
        <ZelleQrCard
          {...defaultProps}
          zelleIdentifier={undefined}
        />
      );

      expect(screen.queryByRole('button', { name: /Copy ID/i })).not.toBeInTheDocument();
    });
  });

  describe('QR Badge Integration', () => {
    it('shows Scan Zelle QR badge when QR is available', () => {
      render(<ZelleQrCard {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Scan Zelle QR/i })).toBeInTheDocument();
    });

    it('hides QR badge when no QR available', () => {
      render(
        <ZelleQrCard
          {...defaultProps}
          zelleQR={null}
        />
      );

      expect(screen.queryByRole('button', { name: /Scan Zelle QR/i })).not.toBeInTheDocument();
    });

    it('opens QR dialog when badge is clicked', async () => {
      const user = userEvent.setup();
      render(<ZelleQrCard {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /Scan Zelle QR/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Styling', () => {
    it('has Zelle purple border', () => {
      const { container } = render(<ZelleQrCard {...defaultProps} />);

      expect(container.querySelector('.border-\\[\\#6D1ED4\\]')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <ZelleQrCard {...defaultProps} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Conditional Rendering', () => {
    it('hides note when not provided', () => {
      render(
        <ZelleQrCard
          {...defaultProps}
          note={undefined}
        />
      );

      expect(screen.queryByText('Pool contribution')).not.toBeInTheDocument();
    });

    it('hides recipient name when not provided', () => {
      render(
        <ZelleQrCard
          {...defaultProps}
          recipientName={undefined}
        />
      );

      expect(screen.queryByText(/Send to/)).not.toBeInTheDocument();
    });
  });
});
