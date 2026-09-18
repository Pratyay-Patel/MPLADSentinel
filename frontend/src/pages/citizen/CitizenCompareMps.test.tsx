import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { DataProviderProvider } from '../../data';
import { createDemoDataProvider } from '../../data/demo/DemoDataProvider';
import { CitizenCompareMps } from './CitizenCompareMps';

function renderPage() {
  const router = createMemoryRouter([{ path: '/', element: <CitizenCompareMps /> }], {
    initialEntries: ['/'],
  });
  return render(
    <DataProviderProvider provider={createDemoDataProvider()}>
      <RouterProvider router={router} />
    </DataProviderProvider>,
  );
}

async function addMp(name: string) {
  fireEvent.change(screen.getByLabelText('Search MPs'), { target: { value: name } });
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(name) }));
}

describe('CitizenCompareMps', () => {
  it('compares two MPs with no risk rows, columns or insights anywhere', async () => {
    renderPage();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Compare MPs' }),
    ).toBeInTheDocument();

    await addMp('A. K. Sharma');
    await addMp('R. B. Patil');

    expect(await screen.findByText('Detailed comparison')).toBeInTheDocument();

    // The authority page's risk-derived rows/insight must not exist here.
    expect(screen.queryByText('HIGH-risk works')).not.toBeInTheDocument();
    expect(screen.queryByText('MEDIUM-risk works')).not.toBeInTheDocument();
    expect(screen.queryByText('LOW-risk works')).not.toBeInTheDocument();
    expect(screen.queryByText('Average risk score')).not.toBeInTheDocument();
    expect(screen.queryByText('Lowest flagged share')).not.toBeInTheDocument();
    expect(screen.queryByText(/RISK/)).not.toBeInTheDocument();

    // The metric picker must only offer the citizen-safe metrics.
    const metricSelect = screen.getByLabelText('Metric') as HTMLSelectElement;
    const options = [...metricSelect.options].map((o) => o.textContent);
    expect(options).not.toContain('Average risk score');
    expect(options).toHaveLength(7);
  });
});
