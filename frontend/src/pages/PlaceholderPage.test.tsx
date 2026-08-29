import { render, screen } from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ProjectDetailPage } from './featurePages';
import { PlaceholderPage } from './PlaceholderPage';

describe('PlaceholderPage', () => {
  it('renders the page title and a "later phase" notice, with no business content', () => {
    render(
      <MemoryRouter>
        <PlaceholderPage title="Overview" description="Programme-wide summary." />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText(/implemented in a later phase/i)).toBeInTheDocument();
  });

  it('ProjectDetailPage surfaces the route id in its breadcrumb', () => {
    const router = createMemoryRouter([{ path: '/projects/:id', element: <ProjectDetailPage /> }], {
      initialEntries: ['/projects/900000001'],
    });
    render(<RouterProvider router={router} />);
    expect(screen.getByText('Work 900000001')).toBeInTheDocument();
  });
});
