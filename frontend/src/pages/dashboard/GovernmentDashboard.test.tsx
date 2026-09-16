import { render, screen, within } from '@testing-library/react';
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
      screen.getByText(/a work can appear at both stages, so the two counts may overlap/i),
    ).toBeInTheDocument();
  });

  it('renders the regional insight section', async () => {
    renderDashboard(createDemoDataProvider());
    expect(
      await screen.findByRole('heading', { name: 'Top states by number of works' }),
    ).toBeInTheDocument();
  });

  it('shows named anomaly cards that deep-link into the risk queue', async () => {
    renderDashboard(createDemoDataProvider());

    expect(
      await screen.findByRole('heading', { name: 'Risk factors detected' }),
    ).toBeInTheDocument();

    const cards = document.querySelectorAll('.anomaly-card');
    expect(cards.length).toBeGreaterThan(0);

    const viewLinks = screen.getAllByRole('link', { name: /View cases/ });
    expect(viewLinks.length).toBe(cards.length);
    for (const link of viewLinks) {
      expect(link.getAttribute('href')).toMatch(/^\/risk\?factor=[a-z-]+$/);
    }
  });

  it('does not embed the full project register or a second filter block', async () => {
    renderDashboard(createDemoDataProvider());

    await screen.findByRole('heading', { name: 'Projects requiring attention' });

    expect(screen.queryByRole('heading', { name: 'Project exploration' })).not.toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Project exploration' })).not.toBeInTheDocument();
    // teaser links into the dedicated screens instead
    expect(screen.getByRole('link', { name: /Open full register/ })).toHaveAttribute('href', '/projects');
    expect(screen.getByRole('link', { name: /Open risk queue/ })).toHaveAttribute('href', '/risk');
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
      listDuplicateWorks: vi.fn().mockResolvedValue({ pairs: [], totalFound: 0 }),
      listFundRequests: vi.fn().mockResolvedValue([]),
      getFundRequest: vi.fn().mockResolvedValue(null),
      createFundRequest: vi.fn(),
      sendFundReleaseNotice: vi.fn(),
      getProjectPayments: vi.fn().mockResolvedValue([]),
      listPublicProjects: vi.fn().mockResolvedValue([]),
      getPublicProject: vi.fn().mockResolvedValue(null),
      listGrievances: vi.fn().mockResolvedValue([]),
      submitGrievance: vi.fn(),
      updateGrievanceStatus: vi.fn(),
      listFieldOfficers: vi.fn().mockResolvedValue([]),
      listAssignments: vi.fn().mockResolvedValue([]),
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
      requestAssignmentSignOff: vi.fn(),
      confirmAssignmentSignOff: vi.fn(),
      getAuditPhotos: vi.fn().mockResolvedValue({ photos: [], configured: false }),
      listNotifications: vi.fn().mockResolvedValue([]),
      markNotificationRead: vi.fn(),
      markAllNotificationsRead: vi.fn(),
      clearAllNotifications: vi.fn(),
      sendSlaNotice: vi.fn(),
      listWorkRecommendations: vi.fn().mockResolvedValue([]),
      submitWorkRecommendation: vi.fn(),
      updateWorkRecommendationStatus: vi.fn(),
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
      listDuplicateWorks: vi.fn().mockResolvedValue({ pairs: [], totalFound: 0 }),
      listFundRequests: vi.fn().mockResolvedValue([]),
      getFundRequest: vi.fn().mockResolvedValue(null),
      createFundRequest: vi.fn(),
      sendFundReleaseNotice: vi.fn(),
      getProjectPayments: vi.fn().mockResolvedValue([]),
      listPublicProjects: vi.fn().mockResolvedValue([]),
      getPublicProject: vi.fn().mockResolvedValue(null),
      listGrievances: vi.fn().mockResolvedValue([]),
      submitGrievance: vi.fn(),
      updateGrievanceStatus: vi.fn(),
      listFieldOfficers: vi.fn().mockResolvedValue([]),
      listAssignments: vi.fn().mockResolvedValue([]),
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
      requestAssignmentSignOff: vi.fn(),
      confirmAssignmentSignOff: vi.fn(),
      getAuditPhotos: vi.fn().mockResolvedValue({ photos: [], configured: false }),
      listNotifications: vi.fn().mockResolvedValue([]),
      markNotificationRead: vi.fn(),
      markAllNotificationsRead: vi.fn(),
      clearAllNotifications: vi.fn(),
      sendSlaNotice: vi.fn(),
      listWorkRecommendations: vi.fn().mockResolvedValue([]),
      submitWorkRecommendation: vi.fn(),
      updateWorkRecommendationStatus: vi.fn(),
    };
    renderDashboard(failingProvider);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('backend down');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
