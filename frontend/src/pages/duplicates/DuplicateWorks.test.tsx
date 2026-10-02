import { fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { DataProviderProvider, type DataProvider, type DuplicatePair } from '../../data';
import { createDemoDataProvider } from '../../data/demo/DemoDataProvider';
import { DuplicateWorks } from './DuplicateWorks';

const PAIR: DuplicatePair = {
  workA: {
    sourceWorkId: 900000001,
    workDescription: 'construction of community hall in gram panchayat area for public use',
    state: 'Rajasthan',
    district: 'Jaipur',
    category: 'Roads',
    estimatedCost: 1000000,
  },
  workB: {
    sourceWorkId: 900000002,
    workDescription: 'construction of community hall in gram panchayat area for general use',
    state: 'Rajasthan',
    district: 'Jaipur',
    category: 'Roads',
    estimatedCost: 1050000,
  },
  score: 90,
  confidence: 'HIGH',
  reasons: [
    'Work descriptions are 90% similar (same state, district and category)',
    'Estimated costs are within 5% of each other',
  ],
};

function renderPage(provider: DataProvider = createDemoDataProvider()) {
  const router = createMemoryRouter([{ path: '/', element: <DuplicateWorks /> }], {
    initialEntries: ['/'],
  });
  return render(
    <DataProviderProvider provider={provider}>
      <RouterProvider router={router} />
    </DataProviderProvider>,
  );
}

describe('DuplicateWorks', () => {
  it('shows candidate pairs with confidence and reasons', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listDuplicateWorks: async () => ({ pairs: [PAIR], totalFound: 1 }),
    };
    renderPage(provider);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Duplicate Works' }),
    ).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Candidate duplicate work pairs' });
    expect(within(table).getByText('HIGH')).toBeInTheDocument();
    expect(within(table).getByText(/similar/i)).toBeInTheDocument();
    expect(within(table).getByText(/within 5% of each other/i)).toBeInTheDocument();
  });

  it('filters the table by confidence level', async () => {
    const other: DuplicatePair = {
      ...PAIR,
      confidence: 'MEDIUM',
      score: 30,
      workA: { ...PAIR.workA, sourceWorkId: 900000003 },
      workB: { ...PAIR.workB, sourceWorkId: 900000004 },
    };
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listDuplicateWorks: async () => ({ pairs: [PAIR, other], totalFound: 2 }),
    };
    renderPage(provider);

    const table = await screen.findByRole('table', { name: 'Candidate duplicate work pairs' });
    expect(within(table).getAllByRole('row')).toHaveLength(3); // header + 2 pairs

    fireEvent.change(screen.getByLabelText('Confidence'), { target: { value: 'HIGH' } });
    expect(within(table).getAllByRole('row')).toHaveLength(2); // header + 1 pair
  });

  it('shows an empty state when there are no candidate duplicates', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listDuplicateWorks: async () => ({ pairs: [], totalFound: 0 }),
    };
    renderPage(provider);

    expect(await screen.findByText('No candidate duplicates found')).toBeInTheDocument();
  });
});
