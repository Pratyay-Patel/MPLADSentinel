import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { SessionProvider, type Role } from '../../auth';
import { DataProviderProvider, type DataProvider } from '../../data';
import { createDemoDataProvider } from '../../data/demo/DemoDataProvider';
import { ProviderError } from '../../data/errors';
import { Grievances } from './Grievances';

function renderPage(role: Role, provider: DataProvider = createDemoDataProvider()) {
  const router = createMemoryRouter([{ path: '/', element: <Grievances /> }], {
    initialEntries: ['/'],
  });
  return render(
    <SessionProvider initialRole={role}>
      <DataProviderProvider provider={provider}>
        <RouterProvider router={router} />
      </DataProviderProvider>
    </SessionProvider>,
  );
}

// jsdom doesn't implement createObjectURL; PhotoUploadField only uses it for a
// live preview, which isn't under test here.
URL.createObjectURL = vi.fn(() => 'blob:mock');
URL.revokeObjectURL = vi.fn();

async function seedGrievance(provider: DataProvider) {
  return provider.submitGrievance({
    workReference: null,
    category: 'Delay in execution',
    subject: 'Bridge work stalled',
    description: 'No progress on the bridge for several months despite the recommendation.',
    contactName: null,
    contactEmail: null,
  });
}

const citizenList = () => screen.getByRole('table', { name: 'Grievances you have raised' });
const reviewList = () => screen.getByRole('table', { name: 'Grievance review queue' });

