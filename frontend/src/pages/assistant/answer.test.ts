import { describe, expect, it } from 'vitest';

import type {
  AssistantCategory,
  AssistantData,
  AssistantMp,
  AssistantState,
  AssistantWork,
} from '../../data';
import { answerQuestion } from './answer';

const zero = () => ({ HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 });

const works: AssistantWork[] = [
  {
    id: 900000002,
    title: 'Multipurpose community centre',
    description: 'Multipurpose community centre',
    state: 'Maharashtra',
    district: 'Pune',
    category: 'Trust and Society',
    mpName: 'R. B. Patil',
    estimatedCost: 1_800_000,
    recordedPayments: 1_960_000,
    riskLevel: 'HIGH',
    riskScore: 90,
    riskReasons: ['Recorded payments exceed the estimated cost by 9%'],
  },
  {
    id: 900000005,
    title: 'Drinking-water supply scheme',
    description: 'Drinking-water supply scheme',
    state: 'Kerala',
    district: 'Ernakulam',
    category: 'Normal/Others',
    mpName: 'K. G. Menon',
    estimatedCost: 2_600_000,
    recordedPayments: null,
    riskLevel: 'MEDIUM',
    riskScore: 45,
    riskReasons: ['Recommended 21 months ago with no payment records'],
  },
];

const mps: AssistantMp[] = [
  {
    name: 'R. B. Patil',
    state: 'Maharashtra',
    constituency: 'Pune',
    works: 4,
    completed: 1,
    utilisationPct: 108,
    band: 'High',
    risk: { HIGH: 2, MEDIUM: 1, LOW: 1, UNKNOWN: 0 },
    flagged: 3,
  },
  {
    name: 'K. G. Menon',
    state: 'Kerala',
    constituency: 'Ernakulam',
    works: 2,
    completed: 0,
    utilisationPct: 100,
    band: 'High',
    risk: { HIGH: 1, MEDIUM: 1, LOW: 0, UNKNOWN: 0 },
    flagged: 2,
  },
];

const states: AssistantState[] = [
  { state: 'Maharashtra', works: 3, utilisationPct: 108, band: 'High', risk: { HIGH: 2, MEDIUM: 1, LOW: 0, UNKNOWN: 0 }, flagged: 3 },
  { state: 'Kerala', works: 2, utilisationPct: 100, band: 'High', risk: { HIGH: 1, MEDIUM: 1, LOW: 0, UNKNOWN: 0 }, flagged: 2 },
  { state: 'Uttar Pradesh', works: 2, utilisationPct: 62, band: 'Moderate', risk: zero(), flagged: 0 },
];

const categories: AssistantCategory[] = [
  { category: 'Trust and Society', works: 2, risk: { HIGH: 2, MEDIUM: 0, LOW: 0, UNKNOWN: 0 }, flagged: 2 },
];

const data: AssistantData = {
  source: 'demo',
  totalWorks: 14,
  worksWithPayments: 6,
  recordedUtilisationPct: 92,
  riskCounts: { HIGH: 5, MEDIUM: 4, LOW: 3, UNKNOWN: 2 },
  flaggedWorks: 9,
  topFactors: [
    { label: 'Dormant, no payments', count: 4 },
    { label: 'Cost overspend', count: 3 },
  ],
  works,
  mps,
  states,
  categories,
  knownStates: ['Kerala', 'Maharashtra', 'Uttar Pradesh'],
  knownDistricts: ['Ernakulam', 'Pune'],
  knownCategories: ['Normal/Others', 'Trust and Society'],
  knownMps: ['K. G. Menon', 'R. B. Patil'],
};

