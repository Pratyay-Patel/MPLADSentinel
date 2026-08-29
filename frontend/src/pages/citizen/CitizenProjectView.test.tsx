import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { DataProviderProvider } from '../../data';
import { createDemoDataProvider } from '../../data/demo/DemoDataProvider';
import { CitizenProjectView } from './CitizenProjectView';

function renderAt(id: string) {
  const router = createMemoryRouter([{ path: '/citizen/:id', element: <CitizenProjectView /> }], {
    initialEntries: [`/citizen/${id}`],
  });
  return render(
    <DataProviderProvider provider={createDemoDataProvider()}>
      <RouterProvider router={router} />
    </DataProviderProvider>,
  );
}

describe('CitizenProjectView', () => {
  it('shows the publicly releasable fields for a work', async () => {
    renderAt('900000006'); // Library and reading room — est 12L, final 11.4L

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Library and reading room' }),
    ).toBeInTheDocument();

    expect(screen.getByText('N. K. Singh')).toBeInTheDocument(); // MP
    expect(screen.getByText('₹12,00,000')).toBeInTheDocument(); // estimated
    expect(screen.getByText('₹11,40,000')).toBeInTheDocument(); // final

    // nothing internal leaks into the public view
    expect(screen.queryByText(/RISK/)).not.toBeInTheDocument();
    expect(screen.queryByText(/data-quality/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Risk assessment/i)).not.toBeInTheDocument();
    expect(screen.getByText(/not an official government record/i)).toBeInTheDocument();
  });

  it('shows a not-found state for an unknown work', async () => {
    renderAt('999999');

    expect(await screen.findByText('Work not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to citizen portal/i })).toBeInTheDocument();
  });
});
