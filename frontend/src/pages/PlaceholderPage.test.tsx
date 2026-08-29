import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { PlaceholderPage } from './PlaceholderPage';

describe('PlaceholderPage', () => {
  it('renders the page title and a "later phase" notice, with no business content', () => {
    render(
      <MemoryRouter>
        <PlaceholderPage title="Projects" description="Searchable register of MPLADS works." />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByText(/implemented in a later phase/i)).toBeInTheDocument();
  });
});
