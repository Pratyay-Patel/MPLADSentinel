import type { ReactNode } from 'react';

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
}

/**
 * Presentation-only table foundation: headers, rows, responsive overflow, and
 * built-in loading / empty / error bodies. No sorting, filtering, pagination or
 * data fetching — those belong to the feature/API phases.
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
}: DataTableProps<T>) {
  const colCount = columns.length;

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

    return rows.map((row) => (
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
    </div>
  );
}