describe('answerQuestion — methodology', () => {
  it('explains the scoring method from the fixed guide', () => {
    const r = answerQuestion('How is the risk score computed?', data);
    expect(r.text).toMatch(/weighted statistical model/i);
    expect(r.text).toMatch(/indicator for review, not proof/i);
  });

  it('answers "is high risk proof of fraud" with a clear no', () => {
    expect(answerQuestion('does a high risk score mean fraud?', data).text).toMatch(/^no\b/i);
  });

  it('defines a factor with its weight', () => {
    const r = answerQuestion('what does dormant, no payments mean?', data);
    expect(r.text).toMatch(/Dormant, no payments:/);
    expect(r.text).toMatch(/30 points/);
  });
});

describe('answerQuestion — work level', () => {
  it('summarises a work by its id', () => {
    const r = answerQuestion('tell me about work #900000002', data);
    expect(r.text).toMatch(/Multipurpose community centre/);
    expect(r.text).toMatch(/Pune, Maharashtra/);
    expect(r.link?.to).toBe('/projects/900000002');
  });

  it('explains why a work is flagged with its factors', () => {
    const r = answerQuestion('why is 900000002 flagged?', data);
    expect(r.text).toMatch(/is HIGH with a score of 90\/100/);
    expect(r.text).toMatch(/exceed the estimated cost by 9%/);
    expect(r.text).toMatch(/not proof of wrongdoing/i);
  });

  it('ignores a number that is not a real work id', () => {
    expect(answerQuestion('how many works were there in 2024', data).link?.to).not.toMatch(
      /\/projects\/2024/,
    );
  });

  it('ranks the most expensive works', () => {
    const r = answerQuestion('what are the most expensive works?', data);
    expect(r.text).toMatch(/#900000005 Drinking-water supply scheme \(₹26 L\)/);
    expect(r.text).toMatch(/#900000002/);
  });

  it('counts works over an amount', () => {
    const r = answerQuestion('how many works cost more than 20 lakh?', data);
    expect(r.text).toMatch(/1 of 14 works/);
    expect(r.text).toMatch(/₹20 L or more/);
  });
});

describe('answerQuestion — MP level', () => {
  it('summarises an MP by name (surname is enough)', () => {
    const r = answerQuestion('how has patil done?', data);
    expect(r.text).toMatch(/R\. B\. Patil/);
    expect(r.text).toMatch(/4 works, 1 completed/);
    expect(r.text).toMatch(/utilisation 108%/i);
    expect(r.link?.to).toBe('/compare');
  });

  it('names the MPs with the most flagged works', () => {
    const r = answerQuestion('which MP has the most flagged works?', data);
    expect(r.text).toMatch(/R\. B\. Patil \(3\)/);
    expect(r.text).toMatch(/not findings against the MP/i);
  });
});

describe('answerQuestion — state / district / category', () => {
  it('summarises a state', () => {
    const r = answerQuestion('give me a summary of Kerala', data);
    expect(r.text).toMatch(/Kerala: 2 works in view/);
    expect(r.text).toMatch(/utilisation 100%/i);
    expect(r.link?.to).toBe('/risk?state=Kerala');
  });

  it('counts works in a district', () => {
    const r = answerQuestion('how many works in Pune?', data);
    expect(r.text).toMatch(/Pune: 1 works/);
  });

  it('summarises a category', () => {
    const r = answerQuestion('how many Trust and Society works?', data);
    expect(r.text).toMatch(/Trust and Society: 2 works/);
  });
});

describe('answerQuestion — aggregates & fallback', () => {
  it('ranks lowest-utilisation states', () => {
    const r = answerQuestion('which states have the lowest fund utilisation?', data);
    expect(r.text).toMatch(/Uttar Pradesh \(62%\)/);
    expect(r.link?.to).toBe('/analytics');
  });

  it('reports the flagged-works breakdown', () => {
    const r = answerQuestion('how many works are flagged?', data);
    expect(r.text).toMatch(/9 works are flagged/);
    expect(r.text).toMatch(/5 HIGH and 4 MEDIUM/);
  });

  it('falls back for an unrecognised question', () => {
    const r = answerQuestion('what is the weather today?', data);
    expect(r.text).toMatch(/I answer from this portal/i);
    expect(r.link).toBeUndefined();
  });
});
