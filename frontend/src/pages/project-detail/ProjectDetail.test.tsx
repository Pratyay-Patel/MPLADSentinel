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
  it('renders a payments-present work: overview, distinct financials, installment rows', async () => {
    renderAt('900000002');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Multipurpose community centre' }),
    ).toBeInTheDocument();

    expect(screen.getByText('R. B. Patil')).toBeInTheDocument(); // MP
    // estimated and final cost are shown as separate figures (never merged)
    expect(screen.getByText('₹18,20,000')).toBeInTheDocument(); // estimated (recommended)
    expect(screen.getAllByText('₹16,90,000').length).toBeGreaterThan(0); // final cost

    const table = screen.getByRole('table', { name: 'Payment installments' });
    expect(within(table).getAllByRole('row')).toHaveLength(1 + 3); // header + 3 installments
    expect(within(table).getAllByText('Payment Success')).toHaveLength(3);

    expect(screen.getByText(/not an official MPLADS \/ e-SAKSHI id/i)).toBeInTheDocument();
  });

  it('shows the "not ₹0" note for a FETCHED_ABSENT work and no installments table', async () => {
    renderAt('900000003');

    await screen.findByRole('heading', { level: 1, name: 'Repair of an anganwadi building' });
    expect(screen.getByText(/not the same as ₹0 spent/i)).toBeInTheDocument();
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
    renderAt('900000002', provider);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('backend down');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
