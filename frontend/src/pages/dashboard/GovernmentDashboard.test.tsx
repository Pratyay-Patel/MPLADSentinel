import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DataProviderProvider, type DataProvider, type ProjectSummary } from '../../data';
import { createDemoDataProvider } from '../../data/demo/DemoDataProvider';
import { ProviderError } from '../../data/errors';
import { FilterProvider } from '../../filters';
import { GovernmentDashboard } from './GovernmentDashboard';

function renderDashboard(provider: DataProvider) {
  return render(
    <MemoryRouter>
      <DataProviderProvider provider={provider}>
        <FilterProvider>
          <GovernmentDashboard />
        </FilterProvider>
      </DataProviderProvider>
    </MemoryRouter>,
  );
}

const zeroSummary: ProjectSummary = {
  totalProjects: 0,
  byLifecycleState: { RECOMMENDED: 0, COMPLETED: 0, RECOMMENDED_AND_COMPLETED: 0 },
  byPaymentDataState: { NOT_FETCHED: 0, FETCHED_PRESENT: 0, FETCHED_ABSENT: 0, FETCH_ERROR: 0 },
  totalEstimatedCost: { amount: 0, currency: 'INR' },
  totalRecordedPayments: { amount: 0, currency: 'INR' },
};

describe('GovernmentDashboard', () => {
  it('renders the dashboard with the four national overview metrics', async () => {
    renderDashboard(createDemoDataProvider());

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Government Intelligence Dashboard' }),
    ).toBeInTheDocument();

    const overview = screen.getByRole('region', { name: 'National overview' });
    for (const label of [
      'Total works',
      'Recommended works',
      'Completed works',
      'Recorded payments',
    ]) {
      expect(within(overview).getByText(label)).toBeInTheDocument();
    }
    // the "Total works" metric shows the dataset size (14 demo records)
    expect(within(overview).getByText('14')).toBeInTheDocument();
  });

  it('gives Projects Requiring Attention its own section with risk levels shown as text', async () => {
    renderDashboard(createDemoDataProvider());

    expect(
      await screen.findByRole('heading', { name: 'Projects requiring attention' }),
    ).toBeInTheDocument();

    const table = screen.getByRole('table', { name: 'Projects requiring attention' });
    const rows = within(table).getAllByRole('row');
    expect(rows.length).toBeGreaterThan(1); // header + data rows
    expect(within(table).getAllByText(/HIGH RISK/).length).toBeGreaterThan(0);
    // headline explanation present (not colour-only)
    expect(
      within(table).getAllByText(/indicators detected|dormant|installment|cohort|%/i).length,
    ).toBeGreaterThan(0);
  });

  it('renders Financial Intelligence and Work Distribution', async () => {
    renderDashboard(createDemoDataProvider());

    expect(
      await screen.findByRole('heading', { name: 'Financial intelligence' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Recorded payments represent about/i)).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Work distribution' })).toBeInTheDocument();
    expect(
      screen.getByText(/two source listings, not a measured project lifecycle/i),
    ).toBeInTheDocument();
  });

  it('renders the regional insight section', async () => {
    renderDashboard(createDemoDataProvider());
    expect(
      await screen.findByRole('heading', { name: 'Top states by number of works' }),
    ).toBeInTheDocument();
  });

  it('filters the project exploration table by state', async () => {
    renderDashboard(createDemoDataProvider());

    // wait for load
    await screen.findByRole('heading', { name: 'Project exploration' });
    const exploration = screen.getByRole('table', { name: 'Project exploration' });
    const before = within(exploration).getAllByRole('row').length;

    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'Kerala' } });

    await waitFor(() => {
      expect(screen.getByText(/projects match/)).toHaveTextContent('2 projects match');
    });
    const after = within(exploration).getAllByRole('row').length;
    expect(after).toBeLessThan(before);
    expect(within(exploration).queryByText(/protection wall/i)).not.toBeInTheDocument(); // Rajasthan work
    expect(within(exploration).getByText(/solar street lighting/i)).toBeInTheDocument(); // Kerala work
  });

  it('shows the empty state when the provider returns no works', async () => {
    const emptyProvider: DataProvider = {
      source: 'demo',
      getBackendHealth: vi.fn(),
      listProjects: vi.fn().mockResolvedValue([]),
      getProject: vi.fn().mockResolvedValue(null),
      getProjectSummary: vi.fn().mockResolvedValue(zeroSummary),
      getProjectRisk: vi.fn().mockResolvedValue(null),
      listProjectRisks: vi.fn().mockResolvedValue({}),
      getProjectPayments: vi.fn().mockResolvedValue([]),
      listPublicProjects: vi.fn().mockResolvedValue([]),
      getPublicProject: vi.fn().mockResolvedValue(null),
      listGrievances: vi.fn().mockResolvedValue([]),
      submitGrievance: vi.fn(),
      updateGrievanceStatus: vi.fn(),
    };
    renderDashboard(emptyProvider);
    expect(await screen.findByText('No work data available')).toBeInTheDocument();
  });

  it('shows the error state with a retry action when the provider fails', async () => {
    const failingProvider: DataProvider = {
      source: 'demo',
      getBackendHealth: vi.fn(),
      listProjects: vi.fn().mockRejectedValue(new ProviderError('unavailable', 'backend down')),
      getProject: vi.fn().mockResolvedValue(null),
      getProjectSummary: vi.fn().mockResolvedValue(zeroSummary),
      getProjectRisk: vi.fn().mockResolvedValue(null),
      listProjectRisks: vi.fn().mockResolvedValue({}),
      getProjectPayments: vi.fn().mockResolvedValue([]),
      listPublicProjects: vi.fn().mockResolvedValue([]),
      getPublicProject: vi.fn().mockResolvedValue(null),
      listGrievances: vi.fn().mockResolvedValue([]),
      submitGrievance: vi.fn(),
      updateGrievanceStatus: vi.fn(),
    };
    renderDashboard(failingProvider);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('backend down');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
