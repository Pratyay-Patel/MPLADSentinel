import { describe, expect, it } from 'vitest';

import { filenameSlug, toCsv, type CsvColumn } from './csv';

interface Row {
  a: string;
  b: number | null;
}

const cols: CsvColumn<Row>[] = [
  { header: 'A', value: (r) => r.a },
  { header: 'B', value: (r) => r.b },
];

describe('toCsv', () => {
  it('writes just the header row when there are no data rows', () => {
    expect(toCsv([], cols)).toBe('A,B');
  });

  it('joins rows with CRLF and renders null/undefined as an empty cell', () => {
    expect(
      toCsv(
        [
          { a: 'x', b: 1 },
          { a: 'y', b: null },
        ],
        cols,
      ),
    ).toBe('A,B\r\nx,1\r\ny,');
  });

  it('quotes cells containing a comma, quote or newline (doubling inner quotes)', () => {
    expect(toCsv([{ a: 'a,b', b: 1 }], cols)).toBe('A,B\r\n"a,b",1');
    expect(toCsv([{ a: 'said "hi"', b: 1 }], cols)).toBe('A,B\r\n"said ""hi""",1');
    expect(toCsv([{ a: 'l1\nl2', b: 1 }], cols)).toBe('A,B\r\n"l1\nl2",1');
  });
});

describe('filenameSlug', () => {
  it('lower-cases and dash-separates, dropping punctuation and edge dashes', () => {
    expect(filenameSlug('Uttar Pradesh')).toBe('uttar-pradesh');
    expect(filenameSlug('  A & B! ')).toBe('a-b');
  });
});
