import { describe, expect, it } from 'vitest';

import type { Project, ProjectRisk } from '../data';
import { scopeWorks, workCsvColumns, type WorkExportRow } from './workExport';
import { toCsv } from './csv';

function row(seenInRecommended: boolean, seenInCompleted: boolean): WorkExportRow {
  return {
    project: { seenInRecommended, seenInCompleted } as Project,
    risk: { reasons: [] } as unknown as ProjectRisk,
  };
}

describe('scopeWorks', () => {
  const rows = [row(true, false), row(false, true), row(true, true)];

  it('all → every row', () => expect(scopeWorks(rows, 'all')).toHaveLength(3));
  it('completed → only rows seen in completed', () =>
    expect(scopeWorks(rows, 'completed')).toHaveLength(2));
  it('recommended → only rows seen in recommended', () =>
    expect(scopeWorks(rows, 'recommended')).toHaveLength(2));
});

describe('workCsvColumns', () => {
  it('flattens a work + risk into the fixed column set', () => {
    const r: WorkExportRow = {
      project: {
        sourceWorkId: 7,
        workDescription: 'Community hall, phase 1',
        category: 'Infrastructure',
        state: 'Kerala',
        district: 'Ernakulam',
        mpName: 'A. Kumar',
        house: 'LOK_SABHA',
        constituency: 'Ernakulam',
        lifecycleState: 'COMPLETED',
        estimatedCost: { amount: 1200000, currency: 'INR' },
        finalCost: { amount: 1150000, currency: 'INR' },
        recordedPayments: { amount: 1150000, currency: 'INR' },
      } as Project,
      risk: { level: 'MEDIUM', score: 30, reasons: ['Full amount released in a single installment'] } as ProjectRisk,
    };
    const csv = toCsv([r], workCsvColumns);
    const [header, dataRow] = csv.split('\r\n');
    expect(header).toContain('Work ID');
    expect(dataRow.startsWith('7,')).toBe(true);
    expect(csv).toContain('"Community hall, phase 1"'); // comma in description → quoted
    expect(csv).toContain('1200000');
    expect(csv).toContain('MEDIUM');
    expect(csv).toContain('Full amount released in a single installment');
  });
});
