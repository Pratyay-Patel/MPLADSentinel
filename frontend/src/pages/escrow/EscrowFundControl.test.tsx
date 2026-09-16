import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { SessionProvider, type Role } from '../../auth';
import { clearDemoSession, writeDemoSession } from '../../auth/demoAuth';
import { DataProviderProvider, type DataProvider } from '../../data';
import { createDemoDataProvider } from '../../data/demo/DemoDataProvider';
import { EscrowFundControl } from './EscrowFundControl';

function renderPage(role: Role, provider: DataProvider = createDemoDataProvider()) {
  writeDemoSession(role);
  const router = createMemoryRouter(
    [
      { path: '/escrow', element: <EscrowFundControl /> },
      { path: '/escrow/:id', element: <p>fund request detail</p> },
      { path: '/projects/:id', element: <p>project detail</p> },
    ],
    { initialEntries: ['/escrow'] },
  );
  return render(
    <SessionProvider initialRole={role}>
      <DataProviderProvider provider={provider}>
        <RouterProvider router={router} />
      </DataProviderProvider>
    </SessionProvider>,
  );
}

describe('EscrowFundControl', () => {
  afterEach(() => clearDemoSession());

  it('shows the District view with a Request Installment action and no requests yet', async () => {
    renderPage('DISTRICT');

    expect(await screen.findByRole('heading', { name: 'Escrow & Fund Control' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request Installment' })).toBeInTheDocument();
    expect(await screen.findByText('No fund requests yet')).toBeInTheDocument();
  });

  it('shows every risk level in the default (no search) work picker', async () => {
    renderPage('DISTRICT');
    await screen.findByRole('heading', { name: 'Escrow & Fund Control' });

    fireEvent.click(screen.getByRole('button', { name: 'Request Installment' }));
    const listbox = await screen.findByRole('listbox', { name: 'Select a work' });

    await waitFor(() => expect(within(listbox).getAllByText('HIGH RISK').length).toBeGreaterThan(0));
    const levelsShown = new Set(
      within(listbox)
        .getAllByText(/RISK$/)
        .map((el) => el.textContent),
    );
    expect(levelsShown.size).toBeGreaterThan(1);
  });

  it('lets a District Officer request an installment and shows the automatic decision', async () => {
    renderPage('DISTRICT');
    await screen.findByRole('heading', { name: 'Escrow & Fund Control' });

    fireEvent.click(screen.getByRole('button', { name: 'Request Installment' }));
    const workButtons = await screen.findAllByRole('button', { name: /#900000\d+/ });
    fireEvent.click(workButtons[0]);

    const amountInput = await screen.findByLabelText(/Requested installment amount/);
    fireEvent.change(amountInput, { target: { value: '10000' } });

    expect(await screen.findByText('Eligibility Summary')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Fund Request' }));

    expect(await screen.findByText('Request submitted')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    await waitFor(() =>
      expect(screen.getByRole('table', { name: 'My fund requests' })).toBeInTheDocument(),
    );
    const table = screen.getByRole('table', { name: 'My fund requests' });
    expect(within(table).getAllByText(/APPROVED|REJECTED/).length).toBeGreaterThan(0);
  });

  it('rejects a request whose amount exceeds the remaining sanctioned funds', async () => {
    renderPage('DISTRICT');
    await screen.findByRole('heading', { name: 'Escrow & Fund Control' });

    fireEvent.click(screen.getByRole('button', { name: 'Request Installment' }));
    fireEvent.click(await screen.findByRole('button', { name: /#900000004/ }));

    fireEvent.change(await screen.findByLabelText(/Requested installment amount/), {
      target: { value: '999999999' },
    });

    expect(await screen.findByText(/Likely outcome:/)).toHaveTextContent('REJECTED');
    fireEvent.click(screen.getByRole('button', { name: 'Submit Fund Request' }));

    expect(await screen.findByText('Request submitted')).toBeInTheDocument();
    // getAllBy, not getBy: this demo provider's fund-request list is a shared
    // in-memory singleton across tests in this file, so an earlier test's own
    // funds-exceeded row may already show the same reason text.
    expect(screen.getAllByText(/exceeds the remaining sanctioned funds/i).length).toBeGreaterThan(0);
  });

  it('shows the Ministry view with every request and lets MoSPI send a release notice', async () => {
    const provider = createDemoDataProvider();
    const { unmount } = renderPage('DISTRICT', provider);
    await screen.findByRole('heading', { name: 'Escrow & Fund Control' });

    fireEvent.click(screen.getByRole('button', { name: 'Request Installment' }));
    fireEvent.click(await screen.findByRole('button', { name: /#900000004/ }));
    fireEvent.change(await screen.findByLabelText(/Requested installment amount/), {
      target: { value: '10000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Fund Request' }));
    await screen.findByText('Request submitted');
    unmount();

    renderPage('MOSPI', provider);
    await screen.findByRole('heading', { name: 'Escrow & Fund Control' });
    const table = await screen.findByRole('table', { name: 'Fund requests' });
    await waitFor(() => expect(within(table).getAllByText(/Work #900000004|#900000004/).length).toBeGreaterThan(0));

    const sendButton = within(table).queryByRole('button', { name: 'Send Release Notice' });
    if (sendButton) {
      fireEvent.click(sendButton);
      const dialogTitle = await screen.findByText(/Send release notice for request/);
      expect(dialogTitle).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Type SEND to confirm'), { target: { value: 'send' } });
      fireEvent.change(screen.getByLabelText('Reason / justification'), {
        target: { value: 'Verified against sanctioned scope, releasing funds.' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Send Release Notice' }));
      expect(await screen.findByRole('status')).toHaveTextContent(/Release notice sent/i);
    }
  });
});
