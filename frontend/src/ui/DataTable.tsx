import { useEffect, useState, type ReactNode } from 'react';

import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Skeleton } from './Skeleton';

export interface Column<T> {
  /** Stable id, used for React keys. */
  key: string;
  header: ReactNode;
  align?: 'left' | 'right';
  /** Cell renderer. Return a StatusBadge / Badge here for status columns. */
  render: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string | number;
  /** Accessible table caption (visually hidden). */
  caption: string;
  isLoading?: boolean;
  /** When set, the table body shows an error instead of rows. */
  error?: ReactNode;
  onRetry?: () => void;
  /** Overrides the default empty message. */
  emptyState?: ReactNode;
  /** Skeleton row count while loading. Default 5. */
  loadingRows?: number;
  /**
   * When set, only this many rows render at once and a pager appears below the
   * table. Purely presentational (client-side slice) — the full `rows` array is
   * still held in memory. Pass a **referentially stable** `rows` (e.g. `useMemo`)
   * so the page resets only when the data actually changes.
   */
  pageSize?: number;
}

/**
 * Presentation-only table foundation: headers, rows, responsive overflow, and
 * built-in loading / empty / error bodies. Optional client-side pagination via
 * {@link DataTableProps.pageSize}. No sorting, filtering, or data fetching —
 * those belong to the feature/API layers.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  caption,
  isLoading = false,
  error,
  onRetry,
  emptyState,
  loadingRows = 5,
  pageSize,
}: DataTableProps<T>) {
  const colCount = columns.length;

  const [page, setPage] = useState(1);
  // Reset to the first page whenever the (memoized) row set changes.
  useEffect(() => setPage(1), [rows]);

  const paginate = pageSize != null && pageSize > 0 && !isLoading && !error;
  const pageCount = paginate ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  const safePage = Math.min(page, pageCount);
  const visibleRows = paginate
    ? rows.slice((safePage - 1) * pageSize, safePage * pageSize)
    : rows;
  const showPager = paginate && rows.length > pageSize;

  const renderBody = () => {
    if (error) {
      return (
        <tr>
          <td className="ui-table__state-cell" colSpan={colCount}>
            <ErrorState description={error} onRetry={onRetry} />
          </td>
        </tr>
      );
    }

    if (isLoading) {
      return Array.from({ length: loadingRows }).map((_, rowIndex) => (
        <tr key={`skeleton-${rowIndex}`} className="ui-skeleton-row">
          {columns.map((column) => (
            <td key={column.key} data-align={column.align === 'right' ? 'right' : undefined}>
              <Skeleton width="70%" />
            </td>
          ))}
        </tr>
      ));
    }

    if (rows.length === 0) {
      return (
        <tr>
          <td className="ui-table__state-cell" colSpan={colCount}>
            {emptyState ?? (
              <EmptyState title="No records" description="Nothing to show here yet." />
            )}
          </td>
        </tr>
      );
    }

    return visibleRows.map((row) => (
      <tr key={getRowKey(row)}>
        {columns.map((column) => (
          <td key={column.key} data-align={column.align === 'right' ? 'right' : undefined}>
            {column.render(row)}
          </td>
        ))}
      </tr>
    ));
  };

  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                data-align={column.align === 'right' ? 'right' : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{renderBody()}</tbody>
      </table>

      {showPager && (
        <nav className="ui-table-pager" aria-label="Table pagination">
          <span className="ui-table-pager__status">
            {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, rows.length)} of{' '}
            {rows.length}
          </span>
          <div className="ui-table-pager__controls">
            <button
              type="button"
              className="ui-btn ui-btn--ghost ui-btn--sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              Previous
            </button>
            <span className="ui-table-pager__page">
              Page {safePage} of {pageCount}
            </span>
            <button
              type="button"
              className="ui-btn ui-btn--ghost ui-btn--sm"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={safePage >= pageCount}
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
