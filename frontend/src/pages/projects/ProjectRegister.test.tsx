import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DataProviderProvider, type DataProvider } from '../../data';
import { createDemoDataProvider } from '../../data/demo/DemoDataProvider';
import { ProviderError } from '../../data/errors';
import { FilterProvider } from '../../filters';
import { ProjectRegister } from './ProjectRegister';

function renderRegister(provider: DataProvider = createDemoDataProvider()) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <FilterProvider>
            <ProjectRegister />
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

function tableRows() {
  const table = screen.getByRole('table', { name: 'Project register' });
  return within(table).getAllByRole('row').slice(1); // drop header
}

describe('ProjectRegister', () => {
  it('lists every work with a status and risk indicator', async () => {
    renderRegister();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Project Register' }),
    ).toBeInTheDocument();

    expect(tableRows()).toHaveLength(14);
    expect(screen.getByText('14 of 14 works')).toBeInTheDocument();

    const firstRow = tableRows()[0];
    expect(within(firstRow).getByText(/RISK$/)).toBeInTheDocument();
  });

  it('filters by risk level', async () => {
    renderRegister();
    await screen.findByRole('table', { name: 'Project register' });

    fireEvent.change(screen.getByLabelText('Risk level'), { target: { value: 'UNKNOWN' } });

    await waitFor(() => expect(tableRows()).toHaveLength(2));
    const table = screen.getByRole('table', { name: 'Project register' });
    expect(within(table).queryByText('HIGH RISK')).not.toBeInTheDocument();
  });

  it('filters by state via the global filter bar and clears it', async () => {
    renderRegister();
    await screen.findByRole('table', { name: 'Project register' });

    const globalBar = screen.getByRole('search', { name: 'Filter all views' });
    fireEvent.change(within(globalBar).getByLabelText('State'), { target: { value: 'Kerala' } });
    await waitFor(() => expect(tableRows()).toHaveLength(2));

    fireEvent.click(within(globalBar).getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(tableRows()).toHaveLength(14));
  });

  it('narrows the list with a free-text search', async () => {
    renderRegister();
    await screen.findByRole('table', { name: 'Project register' });

    fireEvent.change(screen.getByLabelText('Search the register'), {
      target: { value: 'community hall' },
    });

    await waitFor(() => expect(tableRows()).toHaveLength(1));
    expect(screen.getByText(/community hall/i)).toBeInTheDocument();
  });

  it('shows an empty state when the provider returns no works', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listProjects: vi.fn().mockResolvedValue([]),
    };
    renderRegister(provider);
    expect(await screen.findByText('No works available')).toBeInTheDocument();
  });

  it('shows an error state with retry when the load fails', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listProjects: vi.fn().mockRejectedValue(new ProviderError('unavailable', 'backend down')),
    };
    renderRegister(provider);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('backend down');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
