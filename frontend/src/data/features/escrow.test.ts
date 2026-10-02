import { describe, expect, it, vi } from 'vitest';

import type { DataProvider } from '../DataProvider';
import { createDemoDataProvider } from '../demo/DemoDataProvider';
import { ProviderError } from '../errors';
import type { FundRequest, Project, RiskLevel } from '../types';
import { createEscrowService, pickRiskBalancedSample, type EscrowWorkOption } from './escrow';

let workSeq = 0;

function workOption(level: RiskLevel, score: number | null = null): EscrowWorkOption {
  workSeq += 1;
  const project: Project = {
    sourceName: 'EMPOWERED_INDIAN',
    sourceWorkId: 900_000_000 + workSeq,
    workDescription: `Work ${workSeq}`,
    category: null,
    house: null,
    lsTerm: null,
    mpName: null,
    constituency: null,
    state: null,
    district: null,
    locationRaw: null,
    estimatedCost: null,
    finalCost: null,
    recommendedOn: null,
    recommendedYear: null,
    completedOn: null,
    completionYear: null,
    sourceStatusRaw: null,
    expectedBeneficiaries: null,
    seenInRecommended: true,
    seenInCompleted: false,
    lifecycleState: 'RECOMMENDED',
    paymentDataState: 'NOT_FETCHED',
    recordedPayments: null,
    paymentInstallments: null,
    dataQualityFlags: [],
  };
  return {
    project,
    risk: { sourceWorkId: project.sourceWorkId, level, score, reasons: [], assessedAt: null },
  };
}

function fundRequest(overrides: Partial<FundRequest> = {}): FundRequest {
  return {
    id: 'fr-1',
    sourceWorkId: 900_000_001,
    workTitle: 'Construction of a community hall',
    district: 'Jaipur',
    requestedByUsername: 'district',
    requestedByName: 'District Officer',
    requestedAmount: 100_000,
    remarks: null,
    createdAt: '2026-01-01T00:00:00Z',
    sanctionedAmount: 1_000_000,
    alreadyReleased: 0,
    remainingBeforeRequest: 1_000_000,
    remainingAfterRequest: 900_000,
    riskLevel: 'LOW',
    riskReasons: [],
    status: 'APPROVED',
    decisionReason: 'Within funds and not HIGH risk.',
    decidedAt: '2026-01-01T00:00:00Z',
    releaseNoticeSent: false,
    releaseNoticeByName: null,
    releaseNoticeAt: null,
    updatedAt: '2026-01-01T00:00:00Z',
    history: [],
    ...overrides,
  };
}

describe('createEscrowService', () => {
  it('summarizes an APPROVED and REJECTED request into the right tallies', async () => {
    const approved = fundRequest({ id: 'fr-1', status: 'APPROVED', requestedAmount: 100_000, releaseNoticeSent: true });
    const rejected = fundRequest({ id: 'fr-2', status: 'REJECTED', requestedAmount: 50_000 });
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listFundRequests: vi.fn().mockResolvedValue([approved, rejected]),
    };

    const { requests, summary } = await createEscrowService(provider).load();

    expect(requests).toEqual([approved, rejected]);
    expect(summary).toEqual({
      totalRequests: 2,
      approved: 1,
      rejected: 1,
      releaseNoticesSent: 1,
      totalRequestedAmount: 150_000,
      totalApprovedAmount: 100_000,
    });
  });

  it('propagates a listFundRequests failure', async () => {
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      listFundRequests: vi.fn().mockRejectedValue(new ProviderError('unavailable', 'backend down')),
    };
    await expect(createEscrowService(provider).load()).rejects.toThrow('backend down');
  });

  it('delegates get/createRequest/sendReleaseNotice to the provider', async () => {
    const request = fundRequest();
    const provider: DataProvider = {
      ...createDemoDataProvider(),
      getFundRequest: vi.fn().mockResolvedValue(request),
      createFundRequest: vi.fn().mockResolvedValue(request),
      sendFundReleaseNotice: vi.fn().mockResolvedValue({ ...request, releaseNoticeSent: true }),
    };
    const service = createEscrowService(provider);

    expect(await service.get('fr-1')).toBe(request);
    expect(provider.getFundRequest).toHaveBeenCalledWith('fr-1', undefined);

    const input = { sourceWorkId: 900_000_001, requestedAmount: 100_000, remarks: null };
    expect(await service.createRequest(input)).toBe(request);
    expect(provider.createFundRequest).toHaveBeenCalledWith(input, undefined);

    const sent = await service.sendReleaseNotice('fr-1');
    expect(sent.releaseNoticeSent).toBe(true);
    expect(provider.sendFundReleaseNotice).toHaveBeenCalledWith('fr-1', undefined);
  });

  it('rejects a demo fund request whose requested amount exceeds the remaining sanctioned funds', async () => {
    const service = createEscrowService(createDemoDataProvider());
    const saved = await service.createRequest({
      sourceWorkId: 900_000_004,
      requestedAmount: 999_999_999,
      remarks: null,
    });

    expect(saved.status).toBe('REJECTED');
    expect(saved.decisionReason).toMatch(/exceeds the remaining sanctioned funds/i);

    const { requests } = await service.load();
    expect(requests.some((r) => r.id === saved.id)).toBe(true);

    await expect(service.sendReleaseNotice(saved.id)).rejects.toThrow(/APPROVED/);
  });

  it('throws for a fund request against a work that does not exist', async () => {
    const service = createEscrowService(createDemoDataProvider());
    await expect(
      service.createRequest({ sourceWorkId: 1, requestedAmount: 1000, remarks: null }),
    ).rejects.toThrow(/no work/i);
  });

  it('lists every demo work paired with its current risk', async () => {
    const service = createEscrowService(createDemoDataProvider());
    const options = await service.listWorkOptions();

    expect(options).toHaveLength(14);
    for (const option of options) {
      expect(option.risk.sourceWorkId).toBe(option.project.sourceWorkId);
    }
    const levels = new Set(options.map((o) => o.risk.level));
    expect(levels.has('HIGH')).toBe(true);
  });
});

describe('pickRiskBalancedSample', () => {
  it('takes up to perLevel works from each risk level present', () => {
    const options = [
      workOption('LOW'),
      workOption('HIGH'),
      workOption('HIGH'),
      workOption('MEDIUM'),
    ];

    const sample = pickRiskBalancedSample(options, 1);

    expect(sample).toHaveLength(3);
    expect(sample.map((o) => o.risk.level)).toEqual(['HIGH', 'MEDIUM', 'LOW']);
  });

  it('never exceeds perLevel for a level with more candidates than the cap', () => {
    const options = [workOption('HIGH'), workOption('HIGH'), workOption('HIGH')];
    const sample = pickRiskBalancedSample(options, 2);
    expect(sample).toHaveLength(2);
  });

  it('orders each level by score descending', () => {
    const options = [workOption('HIGH', 40), workOption('HIGH', 90), workOption('HIGH', 65)];
    const sample = pickRiskBalancedSample(options, 3);
    expect(sample.map((o) => o.risk.score)).toEqual([90, 65, 40]);
  });

  it('produces an empty result for an empty input', () => {
    expect(pickRiskBalancedSample([], 10)).toEqual([]);
  });
});
