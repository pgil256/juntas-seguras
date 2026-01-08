/**
 * Input Component Tests
 *
 * Tests for the Input, SearchInput, and FloatingInput components.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input, SearchInputStyled, FloatingInput } from '@/components/ui/input';
import { Search, Mail, Eye } from 'lucide-react';

describe('Input Component', () => {
  describe('Rendering', () => {
    it('renders an input element', () => {
      render(<Input placeholder="Enter text" />);

      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('renders with correct base styling', () => {
      render(<Input data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toHaveClass('h-12');
      expect(input).toHaveClass('rounded-xl');
      expect(input).toHaveClass('border');
    });

    it('forwards ref to input element', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('spreads additional props to input', () => {
      render(<Input data-testid="custom-input" aria-label="Custom Input" />);

      const input = screen.getByTestId('custom-input');
      expect(input).toHaveAttribute('aria-label', 'Custom Input');
    });
  });

  describe('Input Types', () => {
    it('renders text input by default', () => {
      render(<Input data-testid="input" />);

      const input = screen.getByTestId('input');
      // Default type is 'text' but HTML doesn't require the attribute to be explicitly set
      // The input should be a text input by default (no type attribute or type="text")
      expect(input.getAttribute('type') ?? 'text').toBe('text');
    });

    it('renders email input', () => {
      render(<Input type="email" data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('renders password input', () => {
      render(<Input type="password" data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('renders number input', () => {
      render(<Input type="number" data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('renders search input', () => {
      render(<Input type="search" data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('type', 'search');
    });
  });

  describe('Icon Support', () => {
    it('renders with left icon', () => {
      render(<Input icon={Search} iconPosition="left" data-testid="input" />);

      const wrapper = screen.getByTestId('input').parentElement;
      expect(wrapper?.querySelector('svg')).toBeInTheDocument();
    });

    it('renders with right icon', () => {
      render(<Input icon={Eye} iconPosition="right" data-testid="input" />);

      const wrapper = screen.getByTestId('input').parentElement;
      expect(wrapper?.querySelector('svg')).toBeInTheDocument();
    });

    it('adds left padding when icon is on left', () => {
      render(<Input icon={Search} iconPosition="left" data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toHaveClass('pl-11');
    });

    it('adds right padding when icon is on right', () => {
      render(<Input icon={Eye} iconPosition="right" data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toHaveClass('pr-11');
    });

    it('positions icon on left by default', () => {
      render(<Input icon={Mail} data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toHaveClass('pl-11');
    });
  });

  describe('Error State', () => {
    it('applies error styles when error prop is true', () => {
      render(<Input error data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toHaveClass('border-red-300');
    });

    it('shows red icon when error and icon present', () => {
      const { container } = render(<Input icon={Mail} error data-testid="input" />);

      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('text-red-400');
    });
  });

  describe('Success State', () => {
    it('applies success styles when success prop is true', () => {
      render(<Input success data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toHaveClass('border-green-300');
    });

    it('shows green icon when success and icon present', () => {
      const { container } = render(<Input icon={Mail} success data-testid="input" />);

      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('text-green-500');
    });
  });

  describe('Disabled State', () => {
    it('applies disabled styles', () => {
      render(<Input disabled data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:opacity-50');
    });

    it('cannot be typed into when disabled', async () => {
      const user = userEvent.setup();
      render(<Input disabled data-testid="input" />);

      const input = screen.getByTestId('input');
      await user.type(input, 'test');

      expect(input).toHaveValue('');
    });
  });

  describe('Value and Change', () => {
    it('accepts controlled value', () => {
      render(<Input value="test value" onChange={() => {}} data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toHaveValue('test value');
    });

    it('calls onChange when value changes', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();

      render(<Input onChange={handleChange} data-testid="input" />);

      await user.type(screen.getByTestId('input'), 'hello');

      expect(handleChange).toHaveBeenCalledTimes(5); // Once per character
    });

    it('supports uncontrolled input', async () => {
      const user = userEvent.setup();
      render(<Input data-testid="input" defaultValue="initial" />);

      const input = screen.getByTestId('input');
      await user.clear(input);
      await user.type(input, 'new value');

      expect(input).toHaveValue('new value');
    });
  });

  describe('Focus States', () => {
    it('has focus ring styles', () => {
      render(<Input data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toHaveClass('focus-visible:ring-2');
      expect(input).toHaveClass('focus-visible:ring-blue-500');
    });

    it('can receive focus', async () => {
      const user = userEvent.setup();
      render(<Input data-testid="input" />);

      await user.tab();

      expect(screen.getByTestId('input')).toHaveFocus();
    });

    it('calls onFocus when focused', async () => {
      const handleFocus = jest.fn();
      const user = userEvent.setup();

      render(<Input onFocus={handleFocus} data-testid="input" />);

      await user.click(screen.getByTestId('input'));

      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('calls onBlur when blurred', async () => {
      const handleBlur = jest.fn();
      const user = userEvent.setup();

      render(
        <div>
          <Input onBlur={handleBlur} data-testid="input" />
          <button>Other</button>
        </div>
      );

      await user.click(screen.getByTestId('input'));
      await user.click(screen.getByRole('button'));

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('Custom Classes', () => {
    it('merges custom className', () => {
      render(<Input className="my-custom-class" data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toHaveClass('my-custom-class');
      expect(input).toHaveClass('rounded-xl'); // Still has base class
    });
  });

  describe('Accessibility', () => {
    it('supports aria-invalid', () => {
      render(<Input aria-invalid="true" data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('supports aria-describedby', () => {
      render(
        <div>
          <Input aria-describedby="help-text" data-testid="input" />
          <span id="help-text">Help text</span>
        </div>
      );

      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('supports required attribute', () => {
      render(<Input required data-testid="input" />);

      const input = screen.getByTestId('input');
      expect(input).toBeRequired();
    });

    it('is accessible via label', () => {
      render(
        <div>
          <label htmlFor="my-input">My Label</label>
          <Input id="my-input" />
        </div>
      );

      expect(screen.getByLabelText('My Label')).toBeInTheDocument();
    });
  });
});

describe('SearchInputStyled Component', () => {
  it('renders as search type', () => {
    render(<SearchInputStyled data-testid="search" />);

    const input = screen.getByTestId('search');
    expect(input).toHaveAttribute('type', 'search');
  });

  it('has rounded-full styling', () => {
    render(<SearchInputStyled data-testid="search" />);

    const input = screen.getByTestId('search');
    expect(input).toHaveClass('rounded-full');
  });

  it('has gray background styling', () => {
    render(<SearchInputStyled data-testid="search" />);

    const input = screen.getByTestId('search');
    expect(input).toHaveClass('bg-gray-50');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<SearchInputStyled ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('accepts custom className', () => {
    render(<SearchInputStyled className="my-class" data-testid="search" />);

    const input = screen.getByTestId('search');
    expect(input).toHaveClass('my-class');
  });
});

describe('FloatingInput Component', () => {
  it('renders with floating label', () => {
    render(<FloatingInput label="Email Address" />);

    expect(screen.getByText('Email Address')).toBeInTheDocument();
  });

  it('generates id from label if not provided', () => {
    render(<FloatingInput label="Email Address" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'email-address');
  });

  it('uses provided id over generated one', () => {
    render(<FloatingInput label="Email" id="custom-id" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'custom-id');
  });

  it('associates label with input', () => {
    render(<FloatingInput label="Username" />);

    const label = screen.getByText('Username');
    const input = screen.getByRole('textbox');

    expect(label).toHaveAttribute('for', input.id);
  });

  it('has floating label styling', () => {
    render(<FloatingInput label="Test" />);

    const label = screen.getByText('Test');
    expect(label).toHaveClass('absolute');
    expect(label).toHaveClass('transition-all');
  });

  it('uses placeholder-transparent for label animation', () => {
    render(<FloatingInput label="Test" data-testid="input" />);

    // The input should have placeholder-transparent class for CSS-based label animation
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('placeholder-transparent');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<FloatingInput label="Test" ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('accepts additional input props', async () => {
    const handleChange = jest.fn();
    const user = userEvent.setup();

    render(<FloatingInput label="Test" onChange={handleChange} />);

    await user.type(screen.getByRole('textbox'), 'hello');

    expect(handleChange).toHaveBeenCalled();
  });

  it('renders with correct height', () => {
    render(<FloatingInput label="Test" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('h-14');
  });
});
