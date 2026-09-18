import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { SessionProvider, type Role } from '../../auth';
import { clearDemoSession, writeDemoSession } from '../../auth/demoAuth';
import { DataProviderProvider, type DataProvider } from '../../data';
import { createDemoDataProvider } from '../../data/demo/DemoDataProvider';
import { EscrowFundControl } from './EscrowFundControl';
import { FundRequestDetail } from './FundRequestDetail';

function renderDetail(role: Role, id: string, provider: DataProvider = createDemoDataProvider()) {
  writeDemoSession(role);
  const router = createMemoryRouter(
    [
      { path: '/escrow/:id', element: <FundRequestDetail /> },
      { path: '/escrow', element: <EscrowFundControl /> },
      { path: '/projects/:id', element: <p>project detail</p> },
    ],
    { initialEntries: [`/escrow/${id}`] },
  );
  return render(
    <SessionProvider initialRole={role}>
      <DataProviderProvider provider={provider}>
        <RouterProvider router={router} />
      </DataProviderProvider>
    </SessionProvider>,
  );
}

async function seedFundRequest(provider: DataProvider, role: Role) {
  writeDemoSession(role);
  return provider.createFundRequest({ sourceWorkId: 900_000_004, requestedAmount: 10_000, remarks: 'For labour costs.' });
}

describe('FundRequestDetail', () => {
  afterEach(() => clearDemoSession());

  it('shows "not found" for an id that does not exist', async () => {
    renderDetail('MOSPI', 'no-such-request');
    expect(await screen.findByText('Fund request not found')).toBeInTheDocument();
  });

  it('renders every required section and lets MoSPI send a release notice on an approved request', async () => {
    const provider = createDemoDataProvider();
    const saved = await seedFundRequest(provider, 'DISTRICT');

    renderDetail('MOSPI', saved.id, provider);

    await screen.findByRole('heading', { name: `Fund Request ${saved.id}` });
    expect(screen.getByRole('heading', { name: 'Project Details' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Financial Details' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Project / Eligibility Information' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Request Details' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Escrow Decision' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Release Notice' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Request History' })).toBeInTheDocument();
    expect(screen.getByText('Fund request created')).toBeInTheDocument();

    if (saved.status === 'APPROVED') {
      const sendButton = screen.getByRole('button', { name: 'Send Release Notice' });
      fireEvent.click(sendButton);
      fireEvent.change(screen.getByLabelText('Type SEND to confirm'), { target: { value: 'send' } });
      fireEvent.change(screen.getByLabelText('Reason / justification'), {
        target: { value: 'Verified against sanctioned scope.' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Send Release Notice' }));
      expect(await screen.findByRole('status')).toHaveTextContent(/Release notice sent/i);
      expect(await screen.findByText('RELEASE NOTICE SENT')).toBeInTheDocument();
    } else {
      expect(
        screen.getByText('Not applicable — this request was rejected, so no release notice can be sent.'),
      ).toBeInTheDocument();
    }
  });

  it('permanently shows a rejected request with its reason, and offers no release notice action', async () => {
    const provider = createDemoDataProvider();
    writeDemoSession('DISTRICT');
    const saved = await provider.createFundRequest({
      sourceWorkId: 900_000_004,
      requestedAmount: 999_999_999,
      remarks: null,
    });

    renderDetail('MOSPI', saved.id, provider);

    await screen.findByRole('heading', { name: `Fund Request ${saved.id}` });
    expect(screen.getAllByText(/REJECTED/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/exceeds the remaining sanctioned funds/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Send Release Notice' })).not.toBeInTheDocument();
  });

  it('does not let a District Officer send a release notice from the detail page', async () => {
    const provider = createDemoDataProvider();
    writeDemoSession('DISTRICT');
    const saved = await provider.createFundRequest({ sourceWorkId: 900_000_004, requestedAmount: 10_000, remarks: null });

    renderDetail('DISTRICT', saved.id, provider);
    await screen.findByRole('heading', { name: `Fund Request ${saved.id}` });
    expect(screen.queryByRole('button', { name: 'Send Release Notice' })).not.toBeInTheDocument();
  });
});
