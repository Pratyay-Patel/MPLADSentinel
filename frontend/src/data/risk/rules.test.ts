import { describe, expect, it } from 'vitest';

import { demoProjects, RISK_REFERENCE_DATE } from '../demo/fixtures';
import type { ProjectRisk } from '../types';
import { deriveRisk, riskHeadline, type RiskContext } from './rules';

const ctx: RiskContext = { allProjects: [...demoProjects], asOf: RISK_REFERENCE_DATE };
const work = (n: number) => demoProjects.find((p) => p.sourceWorkId === 900_000_000 + n)!;

describe('deriveRisk', () => {
  it('flags a long-dormant work with no payment records as HIGH', () => {
    const risk = deriveRisk(work(1), ctx); // recommended 2023, NOT_FETCHED
    expect(risk.level).toBe('HIGH');
    expect(risk.reasons.join(' ')).toMatch(/months ago with no payment records/i);
  });

  it('flags overspend + payout-before-completion as HIGH with multiple reasons', () => {
    const risk = deriveRisk(work(2), ctx); // recorded > estimated, not completed
    expect(risk.level).toBe('HIGH');
    expect(risk.reasons.length).toBeGreaterThanOrEqual(2);
    expect(risk.reasons.join(' ')).toMatch(/exceed the estimated cost/i);
  });

  it('flags the highest-cost work in a category cohort', () => {
    const risk = deriveRisk(work(5), ctx); // biggest Normal/Others estimate
    expect(risk.reasons.join(' ')).toMatch(/highest for the Normal\/Others category/i);
  });

  it('surfaces a payment fetch error', () => {
    const risk = deriveRisk(work(9), ctx); // FETCH_ERROR
    expect(risk.reasons.join(' ')).toMatch(/could not be retrieved/i);
    expect(risk.level).toBe('MEDIUM');
  });

  it('marks a completed, sensibly-paid work as LOW with no reasons', () => {
    const risk = deriveRisk(work(6), ctx);
    expect(risk.level).toBe('LOW');
    expect(risk.reasons).toEqual([]);
  });

  it('returns UNKNOWN when there is no cost or payment data to assess', () => {
    const risk = deriveRisk(work(14), ctx); // estimated null, final null, NOT_FETCHED
    expect(risk.level).toBe('UNKNOWN');
    expect(risk.score).toBeNull();
    expect(risk.assessedAt).toBeNull();
  });

  it('is deterministic for the fixed reference date', () => {
    expect(deriveRisk(work(1), ctx)).toEqual(deriveRisk(work(1), ctx));
  });

  it('produces a spread of levels across the demo set', () => {
    const levels = demoProjects.map((p) => deriveRisk(p, ctx).level);
    expect(new Set(levels)).toEqual(new Set(['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']));
  });
});

describe('riskHeadline', () => {
  const base = { sourceWorkId: 1, level: 'HIGH', score: 70, assessedAt: null } as const;

  it('summarises the reasons', () => {
    expect(riskHeadline({ ...base, reasons: ['a', 'b'] } as ProjectRisk)).toBe(
      '2 indicators detected',
    );
    expect(riskHeadline({ ...base, reasons: ['just one'] } as ProjectRisk)).toBe('just one');
    expect(riskHeadline({ ...base, reasons: [] } as ProjectRisk)).toBe('No current indicators');
    expect(riskHeadline({ ...base, level: 'UNKNOWN', reasons: [] } as ProjectRisk)).toBe(
      'Not yet assessed',
    );
  });
});
