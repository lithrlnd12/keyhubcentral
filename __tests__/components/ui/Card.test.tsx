import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';

describe('Card', () => {
  it('renders children correctly', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies default padding', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass('p-6');
  });

  it('applies small padding', () => {
    const { container } = render(<Card padding="sm">Content</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass('p-4');
  });

  it('applies no padding', () => {
    const { container } = render(<Card padding="none">Content</Card>);
    const card = container.firstChild;
    expect(card).not.toHaveClass('p-4');
    expect(card).not.toHaveClass('p-6');
    expect(card).not.toHaveClass('p-8');
  });

  it('has correct base styles', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass('bg-brand-charcoal', 'rounded-xl', 'border', 'border-gray-800');
  });

  it('accepts custom className', () => {
    const { container } = render(<Card className="custom-card">Content</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass('custom-card');
  });
});

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('has bottom margin', () => {
    const { container } = render(<CardHeader>Header</CardHeader>);
    expect(container.firstChild).toHaveClass('mb-4');
  });
});

describe('CardTitle', () => {
  it('renders as heading', () => {
    render(<CardTitle>Title</CardTitle>);
    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
  });

  it('has correct styles', () => {
    render(<CardTitle>Title</CardTitle>);
    const title = screen.getByRole('heading');
    expect(title).toHaveClass('text-lg', 'font-semibold', 'text-white');
  });
});

describe('CardDescription', () => {
  it('renders description text', () => {
    render(<CardDescription>Description text</CardDescription>);
    expect(screen.getByText('Description text')).toBeInTheDocument();
  });

  it('has muted text styling', () => {
    render(<CardDescription>Description</CardDescription>);
    const desc = screen.getByText('Description');
    expect(desc).toHaveClass('text-sm', 'text-gray-400');
  });
});

describe('CardContent', () => {
  it('renders children', () => {
    render(<CardContent>Content here</CardContent>);
    expect(screen.getByText('Content here')).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(<CardContent className="custom-content">Content</CardContent>);
    expect(screen.getByText('Content')).toHaveClass('custom-content');
  });
});
