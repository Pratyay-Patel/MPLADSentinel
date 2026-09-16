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

  it('serves a publicly-releasable projection with no internal fields', async () => {
    const [full] = await provider.listProjects();
    const publicRows = await provider.listPublicProjects();
    const one = await provider.getPublicProject(full.sourceWorkId);

    expect(publicRows).toHaveLength((await provider.listProjects()).length);
    for (const key of ['sourceName', 'dataQualityFlags', 'paymentDataState', 'recordedPayments']) {
      expect(key in publicRows[0]).toBe(false);
    }
    expect(one?.reference).toBe(full.sourceWorkId);
    expect(one?.memberOfParliament).toBe(full.mpName);
    expect(await provider.getPublicProject(-1)).toBeNull();
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

  it('listProjectRisks returns an assessment for every project, keyed by id', async () => {
    const projects = await provider.listProjects();
    const byId = await provider.listProjectRisks();

    expect(Object.keys(byId)).toHaveLength(projects.length);
    for (const project of projects) {
      const risk = byId[project.sourceWorkId];
      expect(risk.sourceWorkId).toBe(project.sourceWorkId);
      expect(RISK).toContain(risk.level);
    }
    // agrees with the single-work lookup
    const single = await provider.getProjectRisk(projects[0].sourceWorkId);
    expect(byId[projects[0].sourceWorkId].level).toBe(single!.level);
  });

  it('listDuplicateWorks flags real fixture pairs with a real signal, and every pair has a reason', async () => {
    const pairs = await provider.listDuplicateWorks();

    expect(Array.isArray(pairs)).toBe(true);
    for (const pair of pairs) {
      expect(pair.reasons.length).toBeGreaterThan(0);
      expect(pair.score).toBeGreaterThan(0);
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(pair.confidence);
      // grouped by the same state, district and category
      expect(pair.workA.state).toBe(pair.workB.state);
      expect(pair.workA.district).toBe(pair.workB.district);
      expect(pair.workA.category).toBe(pair.workB.category);
    }
  });

  it('returns installment rows for a payments-present work and none otherwise', async () => {
    const projects = await provider.listProjects();
    const present = projects.find((p) => p.paymentDataState === 'FETCHED_PRESENT')!;
    const notFetched = projects.find((p) => p.paymentDataState === 'NOT_FETCHED')!;

    const rows = await provider.getProjectPayments(present.sourceWorkId);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].statusRaw).toBe('Payment Success');
    expect(typeof rows[0].amount.amount).toBe('number');

    expect(await provider.getProjectPayments(notFetched.sourceWorkId)).toEqual([]);
    expect(await provider.getProjectPayments(-1)).toEqual([]);
  });

  it('records a submitted grievance and lists it back', async () => {
    const before = await provider.listGrievances();

    const saved = await provider.submitGrievance({
      workReference: 900_000_002,
      category: 'Delay in execution',
      subject: 'Work stalled',
      description: 'Nothing has happened on site for months.',
      contactName: null,
      contactEmail: null,
    });

    expect(saved.id).toBeTruthy();
    expect(saved.status).toBe('SUBMITTED');
    expect(Number.isNaN(Date.parse(saved.submittedAt))).toBe(false);

    const after = await provider.listGrievances();
    expect(after.length).toBe(before.length + 1);
    expect(after[0].id).toBe(saved.id);
    expect(after[0].subject).toBe('Work stalled');
    expect(saved.status).toBe('SUBMITTED');
    expect(saved.actionNote).toBeNull();
  });

  it('advances a grievance status and rejects an unknown id', async () => {
    const saved = await provider.submitGrievance({
      workReference: null,
      category: 'Other',
      subject: 'For review',
      description: 'Long enough description for the record to be valid here.',
      contactName: null,
      contactEmail: null,
    });

    const updated = await provider.updateGrievanceStatus(saved.id, {
      status: 'CLOSED',
      actionNote: 'Resolved with the district office.',
    });
    expect(updated.status).toBe('CLOSED');
    expect(updated.actionNote).toBe('Resolved with the district office.');

    const relisted = await provider.listGrievances();
    expect(relisted.find((g) => g.id === saved.id)?.status).toBe('CLOSED');

    await expect(
      provider.updateGrievanceStatus('no-such-id', { status: 'CLOSED' }),
    ).rejects.toThrow(/no grievance/i);
  });
});
