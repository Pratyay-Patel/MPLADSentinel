import { describe, expect, it } from 'vitest';

import type { LifecycleState, PaymentDataState, RiskLevel } from '../types';
import { createDemoDataProvider } from './DemoDataProvider';

const LIFECYCLE: LifecycleState[] = ['RECOMMENDED', 'COMPLETED', 'RECOMMENDED_AND_COMPLETED'];
const PAYMENT: PaymentDataState[] = [
  'NOT_FETCHED',
  'FETCHED_PRESENT',
  'FETCHED_ABSENT',
  'FETCH_ERROR',
];
const RISK: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN'];

describe('DemoDataProvider', () => {
  const provider = createDemoDataProvider();

  it('identifies itself as the demo source', () => {
    expect(provider.source).toBe('demo');
  });

  it('returns representative, correctly typed projects', async () => {
    const projects = await provider.listProjects();

    expect(projects.length).toBeGreaterThan(0);
    for (const p of projects) {
      expect(typeof p.sourceWorkId).toBe('number');
      expect(p.sourceName).toBe('EMPOWERED_INDIAN');
      expect(LIFECYCLE).toContain(p.lifecycleState);
      expect(PAYMENT).toContain(p.paymentDataState);
      expect(Array.isArray(p.dataQualityFlags)).toBe(true);
      // estimated and final cost are kept as separate, independently-nullable concepts
      expect(p.estimatedCost === null || typeof p.estimatedCost.amount === 'number').toBe(true);
      expect(p.finalCost === null || typeof p.finalCost.amount === 'number').toBe(true);
    }
    // the fixtures cover all three lifecycle states
    expect(new Set(projects.map((p) => p.lifecycleState))).toEqual(new Set(LIFECYCLE));
  });

  it('getProject resolves a known id and returns null for an unknown one', async () => {
    const [first] = await provider.listProjects();
    expect((await provider.getProject(first.sourceWorkId))?.sourceWorkId).toBe(first.sourceWorkId);
    expect(await provider.getProject(-1)).toBeNull();
  });

  it('summary is a faithful roll-up of the project set', async () => {
    const [projects, summary] = await Promise.all([
      provider.listProjects(),
      provider.getProjectSummary(),
    ]);

    expect(summary.totalProjects).toBe(projects.length);
    const lifecycleTotal = Object.values(summary.byLifecycleState).reduce((a, b) => a + b, 0);
    const paymentTotal = Object.values(summary.byPaymentDataState).reduce((a, b) => a + b, 0);
    expect(lifecycleTotal).toBe(projects.length);
    expect(paymentTotal).toBe(projects.length);
    expect(summary.totalEstimatedCost.currency).toBe('INR');
    expect(summary.totalEstimatedCost.amount).toBe(
      projects.reduce((sum, p) => sum + (p.estimatedCost?.amount ?? 0), 0),
    );
  });

  it('returns a typed risk record for a known project and null for an unknown one', async () => {
    const [first] = await provider.listProjects();
    const risk = await provider.getProjectRisk(first.sourceWorkId);

    expect(risk).not.toBeNull();
    expect(RISK).toContain(risk!.level);
    expect(Array.isArray(risk!.reasons)).toBe(true);
    expect(risk!.score === null || typeof risk!.score === 'number').toBe(true);
    expect(await provider.getProjectRisk(-1)).toBeNull();
  });
});
