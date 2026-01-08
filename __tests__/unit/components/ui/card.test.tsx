/**
 * Card Component Tests
 *
 * Tests for the Card, CardHeader, CardTitle, CardDescription, CardContent, and CardFooter components.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

describe('Card Component', () => {
  describe('Rendering', () => {
    it('renders children', () => {
      render(<Card>Card Content</Card>);

      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('renders with correct base styling', () => {
      render(<Card data-testid="card">Content</Card>);

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('rounded-xl');
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('shadow');
    });

    it('forwards ref to div element', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Card ref={ref}>Content</Card>);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('spreads additional props', () => {
      render(<Card data-testid="card" role="article">Content</Card>);

      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('role', 'article');
    });

    it('merges custom className', () => {
      render(<Card className="my-custom-class" data-testid="card">Content</Card>);

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('my-custom-class');
      expect(card).toHaveClass('rounded-xl');
    });
  });
});

describe('CardHeader Component', () => {
  describe('Rendering', () => {
    it('renders children', () => {
      render(<CardHeader>Header Content</CardHeader>);

      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('renders with flex column layout', () => {
      render(<CardHeader data-testid="header">Content</CardHeader>);

      const header = screen.getByTestId('header');
      expect(header).toHaveClass('flex');
      expect(header).toHaveClass('flex-col');
    });

    it('renders with correct spacing', () => {
      render(<CardHeader data-testid="header">Content</CardHeader>);

      const header = screen.getByTestId('header');
      expect(header).toHaveClass('space-y-1.5');
      expect(header).toHaveClass('p-4');
    });

    it('has responsive padding', () => {
      render(<CardHeader data-testid="header">Content</CardHeader>);

      const header = screen.getByTestId('header');
      expect(header).toHaveClass('sm:p-6');
    });

    it('forwards ref', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardHeader ref={ref}>Content</CardHeader>);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('merges custom className', () => {
      render(<CardHeader className="bg-blue-50" data-testid="header">Content</CardHeader>);

      const header = screen.getByTestId('header');
      expect(header).toHaveClass('bg-blue-50');
      expect(header).toHaveClass('p-4');
    });
  });
});

describe('CardTitle Component', () => {
  describe('Rendering', () => {
    it('renders children', () => {
      render(<CardTitle>My Title</CardTitle>);

      expect(screen.getByText('My Title')).toBeInTheDocument();
    });

    it('renders as div element', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);

      const title = screen.getByTestId('title');
      expect(title.tagName).toBe('DIV');
    });

    it('renders with font styling', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);

      const title = screen.getByTestId('title');
      expect(title).toHaveClass('font-semibold');
      expect(title).toHaveClass('leading-none');
      expect(title).toHaveClass('tracking-tight');
    });

    it('forwards ref', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardTitle ref={ref}>Title</CardTitle>);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('merges custom className', () => {
      render(<CardTitle className="text-xl" data-testid="title">Title</CardTitle>);

      const title = screen.getByTestId('title');
      expect(title).toHaveClass('text-xl');
      expect(title).toHaveClass('font-semibold');
    });
  });
});

describe('CardDescription Component', () => {
  describe('Rendering', () => {
    it('renders children', () => {
      render(<CardDescription>Description text</CardDescription>);

      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('renders with muted text styling', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>);

      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('text-sm');
      expect(desc).toHaveClass('text-muted-foreground');
    });

    it('forwards ref', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardDescription ref={ref}>Description</CardDescription>);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('merges custom className', () => {
      render(<CardDescription className="italic" data-testid="desc">Description</CardDescription>);

      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('italic');
      expect(desc).toHaveClass('text-sm');
    });
  });
});

describe('CardContent Component', () => {
  describe('Rendering', () => {
    it('renders children', () => {
      render(<CardContent>Content here</CardContent>);

      expect(screen.getByText('Content here')).toBeInTheDocument();
    });

    it('renders with padding', () => {
      render(<CardContent data-testid="content">Content</CardContent>);

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('p-4');
      expect(content).toHaveClass('pt-0');
    });

    it('has responsive padding', () => {
      render(<CardContent data-testid="content">Content</CardContent>);

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('sm:p-6');
    });

    it('forwards ref', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardContent ref={ref}>Content</CardContent>);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('merges custom className', () => {
      render(<CardContent className="space-y-4" data-testid="content">Content</CardContent>);

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('space-y-4');
      expect(content).toHaveClass('p-4');
    });
  });
});

describe('CardFooter Component', () => {
  describe('Rendering', () => {
    it('renders children', () => {
      render(<CardFooter>Footer content</CardFooter>);

      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('renders with flex layout', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);

      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('flex');
      expect(footer).toHaveClass('items-center');
    });

    it('renders with padding', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);

      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('p-4');
      expect(footer).toHaveClass('pt-0');
    });

    it('has responsive padding', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);

      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('sm:p-6');
    });

    it('forwards ref', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardFooter ref={ref}>Footer</CardFooter>);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('merges custom className', () => {
      render(<CardFooter className="justify-between" data-testid="footer">Footer</CardFooter>);

      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('justify-between');
      expect(footer).toHaveClass('flex');
    });
  });
});

describe('Card Composition', () => {
  it('renders full card with all parts', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
          <CardDescription>Review your payment details</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Amount: $100.00</p>
        </CardContent>
        <CardFooter>
          <button>Confirm</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByText('Payment Summary')).toBeInTheDocument();
    expect(screen.getByText('Review your payment details')).toBeInTheDocument();
    expect(screen.getByText('Amount: $100.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
  });

  it('renders card without header', () => {
    render(
      <Card data-testid="card">
        <CardContent>Content only</CardContent>
      </Card>
    );

    expect(screen.getByText('Content only')).toBeInTheDocument();
  });

  it('renders card without footer', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Content</CardContent>
      </Card>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders card with multiple content sections', () => {
    render(
      <Card data-testid="card">
        <CardContent>Section 1</CardContent>
        <CardContent>Section 2</CardContent>
      </Card>
    );

    expect(screen.getByText('Section 1')).toBeInTheDocument();
    expect(screen.getByText('Section 2')).toBeInTheDocument();
  });

  it('renders nested elements correctly', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>
            <span data-testid="icon">🔔</span>
            Notifications
          </CardTitle>
          <CardDescription>
            You have <strong>3</strong> unread messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul>
            <li>Message 1</li>
            <li>Message 2</li>
            <li>Message 3</li>
          </ul>
        </CardContent>
      </Card>
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Message 1')).toBeInTheDocument();
  });
});

describe('Card Accessibility', () => {
  it('supports role attribute', () => {
    render(<Card role="region" aria-label="User Profile" data-testid="card">Content</Card>);

    const card = screen.getByTestId('card');
    expect(card).toHaveAttribute('role', 'region');
    expect(card).toHaveAttribute('aria-label', 'User Profile');
  });

  it('supports tabIndex for focusable cards', () => {
    render(<Card tabIndex={0} data-testid="card">Focusable Card</Card>);

    const card = screen.getByTestId('card');
    expect(card).toHaveAttribute('tabIndex', '0');
  });

  it('supports onClick for clickable cards', async () => {
    const handleClick = jest.fn();
    render(
      <Card onClick={handleClick} data-testid="card" role="button">
        Clickable Card
      </Card>
    );

    const card = screen.getByTestId('card');
    card.click();

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
