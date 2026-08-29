import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Input } from './Input';
import { MetricCard } from './MetricCard';

describe('Button', () => {
  it('renders its label, applies the variant class, defaults to type=button and fires onClick', () => {
    const onClick = vi.fn();
    render(
      <Button variant="primary" onClick={onClick}>
        Save changes
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save changes' });
    expect(button).toHaveClass('ui-btn', 'ui-btn--primary');
    expect(button).toHaveAttribute('type', 'button');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('MetricCard', () => {
  it('renders the label, the pre-formatted value and an optional hint', () => {
    render(<MetricCard label="Total works" value="1,234" hint="across demo districts" />);
    expect(screen.getByText('Total works')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('across demo districts')).toBeInTheDocument();
  });
});

describe('Input', () => {
  it('associates its label and exposes validation errors accessibly', () => {
    render(<Input label="Search term" error="This field is required" />);
    const input = screen.getByLabelText('Search term');
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });
});

describe('EmptyState / ErrorState', () => {
  it('EmptyState shows its title and description', () => {
    render(<EmptyState title="Nothing to show" description="Try adjusting the filters." />);
    expect(screen.getByText('Nothing to show')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting the filters.')).toBeInTheDocument();
  });

  it('ErrorState is announced and can trigger a retry', () => {
    const onRetry = vi.fn();
    render(<ErrorState description="The data provider failed." onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('The data provider failed.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
