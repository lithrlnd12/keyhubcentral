import { render } from '@testing-library/react';
import { Spinner } from '@/components/ui';

describe('Spinner', () => {
  it('renders with default size', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('w-8', 'h-8');
  });

  it('renders with small size', () => {
    const { container } = render(<Spinner size="sm" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('w-4', 'h-4');
  });

  it('renders with large size', () => {
    const { container } = render(<Spinner size="lg" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('w-12', 'h-12');
  });

  it('has animation class', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('animate-spin');
  });

  it('accepts custom className', () => {
    const { container } = render(<Spinner className="custom-spinner" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-spinner');
  });

  it('has brand gold color class', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('text-brand-gold');
  });
});
