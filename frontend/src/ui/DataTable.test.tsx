import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable, type Column } from './DataTable';
import { StatusBadge } from './StatusBadge';

interface Row {
  id: number;
  name: string;
}

const columns: Column<Row>[] = [
  { key: 'name', header: 'Name', render: (row) => row.name },
  {
    key: 'status',
    header: 'Status',
    align: 'right',
    render: () => <StatusBadge tone="success">On track</StatusBadge>,
  },
];

const rows: Row[] = [
  { id: 1, name: 'Alpha work' },
  { id: 2, name: 'Beta work' },
];

function renderTable(props: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  return render(
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.id}
      caption="Works"
      {...props}
    />,
  );
}

describe('DataTable', () => {
  it('renders column headers and a row per record, including badge cells', () => {
    renderTable();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Alpha work' })).toBeInTheDocument();
    expect(screen.getAllByText('On track')).toHaveLength(2);
  });

  it('shows the empty state when there are no rows', () => {
    renderTable({ rows: [] });
    expect(screen.getByText('No records')).toBeInTheDocument();
  });

  it('shows skeleton rows while loading', () => {
    const { container } = renderTable({ isLoading: true, loadingRows: 3 });
    expect(container.querySelectorAll('.ui-skeleton-row')).toHaveLength(3);
  });

  it('shows an error body with a working retry action', () => {
    const onRetry = vi.fn();
    renderTable({ error: 'Provider unavailable', onRetry });
    expect(screen.getByRole('alert')).toHaveTextContent('Provider unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
