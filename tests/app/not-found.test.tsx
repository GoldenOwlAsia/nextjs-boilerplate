import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import NotFound from '@/app/not-found';

describe('NotFound', () => {
  it('renders a 404 message and a way back', () => {
    render(<NotFound />);

    expect(screen.getByRole('heading', { name: /could not be found/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/');
  });
});
