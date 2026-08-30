import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Project } from '../types';
import { ProviderError } from '../errors';
import { createApiDataProvider } from './ApiDataProvider';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

function stubFetch(...responses: Response[]): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn();
  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response);
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const WORK: Project = {
  sourceName: 'EMPOWERED_INDIAN',
  sourceWorkId: 900000001,
  workDescription: 'CC road',
  category: 'Roads',
  house: 'LOK_SABHA',
  lsTerm: 18,
  mpName: 'Test MP',
  constituency: 'Somewhere',
  state: 'Kerala',
  district: 'Ernakulam',
  locationRaw: 'Ward 4',
  estimatedCost: { amount: 2500000, currency: 'INR' },
  finalCost: null,
  recommendedOn: '2026-01-20',
  recommendedYear: 2026,
  completedOn: null,
  completionYear: null,
  sourceStatusRaw: 'Recommended',
  expectedBeneficiaries: 1200,
  seenInRecommended: true,
  seenInCompleted: false,
  lifecycleState: 'RECOMMENDED',
  paymentDataState: 'FETCHED_PRESENT',
  recordedPayments: { amount: 1200000, currency: 'INR' },
  paymentInstallments: 2,
  dataQualityFlags: ['HI_FIELDS_MIRROR_EN'],
};

const PUBLIC_WORK = {
  reference: 900000001,
  workDescription: 'CC road',
  category: 'Roads',
  state: 'Kerala',
  district: 'Ernakulam',
  location: 'Ward 4',
  house: 'LOK_SABHA',
  lsTerm: 18,
  memberOfParliament: 'Test MP',
  constituency: 'Somewhere',
  estimatedCost: { amount: 2500000, currency: 'INR' },
  finalCost: null,
  status: 'RECOMMENDED',
  sourceStatus: 'Recommended',
  expectedBeneficiaries: 1200,
  recommendedOn: '2026-01-20',
  recommendedYear: 2026,
  completedOn: null,
  completionYear: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ApiDataProvider', () => {
  const provider = createApiDataProvider();

  it('identifies itself as the api source', () => {
    expect(provider.source).toBe('api');
  });

  it('serves getBackendHealth through the centralized API client', async () => {
    const fetchMock = stubFetch(
      jsonResponse({ status: 'UP', service: 'mpladsentinel-backend', timestamp: 't' }),
    );

    const health = await provider.getBackendHealth();

    expect(health).toEqual({ status: 'UP', service: 'mpladsentinel-backend' });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/health');
  });

  // --- works read APIs (Phase B2) -----------------------------------

  it('listProjects fetches /api/works and normalises the rows', async () => {
    const fetchMock = stubFetch(jsonResponse([WORK, { ...WORK, dataQualityFlags: undefined }]));

    const rows = await provider.listProjects();

    expect(fetchMock.mock.calls[0][0]).toBe('/api/works');
    expect(rows[0].sourceWorkId).toBe(900000001);
    expect(rows[0].estimatedCost).toEqual({ amount: 2500000, currency: 'INR' });
    expect(rows[1].dataQualityFlags).toEqual([]); // normalised from undefined
  });

  it('getProject fetches /api/works/:id and returns null on 404', async () => {
    stubFetch(jsonResponse(WORK));
    expect((await provider.getProject(900000001))?.sourceWorkId).toBe(900000001);

    stubFetch(jsonResponse({ message: 'not found' }, { status: 404 }));
    expect(await provider.getProject(42)).toBeNull();
  });

  it('getProjectSummary fetches /api/works/summary', async () => {
    const summary = {
      totalProjects: 3,
      byLifecycleState: { RECOMMENDED: 2, COMPLETED: 1, RECOMMENDED_AND_COMPLETED: 0 },
      byPaymentDataState: { NOT_FETCHED: 1, FETCHED_PRESENT: 1, FETCHED_ABSENT: 1, FETCH_ERROR: 0 },
      totalEstimatedCost: { amount: 3300000, currency: 'INR' },
      totalRecordedPayments: { amount: 1200000, currency: 'INR' },
    };
    const fetchMock = stubFetch(jsonResponse(summary));

    expect(await provider.getProjectSummary()).toEqual(summary);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/works/summary');
  });

  it('getProjectPayments fetches the payments sub-resource and returns [] on 404', async () => {
    const rows = [
      { ordinal: 0, amount: { amount: 700000, currency: 'INR' }, paidOn: '2026-02-01', vendorName: 'V', statusRaw: 'Payment Success', implementingAuthorityText: null },
    ];
    const fetchMock = stubFetch(jsonResponse(rows));
    expect(await provider.getProjectPayments(900000001)).toEqual(rows);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/works/900000001/payments');

    stubFetch(jsonResponse({}, { status: 404 }));
    expect(await provider.getProjectPayments(42)).toEqual([]);
  });

  it('listPublicProjects fetches /api/public/works', async () => {
    const fetchMock = stubFetch(jsonResponse([PUBLIC_WORK]));

    const rows = await provider.listPublicProjects();

    expect(fetchMock.mock.calls[0][0]).toBe('/api/public/works');
    expect(rows[0].reference).toBe(900000001);
    expect('dataQualityFlags' in rows[0]).toBe(false);
  });

  it('getPublicProject fetches /api/public/works/:id and returns null on 404', async () => {
    stubFetch(jsonResponse(PUBLIC_WORK));
    expect((await provider.getPublicProject(900000001))?.reference).toBe(900000001);

    stubFetch(jsonResponse({}, { status: 404 }));
    expect(await provider.getPublicProject(42)).toBeNull();
  });

  // --- risk (Phase B3) --------------------------------------------

  it('listProjectRisks fetches /api/works/risk and keys it by sourceWorkId', async () => {
    const fetchMock = stubFetch(
      jsonResponse([
        { sourceWorkId: 900000001, level: 'HIGH', score: 90, reasons: ['x'], assessedAt: 't' },
        { sourceWorkId: 900000002, level: 'LOW', score: 0, reasons: [], assessedAt: 't' },
      ]),
    );

    const byId = await provider.listProjectRisks();

    expect(fetchMock.mock.calls[0][0]).toBe('/api/works/risk');
    expect(byId[900000001].level).toBe('HIGH');
    expect(byId[900000002].score).toBe(0);
  });

  it('getProjectRisk fetches /api/works/:id/risk and returns null on 404', async () => {
    stubFetch(
      jsonResponse({ sourceWorkId: 900000001, level: 'MEDIUM', score: 30, reasons: ['y'], assessedAt: 't' }),
    );
    expect((await provider.getProjectRisk(900000001))?.level).toBe('MEDIUM');

    stubFetch(jsonResponse({}, { status: 404 }));
    expect(await provider.getProjectRisk(42)).toBeNull();
  });

  it('maps a backend error status to a ProviderError of kind "unavailable"', async () => {
    stubFetch(jsonResponse({ error: 'down' }, { status: 503 }));

    const error = await provider.listProjects().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).kind).toBe('unavailable');
  });

  it('maps a transport failure to a ProviderError of kind "network"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));

    const error = await provider.listPublicProjects().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).kind).toBe('network');
  });

  // --- not yet wired ----------------------------------------------

  it.each([
    ['listGrievances', () => provider.listGrievances()],
    [
      'submitGrievance',
      () =>
        provider.submitGrievance({
          workReference: null,
          category: 'Other',
          subject: 's',
          description: 'd',
          contactName: null,
          contactEmail: null,
        }),
    ],
    ['updateGrievanceStatus', () => provider.updateGrievanceStatus('x', { status: 'CLOSED' })],
  ] as const)(
    'rejects %s with a notImplemented ProviderError (no backend endpoint yet)',
    async (_name, call) => {
      const error = await call().catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ProviderError);
      expect((error as ProviderError).kind).toBe('notImplemented');
    },
  );
});
