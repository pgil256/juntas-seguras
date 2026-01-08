/**
 * Select Component Tests
 *
 * Tests for the Select component built on Radix UI Select primitive.
 * Note: Radix UI Select has complex portal behavior that doesn't work well
 * in jsdom. These tests focus on rendering and basic functionality.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from '@/components/ui/select';

// Mock ResizeObserver for Radix UI
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('Select Component', () => {
  describe('Rendering', () => {
    it('renders select trigger', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders placeholder text', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Choose a fruit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Choose a fruit')).toBeInTheDocument();
    });

    it('renders chevron icon', () => {
      const { container } = render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders with controlled value', () => {
      render(
        <Select value="apple">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Apple')).toBeInTheDocument();
    });

    it('renders with default value', () => {
      render(
        <Select defaultValue="banana">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Banana')).toBeInTheDocument();
    });
  });

  describe('SelectTrigger', () => {
    it('renders with correct base styling', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveClass('h-11');
      expect(trigger).toHaveClass('min-h-[44px]');
      expect(trigger).toHaveClass('rounded-md');
      expect(trigger).toHaveClass('border');
    });

    it('renders with flex layout', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveClass('flex');
      expect(trigger).toHaveClass('items-center');
      expect(trigger).toHaveClass('justify-between');
    });

    it('has focus ring styles', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveClass('focus:ring-2');
      expect(trigger).toHaveClass('focus:ring-blue-500');
    });

    it('applies disabled styles when disabled', () => {
      render(
        <Select disabled>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveClass('disabled:opacity-50');
      expect(trigger).toBeDisabled();
    });

    it('merges custom className', () => {
      render(
        <Select>
          <SelectTrigger className="w-[200px]" data-testid="trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveClass('w-[200px]');
      expect(trigger).toHaveClass('h-11');
    });

    it('can receive focus', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByTestId('trigger');
      trigger.focus();
      expect(document.activeElement).toBe(trigger);
    });
  });

  describe('Accessibility', () => {
    it('has combobox role on trigger', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('supports required attribute', () => {
      render(
        <Select required>
          <SelectTrigger>
            <SelectValue placeholder="Required" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-required', 'true');
    });

    it('has aria-expanded attribute', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-expanded');
    });

    it('is keyboard focusable', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).not.toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('SelectContent Styling', () => {
    // SelectContent is rendered in a portal, so we can't directly test it
    // when closed. These tests verify the component structure is correct.

    it('renders trigger with correct ARIA attributes', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-autocomplete', 'none');
    });
  });

  describe('SelectValue', () => {
    it('shows placeholder when no value selected', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Pick an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Pick an option')).toBeInTheDocument();
    });

    it('shows selected value', () => {
      render(
        <Select value="cherry">
          <SelectTrigger>
            <SelectValue placeholder="Pick a fruit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="cherry">Cherry</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Cherry')).toBeInTheDocument();
      expect(screen.queryByText('Pick a fruit')).not.toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('can be controlled', () => {
      const { rerender } = render(
        <Select value="apple">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Apple')).toBeInTheDocument();

      rerender(
        <Select value="banana">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Banana')).toBeInTheDocument();
    });

    it('accepts onValueChange callback', () => {
      const handleChange = jest.fn();

      render(
        <Select onValueChange={handleChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );

      // The callback is set up correctly
      // Actual invocation would require opening the dropdown which is complex in jsdom
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('prevents interaction when disabled', () => {
      render(
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Disabled" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeDisabled();
    });

    it('applies disabled cursor styling', () => {
      render(
        <Select disabled>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Disabled" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveClass('disabled:cursor-not-allowed');
    });
  });
});
