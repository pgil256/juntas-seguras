/**
 * PaymentQrCode Component Tests
 *
 * Tests for the PaymentQrCode, QrCodeButton, PaymentQrCodeGrid, and PaymentQrCodeCard components.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the QR code generation module
jest.mock('@/lib/payments/qr-code', () => ({
  generatePaymentQRCode: jest.fn(),
}));

import {
  PaymentQrCode,
  QrCodeButton,
  PaymentQrCodeGrid,
  PaymentQrCodeCard,
} from '@/components/payments/PaymentQrCode';
import { generatePaymentQRCode } from '@/lib/payments/qr-code';

const mockGeneratePaymentQRCode = generatePaymentQRCode as jest.MockedFunction<typeof generatePaymentQRCode>;

describe('PaymentQrCode Component', () => {
  const defaultProps = {
    type: 'venmo' as const,
    handle: 'testuser',
    amount: 50,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGeneratePaymentQRCode.mockResolvedValue({
      dataUrl: 'data:image/png;base64,test123',
      content: 'venmo://paycharge?txn=pay&recipients=testuser&amount=50',
      size: 200,
    });
  });

  describe('Loading State', () => {
    it('shows loading state initially', () => {
      render(<PaymentQrCode {...defaultProps} />);

      expect(screen.getByText('Generating QR code...')).toBeInTheDocument();
    });

    it('shows loading spinner', () => {
      const { container } = render(<PaymentQrCode {...defaultProps} />);

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('renders QR code image when generated', async () => {
      render(<PaymentQrCode {...defaultProps} />);

      await waitFor(() => {
        const img = screen.getByAltText(/venmo payment qr code/i);
        expect(img).toBeInTheDocument();
      });
    });

    it('displays correct amount', async () => {
      render(<PaymentQrCode {...defaultProps} amount={75.50} />);

      await waitFor(() => {
        expect(screen.getByText('$75.50')).toBeInTheDocument();
      });
    });

    it('displays note when provided', async () => {
      render(<PaymentQrCode {...defaultProps} note="Pool contribution" />);

      await waitFor(() => {
        expect(screen.getByText('Pool contribution')).toBeInTheDocument();
      });
    });

    it('displays method label', async () => {
      render(<PaymentQrCode {...defaultProps} type="venmo" />);

      await waitFor(() => {
        expect(screen.getByText('Venmo')).toBeInTheDocument();
      });
    });

    it('shows scan instructions', async () => {
      render(<PaymentQrCode {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Scan with your phone to pay')).toBeInTheDocument();
      });
    });

    it('calls onGenerated callback with data URL', async () => {
      const onGenerated = jest.fn();
      render(<PaymentQrCode {...defaultProps} onGenerated={onGenerated} />);

      await waitFor(() => {
        expect(onGenerated).toHaveBeenCalledWith('data:image/png;base64,test123');
      });
    });
  });

  describe('Error State', () => {
    it('shows error message when generation fails', async () => {
      mockGeneratePaymentQRCode.mockRejectedValue(new Error('Generation failed'));

      render(<PaymentQrCode {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Generation failed')).toBeInTheDocument();
      });
    });

    it('shows Try Again button on error', async () => {
      mockGeneratePaymentQRCode.mockRejectedValue(new Error('Failed'));

      render(<PaymentQrCode {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('retries generation when Try Again is clicked', async () => {
      mockGeneratePaymentQRCode.mockRejectedValueOnce(new Error('Failed'));

      render(<PaymentQrCode {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });

      mockGeneratePaymentQRCode.mockResolvedValueOnce({
        dataUrl: 'data:image/png;base64,retry',
        content: 'venmo://test',
        size: 200,
      });

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      await waitFor(() => {
        expect(mockGeneratePaymentQRCode).toHaveBeenCalledTimes(2);
      });
    });

    it('calls onError callback on failure', async () => {
      const onError = jest.fn();
      const error = new Error('Test error');
      mockGeneratePaymentQRCode.mockRejectedValue(error);

      render(<PaymentQrCode {...defaultProps} onError={onError} />);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      });
    });
  });

  describe('Unsupported Payment Methods', () => {
    it('shows message for Zelle (no QR support)', async () => {
      render(<PaymentQrCode {...defaultProps} type="zelle" />);

      // Zelle doesn't support QR, so it should show immediately
      expect(screen.getByText(/zelle doesn't support qr code payments/i)).toBeInTheDocument();
    });

    it('suggests copying ID for Zelle', async () => {
      render(<PaymentQrCode {...defaultProps} type="zelle" />);

      expect(screen.getByText(/copy the zelle id/i)).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('renders small size', async () => {
      render(<PaymentQrCode {...defaultProps} size="small" />);

      await waitFor(() => {
        const img = screen.getByAltText(/venmo payment qr code/i);
        expect(img).toHaveAttribute('width', '128');
        expect(img).toHaveAttribute('height', '128');
      });
    });

    it('renders medium size (default)', async () => {
      render(<PaymentQrCode {...defaultProps} size="medium" />);

      await waitFor(() => {
        const img = screen.getByAltText(/venmo payment qr code/i);
        expect(img).toHaveAttribute('width', '200');
        expect(img).toHaveAttribute('height', '200');
      });
    });

    it('renders large size', async () => {
      render(<PaymentQrCode {...defaultProps} size="large" />);

      await waitFor(() => {
        const img = screen.getByAltText(/venmo payment qr code/i);
        expect(img).toHaveAttribute('width', '300');
        expect(img).toHaveAttribute('height', '300');
      });
    });
  });

  describe('Action Buttons', () => {
    it('shows download button by default', async () => {
      render(<PaymentQrCode {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });
    });

    it('hides download button when showDownload is false', async () => {
      render(<PaymentQrCode {...defaultProps} showDownload={false} />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
      });
    });

    it('shows copy link button by default', async () => {
      render(<PaymentQrCode {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
      });
    });

    it('hides copy link button when showCopyLink is false', async () => {
      render(<PaymentQrCode {...defaultProps} showCopyLink={false} />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /copy link/i })).not.toBeInTheDocument();
      });
    });

    it('shows "Copied!" when link is copied', async () => {
      const user = userEvent.setup();

      // Mock clipboard API properly
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true,
      });

      render(<PaymentQrCode {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /copy link/i }));

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });
  });

  describe('Payment Method Styling', () => {
    it('applies Venmo blue border', async () => {
      const { container } = render(<PaymentQrCode {...defaultProps} type="venmo" />);

      await waitFor(() => {
        const qrContainer = container.querySelector('.border-\\[\\#3D95CE\\]');
        expect(qrContainer).toBeInTheDocument();
      });
    });

    it('applies Cash App green border', async () => {
      const { container } = render(<PaymentQrCode {...defaultProps} type="cashapp" />);

      await waitFor(() => {
        const qrContainer = container.querySelector('.border-\\[\\#00D632\\]');
        expect(qrContainer).toBeInTheDocument();
      });
    });

    it('applies PayPal blue border', async () => {
      const { container } = render(<PaymentQrCode {...defaultProps} type="paypal" />);

      await waitFor(() => {
        const qrContainer = container.querySelector('.border-\\[\\#003087\\]');
        expect(qrContainer).toBeInTheDocument();
      });
    });
  });
});

describe('QrCodeButton Component', () => {
  const defaultProps = {
    type: 'venmo' as const,
    handle: 'testuser',
    amount: 50,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGeneratePaymentQRCode.mockResolvedValue({
      dataUrl: 'data:image/png;base64,test123',
      content: 'venmo://test',
      size: 128,
    });
  });

  it('renders QR Code button', () => {
    render(<QrCodeButton {...defaultProps} />);

    expect(screen.getByRole('button', { name: /show venmo qr code/i })).toBeInTheDocument();
  });

  it('returns null for Zelle (unsupported)', () => {
    const { container } = render(<QrCodeButton {...defaultProps} type="zelle" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows QR code when button is clicked', async () => {
    const user = userEvent.setup();
    render(<QrCodeButton {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /show venmo qr code/i }));

    await waitFor(() => {
      expect(screen.getByAltText(/venmo payment qr code/i)).toBeInTheDocument();
    });
  });

  it('hides QR code when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<QrCodeButton {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /show venmo qr code/i }));

    await waitFor(() => {
      expect(screen.getByAltText(/venmo payment qr code/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /close qr code/i }));

    await waitFor(() => {
      expect(screen.queryByAltText(/venmo payment qr code/i)).not.toBeInTheDocument();
    });
  });

  it('can be disabled', () => {
    render(<QrCodeButton {...defaultProps} disabled />);

    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('PaymentQrCodeGrid Component', () => {
  const defaultProps = {
    methods: {
      venmo: 'venmouser',
      cashapp: 'cashuser',
      paypal: 'paypaluser',
    },
    amount: 100,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGeneratePaymentQRCode.mockResolvedValue({
      dataUrl: 'data:image/png;base64,test123',
      content: 'payment://test',
      size: 200,
    });
  });

  it('renders QR codes for all available methods', async () => {
    render(<PaymentQrCodeGrid {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getAllByAltText(/payment qr code/i)).toHaveLength(3);
    });
  });

  it('renders only configured methods', async () => {
    render(
      <PaymentQrCodeGrid
        methods={{ venmo: 'venmouser', cashapp: null, paypal: null }}
        amount={50}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByAltText(/payment qr code/i)).toHaveLength(1);
    });
  });

  it('shows empty state when no methods available', () => {
    render(
      <PaymentQrCodeGrid
        methods={{ venmo: null, cashapp: null, paypal: null, zelle: 'zelleuser' }}
        amount={50}
      />
    );

    expect(screen.getByText(/no qr-compatible payment methods/i)).toBeInTheDocument();
  });

  it('excludes Zelle from QR grid', async () => {
    render(
      <PaymentQrCodeGrid
        methods={{ venmo: 'venmouser', zelle: 'zelleuser' }}
        amount={50}
      />
    );

    await waitFor(() => {
      // Only venmo should have a QR code, zelle is excluded
      expect(screen.getAllByAltText(/payment qr code/i)).toHaveLength(1);
    });
  });

  it('applies correct grid columns based on method count', async () => {
    const { container } = render(
      <PaymentQrCodeGrid
        methods={{ venmo: 'venmouser', cashapp: 'cashuser' }}
        amount={50}
      />
    );

    await waitFor(() => {
      expect(container.querySelector('.grid-cols-2')).toBeInTheDocument();
    });
  });
});

describe('PaymentQrCodeCard Component', () => {
  const defaultProps = {
    type: 'venmo' as const,
    handle: 'testuser',
    amount: 50,
    link: 'https://venmo.com/u/testuser',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGeneratePaymentQRCode.mockResolvedValue({
      dataUrl: 'data:image/png;base64,test123',
      content: 'venmo://test',
      size: 128,
    });
  });

  it('renders payment method name', () => {
    render(<PaymentQrCodeCard {...defaultProps} />);

    expect(screen.getByText('Venmo')).toBeInTheDocument();
  });

  it('renders formatted handle for Venmo', () => {
    render(<PaymentQrCodeCard {...defaultProps} type="venmo" handle="testuser" />);

    expect(screen.getByText('@testuser')).toBeInTheDocument();
  });

  it('renders formatted handle for Cash App', () => {
    render(<PaymentQrCodeCard {...defaultProps} type="cashapp" handle="testuser" />);

    expect(screen.getByText('$testuser')).toBeInTheDocument();
  });

  it('renders formatted handle for PayPal', () => {
    render(<PaymentQrCodeCard {...defaultProps} type="paypal" handle="testuser" />);

    expect(screen.getByText('paypal.me/testuser')).toBeInTheDocument();
  });

  it('renders amount', () => {
    render(<PaymentQrCodeCard {...defaultProps} amount={75} />);

    expect(screen.getByText('$75.00')).toBeInTheDocument();
  });

  it('renders payment link button', () => {
    render(<PaymentQrCodeCard {...defaultProps} />);

    expect(screen.getByRole('link', { name: /pay with venmo/i })).toBeInTheDocument();
  });

  it('hides payment link button when link not provided', () => {
    render(<PaymentQrCodeCard {...defaultProps} link={undefined} />);

    expect(screen.queryByRole('link', { name: /pay with/i })).not.toBeInTheDocument();
  });

  it('toggles QR code visibility', async () => {
    const user = userEvent.setup();
    render(<PaymentQrCodeCard {...defaultProps} />);

    // Initially no QR code
    expect(screen.queryByAltText(/venmo payment qr code/i)).not.toBeInTheDocument();

    // Click QR button
    await user.click(screen.getByRole('button', { name: /qr/i }));

    // QR code should appear
    await waitFor(() => {
      expect(screen.getByAltText(/venmo payment qr code/i)).toBeInTheDocument();
    });

    // Click Hide button
    await user.click(screen.getByRole('button', { name: /hide/i }));

    // QR code should disappear
    await waitFor(() => {
      expect(screen.queryByAltText(/venmo payment qr code/i)).not.toBeInTheDocument();
    });
  });

  it('hides QR button for Zelle', () => {
    render(<PaymentQrCodeCard {...defaultProps} type="zelle" />);

    expect(screen.queryByRole('button', { name: /qr/i })).not.toBeInTheDocument();
  });

  it('applies method-specific styling', () => {
    const { container } = render(<PaymentQrCodeCard {...defaultProps} type="venmo" />);

    expect(container.querySelector('.border-\\[\\#3D95CE\\]')).toBeInTheDocument();
  });
});
