/**
 * Dependency-free CSV generation + a client-side download helper. Used by the
 * "Export" menus on the Project Register and Risk & Alerts screens. Everything
 * is client-side over the data already loaded — there is no export API.
 */

/** UTF-8 byte-order mark, so Excel reads exported non-ASCII text as UTF-8. */
const UTF8_BOM = String.fromCharCode(0xfeff);

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

/** RFC-4180 quoting: wrap in quotes if the cell has a comma, quote or newline; double internal quotes. */
function escapeCell(value: string | number | null | undefined): string {
  if (value == null) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build a CSV string (CRLF line endings, header row always present). */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const head = columns.map((c) => escapeCell(c.header)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escapeCell(c.value(row))).join(','))
    .join('\r\n');
  return body ? `${head}\r\n${body}` : head;
}

/** Lower-case, dash-separated slug for a filename segment (drops punctuation). */
export function filenameSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Trigger a browser download of `content` as `filename`. A UTF-8 BOM is prepended
 * so Excel opens non-ASCII text correctly. No-op when there is no DOM (tests/SSR).
 */
export function downloadCsv(filename: string, content: string): void {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return;
  const blob = new Blob([UTF8_BOM, content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
