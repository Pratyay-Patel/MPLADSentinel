import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { DataProviderProvider } from '../../data';
import { createDemoDataProvider } from '../../data/demo/DemoDataProvider';
import { CitizenOverview } from './CitizenOverview';

function renderOverview() {
  const router = createMemoryRouter([{ path: '/', element: <CitizenOverview /> }], {
    initialEntries: ['/'],
  });
  return render(
    <DataProviderProvider provider={createDemoDataProvider()}>
      <RouterProvider router={router} />
    </DataProviderProvider>,
  );
}

describe('CitizenOverview', () => {
  it('shows national metrics and the state map with no risk information anywhere', async () => {
    renderOverview();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Transparency Overview' }),
    ).toBeInTheDocument();

    expect(screen.getByText('Total works')).toBeInTheDocument();
    expect(screen.getByText('Completion rate')).toBeInTheDocument();
    expect(screen.getByText('Works across India')).toBeInTheDocument();

    // no risk donut, no anomaly cards, no attention list, no risk score/badge anywhere
    expect(screen.queryByText(/RISK/)).not.toBeInTheDocument();
    expect(screen.queryByText(/risk score/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/projects requiring attention/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/anomaly/i)).not.toBeInTheDocument();
  });
});
