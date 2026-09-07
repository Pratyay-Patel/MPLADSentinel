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
  it('defaults to the flagged queue (HIGH + MEDIUM only), most severe first, with real indicators', async () => {
    const { container } = renderRisk();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Risk & Alerts' }),
    ).toBeInTheDocument();

    // the per-level counts still cover every level (they summarise, not filter)
    const grid = container.querySelector('.ui-metric-grid') as HTMLElement;
    for (const label of ['HIGH risk', 'MEDIUM risk', 'LOW risk', 'UNKNOWN risk']) {
      expect(within(grid).getByText(label)).toBeInTheDocument();
    }

    // the table itself is the triage queue: HIGH + MEDIUM only (9 of the 14 demo works)
    const table = screen.getByRole('table', { name: 'Risk and alerts' });
    const bodyRows = within(table).getAllByRole('row').slice(1); // drop the header row
    expect(bodyRows).toHaveLength(9);
    expect(within(table).queryByText(/LOW RISK/)).not.toBeInTheDocument();

    // most severe first
    expect(within(bodyRows[0]).getByText(/HIGH RISK/)).toBeInTheDocument();

    // the actual rule text is shown, not just a count
    expect(
      within(table).getAllByText(
        /no payment records|exceed the estimated cost|highest for the|single installment|could not be retrieved/i,
      ).length,
    ).toBeGreaterThan(0);
  });

  it('widens the queue to every level when "Show all risk levels" is toggled on', async () => {
    renderRisk();
    const table = await screen.findByRole('table', { name: 'Risk and alerts' });
    expect(within(table).getAllByRole('row').slice(1)).toHaveLength(9);

    fireEvent.click(screen.getByLabelText(/show all risk levels/i));

    await waitFor(() => {
      expect(
        within(screen.getByRole('table', { name: 'Risk and alerts' }))
          .getAllByRole('row')
          .slice(1),
      ).toHaveLength(14);
    });
    expect(
      within(screen.getByRole('table', { name: 'Risk and alerts' })).getAllByText(/LOW RISK/).length,
    ).toBeGreaterThan(0);
  });

  it('honours a ?level= deep link over the HIGH+MEDIUM default', async () => {
    const router = createMemoryRouter(
      [{ path: '/', element: (<FilterProvider><RiskAlerts /></FilterProvider>) }],
      { initialEntries: ['/?level=unknown'] },
    );
    render(
      <DataProviderProvider provider={createDemoDataProvider()}>
        <RouterProvider router={router} />
      </DataProviderProvider>,
    );

    const table = await screen.findByRole('table', { name: 'Risk and alerts' });
    expect(within(table).getAllByRole('row').slice(1)).toHaveLength(2);
    expect(within(table).queryByText(/HIGH RISK/)).not.toBeInTheDocument();
  });

  it('offers no CSV export — that lives on the /projects register', async () => {
    renderRisk();
    await screen.findByRole('table', { name: 'Risk and alerts' });
    expect(screen.queryByText(/export csv/i)).not.toBeInTheDocument();
  });

  it('shows a one-line review summary instead of repeating the Overview risk chart', async () => {
    const { container } = renderRisk();
    await screen.findByRole('table', { name: 'Risk and alerts' });

    expect(screen.getByText(/works flagged for review/i)).toBeInTheDocument();
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
