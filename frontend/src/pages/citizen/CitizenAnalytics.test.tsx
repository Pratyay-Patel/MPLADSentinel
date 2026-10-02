import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { DataProviderProvider } from '../../data';
import { createDemoDataProvider } from '../../data/demo/DemoDataProvider';
import { CitizenAnalytics } from './CitizenAnalytics';

function renderPage() {
  const router = createMemoryRouter([{ path: '/', element: <CitizenAnalytics /> }], {
    initialEntries: ['/'],
  });
  return render(
    <DataProviderProvider provider={createDemoDataProvider()}>
      <RouterProvider router={router} />
    </DataProviderProvider>,
  );
}

describe('CitizenAnalytics', () => {
  it('shows the fund & utilisation analytics with no risk information anywhere', async () => {
    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fund & Utilisation Analytics' }),
    ).toBeInTheDocument();

    expect(screen.getByText('Works analysed')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'MP fund-utilisation leaderboard' })).toBeInTheDocument();

    expect(screen.queryByText(/RISK/)).not.toBeInTheDocument();
    expect(screen.queryByText(/risk score/i)).not.toBeInTheDocument();
  });
});
