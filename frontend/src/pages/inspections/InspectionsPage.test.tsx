import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { SessionProvider, type Role } from '../../auth';
import { clearDemoSession, writeDemoSession } from '../../auth/demoAuth';
import { DataProviderProvider, type DataProvider } from '../../data';
import { createDemoDataProvider } from '../../data/demo/DemoDataProvider';
import { InspectionsPage } from './InspectionsPage';

/**
 * `initialRole` drives the React session context directly (bypassing the
 * persona-picker login flow); `DemoDataProvider` reads the acting user from
 * `sessionStorage` via `readDemoSession()` instead, so tests that exercise
 * dual-authority sign-off must keep the two in sync with `writeDemoSession`.
 */
function renderPage(role: Role, provider: DataProvider = createDemoDataProvider()) {
  writeDemoSession(role);
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
  afterEach(() => clearDemoSession());

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
    fireEvent.change(screen.getByLabelText('Photos required'), { target: { value: '7' } });

    fireEvent.click(screen.getByRole('button', { name: 'Assign inspection' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/Inspection requested/);
    await waitFor(() =>
      expect(within(assignmentsTable()).getAllByText('OFF105').length).toBeGreaterThan(0),
    );
    // the chosen photo count shows on the new row (no seeded row uses 7)
    expect(within(assignmentsTable()).getByDisplayValue('7')).toBeInTheDocument();
  });

  it('gates COMPLETED/CANCELLED behind a written sign-off request, and does not apply it yet', async () => {
    renderPage('MOSPI');
    await screen.findByRole('heading', { name: 'Request an inspection' });

    const [statusSelect] = await screen.findAllByLabelText(/^Status for /);
    fireEvent.change(statusSelect, { target: { value: 'COMPLETED' } });

    // the service must not be called yet — the dialog gates it
    const dialogTitle = await screen.findByText(/Request sign-off: mark assignment .* as Completed\?/);
    expect(dialogTitle).toBeInTheDocument();
    const requestButton = screen.getByRole('button', { name: 'Request Completed' });
    expect(requestButton).toBeDisabled();

    // wrong confirmation word keeps it disabled
    fireEvent.change(screen.getByLabelText('Type COMPLETE to confirm'), {
      target: { value: 'wrong' },
    });
    fireEvent.change(screen.getByLabelText('Reason / justification'), {
      target: { value: 'Inspected on-site, work matches the sanctioned scope.' },
    });
    expect(requestButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Type COMPLETE to confirm'), {
      target: { value: 'complete' },
    });
    expect(requestButton).toBeEnabled();

    fireEvent.click(requestButton);

    // requesting alone does not close the assignment — the real status is unchanged
    expect(await screen.findByRole('status')).toHaveTextContent(/sign-off requested/i);
    expect(
      screen.queryByText(/Request sign-off: mark assignment .* as Completed\?/),
    ).not.toBeInTheDocument();
    expect(await screen.findByText(/Awaiting sign-off for Completed/)).toBeInTheDocument();

    // the requester (MOSPI) cannot confirm its own request
    expect(screen.queryByRole('button', { name: 'Confirm sign-off' })).not.toBeInTheDocument();
    expect(screen.getByText(/A different authority must confirm/)).toBeInTheDocument();
  });

  it('lets a different authority confirm a pending sign-off, closing the assignment', async () => {
    const provider = createDemoDataProvider();
    const { unmount } = renderPage('MOSPI', provider);
    await screen.findByRole('heading', { name: 'Request an inspection' });

    const [statusSelect] = await screen.findAllByLabelText(/^Status for /);
    fireEvent.change(statusSelect, { target: { value: 'CANCELLED' } });

    await screen.findByText(/Request sign-off: mark assignment .* as Cancelled\?/);
    fireEvent.change(screen.getByLabelText('Type CANCEL to confirm'), { target: { value: 'cancel' } });
    fireEvent.change(screen.getByLabelText('Reason / justification'), {
      target: { value: 'Site visit found the work abandoned.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Request Cancelled' }));
    await screen.findByRole('status');
    unmount();

    // A different, real individual (DISTRICT) signs in and independently confirms.
    renderPage('DISTRICT', provider);
    await screen.findByRole('heading', { name: 'Request an inspection' });

    // scope to this test's own row (by its distinct pending status) — a prior
    // test in this file may leave its own pending COMPLETED row behind, since
    // DemoDataProvider's assignment list is a shared in-memory singleton.
    const pendingLabel = await screen.findByText(/Awaiting sign-off for Cancelled/);
    const row = pendingLabel.closest('tr')!;
    const confirmTrigger = within(row).getByRole('button', { name: 'Confirm sign-off' });
    fireEvent.click(confirmTrigger);

    const confirmDialogTitle = await screen.findByText(
      /Confirm sign-off: mark assignment .* as Cancelled\?/,
    );
    expect(confirmDialogTitle).toBeInTheDocument();
    expect(screen.getByText(/Site visit found the work abandoned\./)).toBeInTheDocument();

    const finalizeButton = screen.getByRole('button', { name: 'Finalize sign-off' });
    expect(finalizeButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Type CANCEL to confirm'), { target: { value: 'cancel' } });
    fireEvent.change(screen.getByLabelText('Reason / justification'), {
      target: { value: 'Independently verified — abandoned as reported.' },
    });
    expect(finalizeButton).toBeEnabled();
    fireEvent.click(finalizeButton);

    expect(await screen.findByRole('status')).toHaveTextContent(/→ Cancelled/);
    expect(
      screen.queryByText(/Confirm sign-off: mark assignment .* as Cancelled\?/),
    ).not.toBeInTheDocument();
  });
});
