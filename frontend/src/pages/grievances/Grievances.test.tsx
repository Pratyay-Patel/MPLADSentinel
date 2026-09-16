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
