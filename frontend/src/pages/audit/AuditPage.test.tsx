import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { SessionProvider, type Role } from '../../auth';
import { DataProviderProvider, type DataProvider } from '../../data';
import { createDemoDataProvider } from '../../data/demo/DemoDataProvider';
import { AuditPage } from './AuditPage';

function renderAt(entry: string, provider: DataProvider, role: Role = 'MOSPI') {
  const router = createMemoryRouter(
    [
      { path: '/audit', element: <AuditPage /> },
      { path: '/inspections', element: <p>inspections</p> },
    ],
    { initialEntries: [entry] },
  );
  return render(
    <SessionProvider initialRole={role}>
      <DataProviderProvider provider={provider}>
        <RouterProvider router={router} />
      </DataProviderProvider>
    </SessionProvider>,
  );
}

describe('AuditPage', () => {
  it('renders the empty state when no inspections exist', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listAssignments: async () => [],
    };
    renderAt('/audit', provider);

    expect(await screen.findByText('No inspections yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to inspections/i })).toBeInTheDocument();
  });

  it('shows a work timeline with the "Inspection requested" event', async () => {
    renderAt('/audit', createDemoDataProvider());

    expect(await screen.findByRole('heading', { name: 'Audit Trail' })).toBeInTheDocument();
    expect(screen.getByLabelText('Work')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Inspection requested' })).toBeInTheDocument();
  });

  it('renders the illustrative findings block for a completed inspection', async () => {
    const provider = createDemoDataProvider();
    const completed = (await provider.listAssignments()).find((a) => a.status === 'COMPLETED');
    expect(completed).toBeDefined();

    renderAt(`/audit?work=${completed!.sourceWorkId}`, provider);

    expect(
      await screen.findByRole('heading', { name: 'Inspection completed' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Project operational')).toBeInTheDocument();
    expect(screen.getByText(/Overall condition:/)).toHaveTextContent('GOOD');
    expect(screen.getByText(/Construction is approximately 70% complete/)).toBeInTheDocument();
    expect(screen.getByText(/Illustrative inspection findings/)).toBeInTheDocument();
  });

  it('shows the "IPFS not connected" evidence note in demo mode', async () => {
    renderAt('/audit', createDemoDataProvider());

    const evidence = await screen.findByRole('heading', { name: 'Field evidence' });
    expect(evidence).toBeInTheDocument();
    expect(
      await screen.findByText(/IPFS evidence is not connected yet/i),
    ).toBeInTheDocument();
  });

  it('asks the backend for the assignment\'s requiredPhotos as the limit', async () => {
    const base = createDemoDataProvider();
    const completed = (await base.listAssignments()).find((a) => a.status === 'COMPLETED')!;
    const spy = vi.fn().mockResolvedValue({ configured: true, photos: [] });
    const provider: DataProvider = { ...base, getAuditPhotos: spy };

    renderAt(`/audit?work=${completed.sourceWorkId}`, provider);

    await screen.findByRole('heading', { name: 'Field evidence' });
    expect(spy).toHaveBeenCalledWith(completed.sourceWorkId, completed.requiredPhotos, expect.anything());
    expect(completed.requiredPhotos).toBeGreaterThan(0);
    expect(
      screen.getByText(new RegExp(`calls for ${completed.requiredPhotos} photo`)),
    ).toBeInTheDocument();
  });

  it('renders real photos with a lightbox trigger when the backend returns evidence', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      getAuditPhotos: async () => ({
        configured: true,
        photos: [
          { cid: 'bafyLatest', name: 'site-2.jpg', url: 'https://gw/ipfs/bafyLatest' },
          { cid: 'bafyOlder', name: 'site-1.jpg', url: 'https://gw/ipfs/bafyOlder' },
        ],
      }),
    };
    renderAt('/audit', provider);

    await screen.findByRole('heading', { name: 'Field evidence' });
    const images = await screen.findAllByRole('img', { name: /site-\d\.jpg/ });
    expect(images).toHaveLength(2);
    expect(screen.getByText(/stored on IPFS/i)).toBeInTheDocument();
  });
});
