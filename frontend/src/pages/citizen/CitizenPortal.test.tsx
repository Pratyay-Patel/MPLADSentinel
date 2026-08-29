import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DataProviderProvider, type DataProvider } from '../../data';
import { createDemoDataProvider } from '../../data/demo/DemoDataProvider';
import { ProviderError } from '../../data/errors';
import { CitizenPortal } from './CitizenPortal';

function renderPortal(provider: DataProvider = createDemoDataProvider()) {
  const router = createMemoryRouter([{ path: '/', element: <CitizenPortal /> }], {
    initialEntries: ['/'],
  });
  return render(
    <DataProviderProvider provider={provider}>
      <RouterProvider router={router} />
    </DataProviderProvider>,
  );
}

const rows = () => {
  const table = screen.getByRole('table', { name: 'Public list of MPLADS works' });
  return within(table).getAllByRole('row').slice(1);
};

describe('CitizenPortal', () => {
  it('lists works publicly, with no risk information anywhere', async () => {
    renderPortal();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Citizen Portal' }),
    ).toBeInTheDocument();

    expect(rows()).toHaveLength(14);
    expect(screen.getByText('14 of 14 works')).toBeInTheDocument();

    // no risk column / badges / scores are shown to citizens
    expect(screen.queryByText(/RISK/)).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /risk/i })).not.toBeInTheDocument();
  });

  it('filters by state', async () => {
    renderPortal();
    await screen.findByRole('table', { name: 'Public list of MPLADS works' });

    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'Kerala' } });
    await waitFor(() => expect(rows()).toHaveLength(2));
  });

  it('narrows the list with a search term', async () => {
    renderPortal();
    await screen.findByRole('table', { name: 'Public list of MPLADS works' });

    fireEvent.change(screen.getByLabelText('Search works'), {
      target: { value: 'community hall' },
    });
    await waitFor(() => expect(rows()).toHaveLength(1));
  });

  it('links each work to its public view', async () => {
    renderPortal();
    await screen.findByRole('table', { name: 'Public list of MPLADS works' });

    const links = screen.getAllByRole('link', { name: /^View / });
    expect(links[0]).toHaveAttribute('href', expect.stringMatching(/^\/citizen\/\d+$/));
  });

  it('shows an error state with retry when the load fails', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listProjects: vi.fn().mockRejectedValue(new ProviderError('unavailable', 'backend down')),
    };
    renderPortal(provider);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('backend down');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
