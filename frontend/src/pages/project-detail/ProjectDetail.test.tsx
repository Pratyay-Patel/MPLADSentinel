import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DataProviderProvider, type DataProvider } from '../../data';
import { createDemoDataProvider } from '../../data/demo/DemoDataProvider';
import { ProviderError } from '../../data/errors';
import { ProjectDetail } from './ProjectDetail';

function renderAt(id: string, provider: DataProvider = createDemoDataProvider()) {
  const router = createMemoryRouter([{ path: '/projects/:id', element: <ProjectDetail /> }], {
    initialEntries: [`/projects/${id}`],
  });
  return render(
    <DataProviderProvider provider={provider}>
      <RouterProvider router={router} />
    </DataProviderProvider>,
  );
}

describe('ProjectDetail', () => {
  it('renders a payments-present work: overview, distinct financials, installment rows, risk panel', async () => {
    renderAt('900000006'); // Library and reading room — est 12L, final 11.4L, 2 installments

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Library and reading room' }),
    ).toBeInTheDocument();

    expect(screen.getByText('N. K. Singh')).toBeInTheDocument(); // MP
    // estimated and final cost are shown as separate figures (never merged)
    expect(screen.getByText('₹12,00,000')).toBeInTheDocument(); // estimated
    expect(screen.getByText('₹11,40,000')).toBeInTheDocument(); // final (distinct from estimated)

    const table = screen.getByRole('table', { name: 'Payment installments' });
    expect(within(table).getAllByRole('row')).toHaveLength(1 + 2); // header + 2 installments
    expect(within(table).getAllByText('Payment Success')).toHaveLength(2);

    // risk panel is present (this work has no indicators)
    expect(screen.getByRole('heading', { name: 'Risk assessment' })).toBeInTheDocument();
    expect(screen.getByText(/no current indicators for this work/i)).toBeInTheDocument();

    expect(screen.getByText('MPLADS works data')).toBeInTheDocument();
  });

  it('shows the missing-records note for a FETCHED_ABSENT work and no installments table', async () => {
    renderAt('900000003');

    await screen.findByRole('heading', { level: 1, name: 'Repair of an anganwadi building' });
    expect(screen.getByText(/not that no payment was made/i)).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Payment installments' })).not.toBeInTheDocument();
  });

  it('shows a not-found state for an unknown id', async () => {
    renderAt('999999');

    expect(await screen.findByText('Work not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to dashboard/i })).toBeInTheDocument();
  });

  it('shows an error state with retry when the provider fails', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      getProject: vi.fn().mockRejectedValue(new ProviderError('unavailable', 'backend down')),
    };
    renderAt('900000006', provider);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('backend down');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
