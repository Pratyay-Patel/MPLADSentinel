import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { SessionProvider, type Role } from '../../auth';
import { DataProviderProvider, type DataProvider } from '../../data';
import { createDemoDataProvider } from '../../data/demo/DemoDataProvider';
import { ProviderError } from '../../data/errors';
import { RecommendWork } from './RecommendWork';

function renderPage(role: Role, provider: DataProvider = createDemoDataProvider()) {
  const router = createMemoryRouter([{ path: '/', element: <RecommendWork /> }], {
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

async function seedRecommendation(provider: DataProvider) {
  return provider.submitWorkRecommendation({
    fullName: 'Seeded Citizen',
    mobileNumber: '9876543210',
    email: null,
    state: 'Rajasthan',
    mpName: 'A. K. Sharma',
    constituency: 'Jaipur Rural',
    locationCategory: 'RURAL',
    gpsCoordinatesLink: '26.9124,75.7873',
    workTitle: 'Seeded community hall',
    category: 'Community & Public Buildings',
    description: 'This recommendation was seeded directly for the review-queue tests.',
  });
}

const reviewList = () => screen.getByRole('table', { name: 'Work recommendation review queue' });

function fillValidForm() {
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'A Citizen' } });
  fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '9876543210' } });
  fireEvent.change(screen.getByLabelText('State / UT'), { target: { value: 'Rajasthan' } });
  fireEvent.change(screen.getByLabelText("Hon'ble MP & constituency"), {
    target: { value: 'A. K. Sharma' },
  });
  fireEvent.change(screen.getByLabelText('Site GPS coordinates or maps link'), {
    target: { value: '26.9124,75.7873' },
  });
  fireEvent.change(screen.getByLabelText('Work title'), {
    target: { value: 'RO drinking water plant' },
  });
  fireEvent.change(screen.getByLabelText('Primary sector / category'), {
    target: { value: 'Drinking Water & Sanitation' },
  });
  fireEvent.change(screen.getByLabelText('Detailed description of community need'), {
    target: { value: 'There is no safe drinking water source within several kilometres.' },
  });
  fireEvent.click(screen.getByRole('checkbox'));
}

describe('RecommendWork — citizen view', () => {
  it('validates required fields and does not record an invalid submission', async () => {
    renderPage('CITIZEN');
    const submit = await screen.findByRole('button', { name: 'Submit recommendation' });

    // the certify checkbox keeps submit disabled until checked
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(submit).toBeEnabled();

    fireEvent.click(submit);

    expect(await screen.findByText('Enter your full name.')).toBeInTheDocument();
    expect(screen.getByText(/valid 10-digit mobile number/i)).toBeInTheDocument();
    expect(screen.getByText('Choose a State / UT.')).toBeInTheDocument();
    expect(screen.getByText(/Add a GPS coordinates or maps link/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 20 characters/i)).toBeInTheDocument();
  });

  it('only shows MPs for the selected state', async () => {
    renderPage('CITIZEN');
    await screen.findByRole('button', { name: 'Submit recommendation' });

    const mpSelect = screen.getByLabelText("Hon'ble MP & constituency") as HTMLSelectElement;
    expect(mpSelect).toBeDisabled();

    fireEvent.change(screen.getByLabelText('State / UT'), { target: { value: 'Rajasthan' } });
    expect(mpSelect).toBeEnabled();
    const labels = Array.from(mpSelect.options).map((o) => o.textContent);
    expect(labels.some((l) => l?.includes('A. K. Sharma'))).toBe(true);
    expect(labels.some((l) => l?.includes('R. B. Patil'))).toBe(false); // a Maharashtra MP
  });

  it('records a valid recommendation and shows a confirmation with a real tracking number', async () => {
    renderPage('CITIZEN');
    await screen.findByRole('button', { name: 'Submit recommendation' });

    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Submit recommendation' }));

    expect(await screen.findByText('Your proposal has been recorded')).toBeInTheDocument();
    expect(screen.getByText(/^CIT-\d{4}-\d{6}$/)).toBeInTheDocument();
    expect(screen.getByText(/Assigned to A\. K\. Sharma \(Jaipur Rural\)/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Submit another recommendation' }));
    expect(await screen.findByRole('button', { name: 'Submit recommendation' })).toBeInTheDocument();

    const table = screen.getByRole('table', { name: 'Recommendations you have made' });
    expect(within(table).getByText('RO drinking water plant')).toBeInTheDocument();
  });

  it('rejects an invalid email', async () => {
    renderPage('CITIZEN');
    await screen.findByRole('button', { name: 'Submit recommendation' });

    fillValidForm();
    fireEvent.change(screen.getByLabelText('Email (optional)'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit recommendation' }));

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
  });
});

describe('RecommendWork — authority view', () => {
  it('shows a review queue with no submission form for an authority role', async () => {
    const provider = createDemoDataProvider();
    await seedRecommendation(provider);
    renderPage('MOSPI', provider);

    expect(await screen.findByRole('heading', { name: 'Review queue' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Propose a work' })).not.toBeInTheDocument();
    expect(within(reviewList()).getByText('Seeded community hall')).toBeInTheDocument();
  });

  it('lets MoSPI advance a recommendation status', async () => {
    const provider = createDemoDataProvider();
    const seeded = await seedRecommendation(provider);
    renderPage('MOSPI', provider);

    const statusSelect = await screen.findByLabelText(`Status for ${seeded.trackingNumber}`);
    fireEvent.change(statusSelect, { target: { value: 'RECOMMENDED' } });

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        `Recommendation ${seeded.trackingNumber} updated`,
      );
    });
    expect(screen.getByLabelText(`Status for ${seeded.trackingNumber}`)).toHaveValue('RECOMMENDED');
  });

  it('shows the queue read-only for the Auditor role (no status control)', async () => {
    const provider = createDemoDataProvider();
    await seedRecommendation(provider);
    renderPage('AUDITOR', provider);

    expect(await screen.findByRole('heading', { name: 'Review queue' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Status for /)).not.toBeInTheDocument();
    expect(within(reviewList()).getAllByText('Submitted').length).toBeGreaterThan(0);
  });
});

describe('RecommendWork — loading', () => {
  it('shows an error state with retry when the initial load fails', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listWorkRecommendations: vi.fn().mockRejectedValue(new ProviderError('unavailable', 'backend down')),
    };
    renderPage('CITIZEN', provider);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('backend down');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