describe('Grievances — citizen view', () => {
  it('validates required fields and does not record an invalid submission', async () => {
    renderPage('CITIZEN');
    const submit = await screen.findByRole('button', { name: 'Submit grievance' });

    fireEvent.click(submit);

    expect(await screen.findByText('Choose a category.')).toBeInTheDocument();
    expect(screen.getByText('Add a short subject.')).toBeInTheDocument();
    expect(screen.getByText(/at least 20 characters/i)).toBeInTheDocument();
    expect(within(citizenList()).getByText('No grievances yet')).toBeInTheDocument();
  });

  it('records a valid grievance and shows it in the list', async () => {
    renderPage('CITIZEN');
    await screen.findByRole('button', { name: 'Submit grievance' });

    fireEvent.change(screen.getByLabelText(/^Category/), {
      target: { value: 'Delay in execution' },
    });
    fireEvent.change(screen.getByLabelText(/^Subject/), {
      target: { value: 'Road work not started' },
    });
    fireEvent.change(screen.getByLabelText(/^Description/), {
      target: {
        value: 'The approach road work has not begun despite being recommended last year.',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit grievance' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/Grievance recorded/);
    await waitFor(() => {
      expect(within(citizenList()).getByText('Road work not started')).toBeInTheDocument();
    });
  });

  it('shows an uploaded photo thumbnail, visible to an authority in the same tab', async () => {
    const provider = createDemoDataProvider();
    renderPage('CITIZEN', provider);
    await screen.findByRole('button', { name: 'Submit grievance' });

    fireEvent.change(screen.getByLabelText(/^Category/), { target: { value: 'Other' } });
    fireEvent.change(screen.getByLabelText(/^Subject/), { target: { value: 'Photo test issue' } });
    fireEvent.change(screen.getByLabelText(/^Description/), {
      target: { value: 'A description long enough to pass the minimum length check here.' },
    });
    fireEvent.change(screen.getByLabelText('Photo of the issue (optional)'), {
      target: { files: [new File(['image-bytes'], 'site.png', { type: 'image/png' })] },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit grievance' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/Grievance recorded/);
    await waitFor(() => {
      expect(within(citizenList()).getByAltText('Uploaded site photo')).toBeInTheDocument();
    });

    renderPage('MOSPI', provider);
    await waitFor(() => {
      expect(within(reviewList()).getByAltText('Uploaded site photo')).toBeInTheDocument();
    });
  });

  it('lets a citizen attach a photo after submitting, without a photo at first', async () => {
    const provider = createDemoDataProvider();
    renderPage('CITIZEN', provider);
    await screen.findByRole('button', { name: 'Submit grievance' });

    fireEvent.change(screen.getByLabelText(/^Category/), { target: { value: 'Other' } });
    fireEvent.change(screen.getByLabelText(/^Subject/), { target: { value: 'No photo yet' } });
    fireEvent.change(screen.getByLabelText(/^Description/), {
      target: { value: 'A description long enough to pass the minimum length check here.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit grievance' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/Grievance recorded/);
    const row = within(citizenList()).getByText('No photo yet').closest('tr');
    if (!row) throw new Error('Expected a table row for the new grievance.');
    expect(within(row).getByRole('button', { name: 'Add photo' })).toBeInTheDocument();
    expect(within(row).queryByAltText('Uploaded site photo')).not.toBeInTheDocument();

    fireEvent.change(within(row).getByLabelText('Add photo'), {
      target: { files: [new File(['image-bytes'], 'later.png', { type: 'image/png' })] },
    });

    await waitFor(() => {
      expect(within(row).getByAltText('Uploaded site photo')).toBeInTheDocument();
    });
    expect(within(row).getByRole('button', { name: 'Change' })).toBeInTheDocument();

    renderPage('MOSPI', provider);
    const authorityRow = await waitFor(() => {
      const el = within(reviewList()).getByText('No photo yet').closest('tr');
      if (!el) throw new Error('Expected a table row in the review queue.');
      return el;
    });
    await waitFor(() => {
      expect(within(authorityRow).getByAltText('Uploaded site photo')).toBeInTheDocument();
    });
  });

  it('rejects an invalid email', async () => {
    renderPage('CITIZEN');
    await screen.findByRole('button', { name: 'Submit grievance' });

    fireEvent.change(screen.getByLabelText(/^Category/), { target: { value: 'Other' } });
    fireEvent.change(screen.getByLabelText(/^Subject/), { target: { value: 'Something' } });
    fireEvent.change(screen.getByLabelText(/^Description/), {
      target: { value: 'A description long enough to pass the minimum length check here.' },
    });
    fireEvent.change(screen.getByLabelText('Email (optional)'), {
      target: { value: 'not-an-email' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit grievance' }));

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
  });
});

describe('Grievances — authority view', () => {
  it('shows a review queue with no submission form for an authority role', async () => {
    const provider = createDemoDataProvider();
    await seedGrievance(provider);
    renderPage('MOSPI', provider);

    expect(await screen.findByRole('heading', { name: 'Review queue' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Raise a grievance' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit grievance' })).not.toBeInTheDocument();
    expect(within(reviewList()).getByText('Bridge work stalled')).toBeInTheDocument();
    expect(within(reviewList()).getAllByText('—').length).toBeGreaterThan(0);
  });

  it('lets MoSPI advance a grievance status', async () => {
    const provider = createDemoDataProvider();
    const seeded = await seedGrievance(provider);
    renderPage('MOSPI', provider);

    const statusSelect = await screen.findByLabelText(`Status for ${seeded.id}`);
    fireEvent.change(statusSelect, { target: { value: 'UNDER_REVIEW' } });

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(`Grievance ${seeded.id} updated`);
    });
    expect(screen.getByLabelText(`Status for ${seeded.id}`)).toHaveValue('UNDER_REVIEW');
  });

  it('shows the queue read-only for the Auditor role (no status control)', async () => {
    const provider = createDemoDataProvider();
    await seedGrievance(provider);
    renderPage('AUDITOR', provider);

    expect(await screen.findByRole('heading', { name: 'Review queue' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Status for /)).not.toBeInTheDocument();
    expect(within(reviewList()).getAllByText('Submitted').length).toBeGreaterThan(0);
  });
});

describe('Grievances — loading', () => {
  it('shows an error state with retry when the initial load fails', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listGrievances: vi.fn().mockRejectedValue(new ProviderError('unavailable', 'backend down')),
    };
    renderPage('CITIZEN', provider);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('backend down');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
