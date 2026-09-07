import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DataProviderProvider, type DataProvider } from '../../data';
import { createDemoDataProvider } from '../../data/demo/DemoDataProvider';
import { ProviderError } from '../../data/errors';
import { AnalyticsPage } from './AnalyticsPage';

function renderAnalytics(provider: DataProvider = createDemoDataProvider()) {
  return render(
    <MemoryRouter>
      <DataProviderProvider provider={provider}>
        <AnalyticsPage />
      </DataProviderProvider>
    </MemoryRouter>,
  );
}

describe('AnalyticsPage', () => {
  it('renders the KPI strip with a recorded-utilisation tile', async () => {
    const { container } = renderAnalytics();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fund & Utilisation Analytics' }),
    ).toBeInTheDocument();

    const grid = container.querySelector('.ui-metric-grid') as HTMLElement;
    for (const label of [
      'Works analysed',
      'Sanctioned (total)',
      'Recorded payments',
      'Recorded utilisation',
      'Completed vs not',
    ]) {
      expect(within(grid).getByText(label)).toBeInTheDocument();
    }
  });

  it('renders both chart sections and the computed observations', async () => {
    renderAnalytics();

    expect(
      await screen.findByRole('heading', { name: 'States & UTs by recorded fund utilisation' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'MPs by utilisation band' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Data-derived observations' })).toBeInTheDocument();
    expect(screen.getByText(/unknown, not zero/i)).toBeInTheDocument();
  });

  it('carries the "recorded, not audited" caveat', async () => {
    renderAnalytics();
    expect(
      await screen.findByText(/not audited expenditure/i),
    ).toBeInTheDocument();
  });

  it('lists the individual MPs behind the band chart in a leaderboard', async () => {
    renderAnalytics();

    expect(
      await screen.findByRole('heading', { name: 'MP fund-utilisation leaderboard' }),
    ).toBeInTheDocument();

    const table = screen.getByRole('table', { name: 'MP fund-utilisation leaderboard' });
    const bodyRows = within(table).getAllByRole('row').slice(1);
    expect(bodyRows.length).toBeGreaterThan(0);
    // a Band cell is a StatusBadge with the band word
    expect(
      within(table).getAllByText(/^(High|Good|Moderate|Low)$/).length,
    ).toBeGreaterThan(0);

    // filterable by band
    expect(screen.getByLabelText('Filter MPs by band')).toBeInTheDocument();
  });

  it('lets the states chart be filtered by band and scrolls rather than growing unbounded', async () => {
    const { container } = renderAnalytics();
    await screen.findByRole('heading', { name: 'States & UTs by recorded fund utilisation' });

    expect(screen.getByLabelText('Filter states by band')).toBeInTheDocument();
    // the chart lives in a fixed-height scroll frame, not a full-height render
    expect(container.querySelector('.an-scroll')).not.toBeNull();
  });

  it('shows the empty state when the provider returns no works', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listProjects: vi.fn().mockResolvedValue([]),
    };
    renderAnalytics(provider);
    expect(await screen.findByText('No work data available')).toBeInTheDocument();
  });

  it('shows an error state with retry when the load fails', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listProjects: vi.fn().mockRejectedValue(new ProviderError('unavailable', 'backend down')),
    };
    renderAnalytics(provider);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('backend down');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
