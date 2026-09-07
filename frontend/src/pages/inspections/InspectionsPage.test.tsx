import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { SessionProvider, type Role } from '../../auth';
import { DataProviderProvider, type DataProvider } from '../../data';
import { createDemoDataProvider } from '../../data/demo/DemoDataProvider';
import { InspectionsPage } from './InspectionsPage';

function renderPage(role: Role, provider: DataProvider = createDemoDataProvider()) {
  const router = createMemoryRouter(
    [
      { path: '/inspections', element: <InspectionsPage /> },
      { path: '/audit', element: <p>audit page</p> },
    ],
    { initialEntries: ['/inspections'] },
  );
  return render(
    <SessionProvider initialRole={role}>
      <DataProviderProvider provider={provider}>
        <RouterProvider router={router} />
      </DataProviderProvider>
    </SessionProvider>,
  );
}

const assignmentsTable = () => screen.getByRole('table', { name: 'Inspection assignments' });

describe('InspectionsPage', () => {
  it('shows the assign form and the seeded assignments for MoSPI', async () => {
    renderPage('MOSPI');

    expect(await screen.findByRole('heading', { name: 'Request an inspection' })).toBeInTheDocument();
    // seeded demo assignments render
    await waitFor(() =>
      expect(within(assignmentsTable()).getAllByText(/OFF10\d/).length).toBeGreaterThan(0),
    );
    expect(within(assignmentsTable()).getAllByRole('link', { name: /open trail/i }).length)
      .toBeGreaterThan(0);
  });

  it('hides the assign form for a read-only role (MP)', async () => {
    renderPage('MP');

    await screen.findByRole('heading', { name: 'Assignments' });
    expect(screen.queryByRole('heading', { name: 'Request an inspection' })).not.toBeInTheDocument();
  });

  it('validates the assign form and then creates an assignment', async () => {
    renderPage('DISTRICT');
    await screen.findByRole('heading', { name: 'Request an inspection' });

    fireEvent.click(screen.getByRole('button', { name: 'Assign inspection' }));
    expect(await screen.findByText('Choose a work to inspect.')).toBeInTheDocument();
    expect(screen.getByText('Choose a field officer.')).toBeInTheDocument();

    const workSelect = screen.getByLabelText('Work') as HTMLSelectElement;
    const firstWork = Array.from(workSelect.options).find((o) => o.value !== '');
    fireEvent.change(workSelect, { target: { value: firstWork!.value } });
    fireEvent.change(screen.getByLabelText('Field officer'), { target: { value: 'OFF105' } });

    fireEvent.click(screen.getByRole('button', { name: 'Assign inspection' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/Inspection requested/);
    await waitFor(() =>
      expect(within(assignmentsTable()).getAllByText('OFF105').length).toBeGreaterThan(0),
    );
  });
});
