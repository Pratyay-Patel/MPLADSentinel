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

  describe('client-side pagination', () => {
    const many: Row[] = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, name: `Work ${i + 1}` }));

    it('renders only one page of rows and pages forward / back', () => {
      renderTable({ rows: many, pageSize: 3 });
      const pager = () => screen.getByRole('navigation', { name: 'Table pagination' });

      expect(screen.getByRole('cell', { name: 'Work 1' })).toBeInTheDocument();
      expect(screen.queryByRole('cell', { name: 'Work 4' })).not.toBeInTheDocument();
      expect(pager()).toHaveTextContent('of 7');
      expect(pager()).toHaveTextContent('Page 1 of 3');
      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByRole('cell', { name: 'Work 4' })).toBeInTheDocument();
      expect(screen.queryByRole('cell', { name: 'Work 1' })).not.toBeInTheDocument();
      expect(pager()).toHaveTextContent('Page 2 of 3');

      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByRole('cell', { name: 'Work 7' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

      fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
      expect(pager()).toHaveTextContent('Page 2 of 3');
    });

    it('does not show the pager when rows fit on one page', () => {
      renderTable({ rows: many.slice(0, 3), pageSize: 3 });
      expect(screen.queryByRole('navigation', { name: 'Table pagination' })).not.toBeInTheDocument();
    });

    it('resets to the first page when the row set changes', () => {
      const { rerender } = render(
        <DataTable
          columns={columns}
          rows={many}
          getRowKey={(row) => row.id}
          caption="Works"
          pageSize={3}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();

      rerender(
        <DataTable
          columns={columns}
          rows={many.slice(0, 5)}
          getRowKey={(row) => row.id}
          caption="Works"
          pageSize={3}
        />,
      );
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });
  });
});
