import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DataProviderProvider, type DataProvider } from '../../data';
import { createDemoDataProvider } from '../../data/demo/DemoDataProvider';
import { ProviderError } from '../../data/errors';
import { Grievances } from './Grievances';

function renderPage(provider: DataProvider = createDemoDataProvider()) {
  const router = createMemoryRouter([{ path: '/', element: <Grievances /> }], {
    initialEntries: ['/'],
  });
  return render(
    <DataProviderProvider provider={provider}>
      <RouterProvider router={router} />
    </DataProviderProvider>,
  );
}

const list = () => screen.getByRole('table', { name: 'Submitted grievances' });

describe('Grievances', () => {
  it('validates required fields and does not record an invalid submission', async () => {
    renderPage();
    const submit = await screen.findByRole('button', { name: 'Submit grievance' });

    fireEvent.click(submit);

    expect(await screen.findByText('Choose a category.')).toBeInTheDocument();
    expect(screen.getByText('Add a short subject.')).toBeInTheDocument();
    expect(screen.getByText(/at least 20 characters/i)).toBeInTheDocument();
    // nothing was recorded — the list still shows its empty state
    expect(within(list()).getByText('No grievances yet')).toBeInTheDocument();
    expect(screen.queryByText('Grievance recorded', { exact: false })).not.toBeInTheDocument();
  });

  it('records a valid grievance and shows it in the list', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Submit grievance' });

    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'Delay in execution' },
    });
    fireEvent.change(screen.getByLabelText('Subject'), {
      target: { value: 'Road work not started' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: {
        value: 'The approach road work has not begun despite being recommended last year.',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit grievance' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/Grievance recorded/);
    await waitFor(() => {
      expect(within(list()).getByText('Road work not started')).toBeInTheDocument();
    });
  });

  it('rejects an invalid email', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Submit grievance' });

    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Other' } });
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Something' } });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'A description long enough to pass the minimum length check here.' },
    });
    fireEvent.change(screen.getByLabelText('Email (optional)'), {
      target: { value: 'not-an-email' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit grievance' }));

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
  });

  it('shows an error state with retry when the initial load fails', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listGrievances: vi.fn().mockRejectedValue(new ProviderError('unavailable', 'backend down')),
    };
    renderPage(provider);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('backend down');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
