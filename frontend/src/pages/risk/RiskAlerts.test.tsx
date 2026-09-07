import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DataProviderProvider, type DataProvider } from '../../data';
import { createDemoDataProvider } from '../../data/demo/DemoDataProvider';
import { ProviderError } from '../../data/errors';
import { FilterProvider } from '../../filters';
import { RiskAlerts } from './RiskAlerts';

function renderRisk(provider: DataProvider = createDemoDataProvider()) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <FilterProvider>
            <RiskAlerts />
          </FilterProvider>
        ),
      },
    ],
    { initialEntries: ['/'] },
  );
  return render(
    <DataProviderProvider provider={provider}>
      <RouterProvider router={router} />
    </DataProviderProvider>,
  );
}

describe('RiskAlerts', () => {
  it('lists every work most-severe first with per-level counts and the real indicators', async () => {
    const { container } = renderRisk();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Risk & Alerts' }),
    ).toBeInTheDocument();

    const grid = container.querySelector('.ui-metric-grid') as HTMLElement;
    for (const label of ['HIGH risk', 'MEDIUM risk', 'LOW risk', 'UNKNOWN risk']) {
      expect(within(grid).getByText(label)).toBeInTheDocument();
    }

    const table = screen.getByRole('table', { name: 'Risk and alerts' });
    const bodyRows = within(table).getAllByRole('row').slice(1); // drop the header row
    expect(bodyRows).toHaveLength(14);

    // most severe first
    expect(within(bodyRows[0]).getByText(/HIGH RISK/)).toBeInTheDocument();

    // the actual rule text is shown, not just a count
    expect(
      within(table).getAllByText(
        /no payment records|exceed the estimated cost|highest for the|single installment|could not be retrieved/i,
      ).length,
    ).toBeGreaterThan(0);
  });

  it('shows a one-line review summary instead of repeating the Overview risk chart', async () => {
    const { container } = renderRisk();
    await screen.findByRole('table', { name: 'Risk and alerts' });

    expect(screen.getByText(/flagged for\s+review \(HIGH or MEDIUM risk\)/i)).toBeInTheDocument();
    // the duplicated donut + "Most common risk factors" card is gone from /risk
    expect(container.querySelector('.risk-signals')).toBeNull();
    expect(screen.queryByText('Most common risk factors')).not.toBeInTheDocument();
  });

  it('filters the table by risk level', async () => {
    const { container } = renderRisk();
    await screen.findByRole('table', { name: 'Risk and alerts' });

    fireEvent.change(screen.getByLabelText('Risk level'), { target: { value: 'UNKNOWN' } });

    await waitFor(() => {
      const table = screen.getByRole('table', { name: 'Risk and alerts' });
      expect(within(table).getAllByRole('row').slice(1)).toHaveLength(2);
    });

    const table = screen.getByRole('table', { name: 'Risk and alerts' });
    expect(within(table).queryByText(/HIGH RISK/)).not.toBeInTheDocument();

    const foot = container.querySelector('.risk-filters__foot') as HTMLElement;
    expect(within(foot).getByText('2 works')).toBeInTheDocument();
  });

  it('shows an empty state when the provider returns no works', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listProjects: vi.fn().mockResolvedValue([]),
    };
    renderRisk(provider);

    expect(await screen.findByText('No works to assess')).toBeInTheDocument();
  });

  it('shows an error state with retry when the load fails', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listProjects: vi.fn().mockRejectedValue(new ProviderError('unavailable', 'backend down')),
    };
    renderRisk(provider);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('backend down');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
