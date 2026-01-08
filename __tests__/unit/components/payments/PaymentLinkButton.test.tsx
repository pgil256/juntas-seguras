/**
 * PaymentLinkButton Component Tests
 *
 * Tests for the PaymentLinkButton, PaymentMethodBadge, and PaymentMethodsList components.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the deep-links module
jest.mock('@/lib/payments/deep-links', () => ({
  generatePayoutLink: jest.fn((type: string, options: { recipientHandle: string; amount: number; note?: string }) => {
    return `https://${type}.com/pay?to=${options.recipientHandle}&amount=${options.amount}`;
  }),
}));

import {
  PaymentLinkButton,
  PaymentMethodBadge,
  PaymentMethodsList,
} from '@/components/payments/PaymentLinkButton';

describe('PaymentLinkButton Component', () => {
  const defaultProps = {
    type: 'venmo' as const,
    link: 'https://venmo.com/pay?to=testuser&amount=50',
    amount: 50,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.open
    window.open = jest.fn();
  });

  describe('Rendering', () => {
    it('renders correctly with required props', () => {
      render(<PaymentLinkButton {...defaultProps} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Venmo')).toBeInTheDocument();
      expect(screen.getByText('$50.00')).toBeInTheDocument();
    });

    it('returns null when link is null', () => {
      const { container } = render(
        <PaymentLinkButton {...defaultProps} link={null} />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('displays correct amount format', () => {
      render(<PaymentLinkButton {...defaultProps} amount={1234.56} />);

      expect(screen.getByText('$1,234.56')).toBeInTheDocument();
    });

    it('renders external link icon', () => {
      const { container } = render(<PaymentLinkButton {...defaultProps} />);

      // ExternalLink icon should be present
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Payment Method Types', () => {
    it('renders Venmo button with correct styling', () => {
      render(<PaymentLinkButton {...defaultProps} type="venmo" />);

      expect(screen.getByText('Venmo')).toBeInTheDocument();
      expect(screen.getByText('V')).toBeInTheDocument();
    });

    it('renders Cash App button with correct styling', () => {
      render(
        <PaymentLinkButton
          {...defaultProps}
          type="cashapp"
          link="https://cashapp.com/pay"
        />
      );

      expect(screen.getByText('Cash App')).toBeInTheDocument();
      expect(screen.getByText('$')).toBeInTheDocument();
    });

    it('renders PayPal button with correct styling', () => {
      render(
        <PaymentLinkButton
          {...defaultProps}
          type="paypal"
          link="https://paypal.me/test"
        />
      );

      expect(screen.getByText('PayPal')).toBeInTheDocument();
      expect(screen.getByText('P')).toBeInTheDocument();
    });

    it('renders Zelle button with correct styling', () => {
      render(
        <PaymentLinkButton
          {...defaultProps}
          type="zelle"
          link="https://zelle.com/pay"
        />
      );

      expect(screen.getByText('Zelle')).toBeInTheDocument();
      expect(screen.getByText('Z')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('opens payment link in new tab when clicked', async () => {
      const user = userEvent.setup();
      render(<PaymentLinkButton {...defaultProps} />);

      await user.click(screen.getByRole('button'));

      expect(window.open).toHaveBeenCalledWith(
        'https://venmo.com/pay?to=testuser&amount=50',
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('calls onClick callback when provided', async () => {
      const user = userEvent.setup();
      const onClick = jest.fn();
      render(<PaymentLinkButton {...defaultProps} onClick={onClick} />);

      await user.click(screen.getByRole('button'));

      expect(onClick).toHaveBeenCalled();
    });

    it('calls onClick before opening link', async () => {
      const user = userEvent.setup();
      const callOrder: string[] = [];

      const onClick = jest.fn(() => callOrder.push('onClick'));
      (window.open as jest.Mock).mockImplementation(() => callOrder.push('open'));

      render(<PaymentLinkButton {...defaultProps} onClick={onClick} />);

      await user.click(screen.getByRole('button'));

      expect(callOrder).toEqual(['onClick', 'open']);
    });
  });

  describe('Disabled State', () => {
    it('is disabled when disabled prop is true', () => {
      render(<PaymentLinkButton {...defaultProps} disabled />);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('does not open link when disabled', async () => {
      const user = userEvent.setup();
      render(<PaymentLinkButton {...defaultProps} disabled />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(window.open).not.toHaveBeenCalled();
    });
  });

  describe('Size Variants', () => {
    it('renders small size', () => {
      const { container } = render(
        <PaymentLinkButton {...defaultProps} size="sm" />
      );

      expect(container.querySelector('.h-9')).toBeInTheDocument();
    });

    it('renders default size', () => {
      const { container } = render(
        <PaymentLinkButton {...defaultProps} size="default" />
      );

      expect(container.querySelector('.h-11')).toBeInTheDocument();
    });

    it('renders large size', () => {
      const { container } = render(
        <PaymentLinkButton {...defaultProps} size="lg" />
      );

      expect(container.querySelector('.h-12')).toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      render(
        <PaymentLinkButton {...defaultProps} className="custom-class" />
      );

      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });
});

describe('PaymentMethodBadge Component', () => {
  const defaultProps = {
    type: 'venmo' as const,
    handle: 'testuser',
  };

  describe('Rendering', () => {
    it('renders correctly with required props', () => {
      render(<PaymentMethodBadge {...defaultProps} />);

      expect(screen.getByText('@testuser')).toBeInTheDocument();
      expect(screen.getByText('V')).toBeInTheDocument();
    });
  });

  describe('Handle Formatting', () => {
    it('formats Venmo handle with @ prefix', () => {
      render(<PaymentMethodBadge type="venmo" handle="testuser" />);

      expect(screen.getByText('@testuser')).toBeInTheDocument();
    });

    it('does not double prefix Venmo handle', () => {
      render(<PaymentMethodBadge type="venmo" handle="@testuser" />);

      expect(screen.getByText('@testuser')).toBeInTheDocument();
      expect(screen.queryByText('@@testuser')).not.toBeInTheDocument();
    });

    it('formats Cash App handle with $ prefix', () => {
      render(<PaymentMethodBadge type="cashapp" handle="testuser" />);

      expect(screen.getByText('$testuser')).toBeInTheDocument();
    });

    it('does not double prefix Cash App handle', () => {
      render(<PaymentMethodBadge type="cashapp" handle="$testuser" />);

      expect(screen.getByText('$testuser')).toBeInTheDocument();
      expect(screen.queryByText('$$testuser')).not.toBeInTheDocument();
    });

    it('formats PayPal handle with paypal.me prefix', () => {
      render(<PaymentMethodBadge type="paypal" handle="testuser" />);

      expect(screen.getByText('paypal.me/testuser')).toBeInTheDocument();
    });

    it('displays Zelle identifier as-is', () => {
      render(<PaymentMethodBadge type="zelle" handle="test@email.com" />);

      expect(screen.getByText('test@email.com')).toBeInTheDocument();
    });
  });

  describe('Link Functionality', () => {
    it('renders as link when showLink is true and link is provided', () => {
      render(
        <PaymentMethodBadge
          {...defaultProps}
          showLink
          link="https://venmo.com/testuser"
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://venmo.com/testuser');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('does not render as link when showLink is false', () => {
      render(
        <PaymentMethodBadge
          {...defaultProps}
          showLink={false}
          link="https://venmo.com/testuser"
        />
      );

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('does not render as link when link is not provided', () => {
      render(<PaymentMethodBadge {...defaultProps} showLink />);

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      const { container } = render(
        <PaymentMethodBadge {...defaultProps} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });
});

describe('PaymentMethodsList Component', () => {
  const defaultMethods = {
    venmo: 'venmouser',
    cashapp: 'cashuser',
    paypal: 'paypaluser',
    zelle: 'zelle@email.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.open = jest.fn();
  });

  describe('Rendering', () => {
    it('renders all available payment methods as buttons', () => {
      render(
        <PaymentMethodsList
          methods={defaultMethods}
          amount={100}
          showAsButtons
        />
      );

      expect(screen.getByRole('button', { name: /Venmo/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cash App/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /PayPal/i })).toBeInTheDocument();
      // Zelle appears as badge, not button
      expect(screen.getByText('zelle@email.com')).toBeInTheDocument();
    });

    it('shows empty state when no methods available', () => {
      render(<PaymentMethodsList methods={{}} amount={100} />);

      expect(screen.getByText('No payment methods set up')).toBeInTheDocument();
    });

    it('renders methods as badges when showAsButtons is false', () => {
      render(
        <PaymentMethodsList
          methods={defaultMethods}
          amount={100}
          showAsButtons={false}
        />
      );

      // Should show badges, not buttons
      expect(screen.getByText('@venmouser')).toBeInTheDocument();
      expect(screen.getByText('$cashuser')).toBeInTheDocument();
      expect(screen.getByText('paypal.me/paypaluser')).toBeInTheDocument();
      expect(screen.getByText('zelle@email.com')).toBeInTheDocument();
    });
  });

  describe('Conditional Rendering', () => {
    it('only renders methods that have values', () => {
      render(
        <PaymentMethodsList
          methods={{ venmo: 'venmouser', cashapp: null, paypal: undefined }}
          amount={100}
          showAsButtons
        />
      );

      expect(screen.getByRole('button', { name: /Venmo/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Cash App/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /PayPal/i })).not.toBeInTheDocument();
    });

    it('handles Zelle specially (no deep link, shown as badge)', () => {
      render(
        <PaymentMethodsList
          methods={{ zelle: 'zelle@email.com' }}
          amount={100}
          showAsButtons
        />
      );

      // Zelle should be a badge, not a payment button
      expect(screen.queryByRole('button', { name: /Zelle.*\$100/i })).not.toBeInTheDocument();
      expect(screen.getByText('zelle@email.com')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onPaymentClick when payment button is clicked', async () => {
      const user = userEvent.setup();
      const onPaymentClick = jest.fn();

      render(
        <PaymentMethodsList
          methods={{ venmo: 'venmouser' }}
          amount={100}
          onPaymentClick={onPaymentClick}
          showAsButtons
        />
      );

      await user.click(screen.getByRole('button', { name: /Venmo/i }));

      expect(onPaymentClick).toHaveBeenCalledWith('venmo');
    });
  });

  describe('Link Generation', () => {
    it('generates links when generateLinks is true', () => {
      render(
        <PaymentMethodsList
          methods={{ venmo: 'venmouser' }}
          amount={100}
          generateLinks
          showAsButtons
        />
      );

      // Button should be enabled (link was generated)
      expect(screen.getByRole('button', { name: /Venmo/i })).not.toBeDisabled();
    });

    it('does not generate links when generateLinks is false', () => {
      render(
        <PaymentMethodsList
          methods={{ venmo: 'venmouser' }}
          amount={100}
          generateLinks={false}
          showAsButtons={false}
        />
      );

      // Should still show the badge but without link functionality
      expect(screen.getByText('@venmouser')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('passes size to payment buttons', () => {
      const { container } = render(
        <PaymentMethodsList
          methods={{ venmo: 'venmouser' }}
          amount={100}
          size="lg"
          showAsButtons
        />
      );

      expect(container.querySelector('.h-12')).toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className to container', () => {
      const { container } = render(
        <PaymentMethodsList
          methods={defaultMethods}
          amount={100}
          className="custom-container"
        />
      );

      expect(container.querySelector('.custom-container')).toBeInTheDocument();
    });
  });
});
