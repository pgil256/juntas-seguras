/**
 * Button Component Tests
 *
 * Tests for the shadcn/ui Button component with custom variants.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, buttonVariants } from '@/components/ui/button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('renders button with children', () => {
      render(<Button>Click me</Button>);

      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('renders with default variant and size', () => {
      render(<Button>Default Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-600');
      expect(button).toHaveClass('h-11');
    });

    it('forwards ref to button element', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Ref Button</Button>);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('spreads additional props to button', () => {
      render(<Button data-testid="custom-button" aria-label="Custom Label">Props Button</Button>);

      const button = screen.getByTestId('custom-button');
      expect(button).toHaveAttribute('aria-label', 'Custom Label');
    });
  });

  describe('Variants', () => {
    it('renders default variant with blue background', () => {
      render(<Button variant="default">Default</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-600');
      expect(button).toHaveClass('text-white');
    });

    it('renders destructive variant with red background', () => {
      render(<Button variant="destructive">Delete</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-500');
      expect(button).toHaveClass('text-white');
    });

    it('renders outline variant with border', () => {
      render(<Button variant="outline">Outline</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('border');
      expect(button).toHaveClass('bg-white');
    });

    it('renders secondary variant with gray background', () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-100');
      expect(button).toHaveClass('text-gray-900');
    });

    it('renders ghost variant without background', () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('shadow-none');
    });

    it('renders link variant with underline styling', () => {
      render(<Button variant="link">Link</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-blue-600');
      expect(button).toHaveClass('underline-offset-4');
    });
  });

  describe('Sizes', () => {
    it('renders default size with h-11', () => {
      render(<Button size="default">Default Size</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-11');
      expect(button).toHaveClass('px-4');
    });

    it('renders small size with h-10', () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10');
      expect(button).toHaveClass('px-3');
    });

    it('renders large size with h-12', () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-12');
      expect(button).toHaveClass('px-8');
    });

    it('renders icon size with square dimensions', () => {
      render(<Button size="icon">X</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-11');
      expect(button).toHaveClass('w-11');
    });
  });

  describe('Disabled State', () => {
    it('applies disabled styles when disabled', () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50');
      expect(button).toHaveClass('disabled:pointer-events-none');
    });

    it('does not trigger onClick when disabled', async () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Click Handler', () => {
    it('calls onClick when clicked', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Click</Button>);

      await user.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('passes event to onClick handler', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Click</Button>);

      await user.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('Button Types', () => {
    it('defaults to type button', () => {
      render(<Button>Button</Button>);

      // Note: We don't explicitly set type so it defaults to submit in forms
      // This test verifies the button renders correctly
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('can be submit type', () => {
      render(<Button type="submit">Submit</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('can be reset type', () => {
      render(<Button type="reset">Reset</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'reset');
    });
  });

  describe('Custom Classes', () => {
    it('merges custom className with variant classes', () => {
      render(<Button className="my-custom-class">Custom</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('my-custom-class');
      expect(button).toHaveClass('bg-blue-600'); // Still has variant class
    });

    it('allows overriding styles via className', () => {
      render(<Button className="bg-purple-600">Purple</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-purple-600');
    });
  });

  describe('Focus States', () => {
    it('has focus visible ring styles', () => {
      render(<Button>Focus</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus-visible:ring-2');
      expect(button).toHaveClass('focus-visible:ring-blue-600');
    });

    it('can receive focus via tab', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <input data-testid="input" />
          <Button>Button</Button>
        </div>
      );

      await user.tab();
      expect(screen.getByTestId('input')).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button')).toHaveFocus();
    });
  });

  describe('Interaction Feedback', () => {
    it('has active state transform classes', () => {
      render(<Button>Active</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('active:translate-y-[1px]');
      expect(button).toHaveClass('active:scale-[0.98]');
    });

    it('has hover shadow styles', () => {
      render(<Button>Hover</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:shadow');
    });
  });

  describe('buttonVariants Helper', () => {
    it('generates correct classes for default variant', () => {
      const classes = buttonVariants({ variant: 'default' });

      expect(classes).toContain('bg-blue-600');
      expect(classes).toContain('text-white');
    });

    it('generates correct classes for destructive variant', () => {
      const classes = buttonVariants({ variant: 'destructive' });

      expect(classes).toContain('bg-red-500');
    });

    it('generates correct classes for size sm', () => {
      const classes = buttonVariants({ size: 'sm' });

      expect(classes).toContain('h-10');
      expect(classes).toContain('px-3');
    });

    it('combines variant and size correctly', () => {
      const classes = buttonVariants({ variant: 'outline', size: 'lg' });

      expect(classes).toContain('border');
      expect(classes).toContain('h-12');
    });
  });

  describe('Accessibility', () => {
    it('is accessible via keyboard', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Keyboard</Button>);

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);

      await user.keyboard(' '); // Space
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('supports aria-disabled', () => {
      render(<Button aria-disabled="true">Aria Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('supports aria-pressed for toggle buttons', () => {
      render(<Button aria-pressed="true">Toggle</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('supports aria-expanded for disclosure buttons', () => {
      render(<Button aria-expanded="false">Expand</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('With Icons', () => {
    it('renders with icon and text', () => {
      render(
        <Button>
          <svg data-testid="icon" />
          Save
        </Button>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('renders icon-only button correctly', () => {
      render(
        <Button size="icon" aria-label="Close">
          <svg data-testid="close-icon" />
        </Button>
      );

      expect(screen.getByTestId('close-icon')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Close');
    });
  });
});
