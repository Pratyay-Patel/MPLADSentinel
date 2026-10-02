import type { DataProvider } from '../DataProvider';
import type { FundRequest, FundRequestInput, Project, ProjectRisk, RiskLevel } from '../types';
import { loadProjectsWithRisk } from './projectsWithRisk';

/**
 * Feature-level service for Escrow & Fund Control (`/escrow`). Composes
 * `listFundRequests` into a flat list plus summary counts; the screen never
 * touches a provider or the demo fixtures directly.
 */
export interface FundRequestSummary {
  totalRequests: number;
  approved: number;
  rejected: number;
  releaseNoticesSent: number;
  totalRequestedAmount: number;
  totalApprovedAmount: number;
}

export interface EscrowData {
  requests: FundRequest[];
  summary: FundRequestSummary;
}

/** A work plus its current risk — one row in the create-request work picker. */
export interface EscrowWorkOption {
  project: Project;
  risk: ProjectRisk;
}

export interface EscrowService {
  load(signal?: AbortSignal): Promise<EscrowData>;
  get(id: string, signal?: AbortSignal): Promise<FundRequest | null>;
  createRequest(input: FundRequestInput, signal?: AbortSignal): Promise<FundRequest>;
  sendReleaseNotice(id: string, signal?: AbortSignal): Promise<FundRequest>;
  /** Every work + its current risk, for the create-request work picker. */
  listWorkOptions(signal?: AbortSignal): Promise<EscrowWorkOption[]>;
}

const LEVEL_SEVERITY_ORDER: RiskLevel[] = ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];

/**
 * Picks up to `perLevel` works from each risk level (HIGH, MEDIUM, LOW,
 * UNKNOWN — highest score first within a level), so the fund-request work
 * picker's default (no search) view always offers a work at every risk level
 * to test against, instead of an arbitrary slice that might happen to be all
 * LOW/UNKNOWN. Full-text search in the picker still searches every work, not
 * just this sample.
 */
export function pickRiskBalancedSample(
  options: EscrowWorkOption[],
  perLevel: number,
): EscrowWorkOption[] {
  const sample: EscrowWorkOption[] = [];
  for (const level of LEVEL_SEVERITY_ORDER) {
    const atLevel = options
      .filter((option) => option.risk.level === level)
      .sort((a, b) => (b.risk.score ?? 0) - (a.risk.score ?? 0));
    sample.push(...atLevel.slice(0, perLevel));
  }
  return sample;
}

function summarize(requests: FundRequest[]): FundRequestSummary {
  let approved = 0;
  let rejected = 0;
  let releaseNoticesSent = 0;
  let totalRequestedAmount = 0;
  let totalApprovedAmount = 0;
  for (const request of requests) {
    totalRequestedAmount += request.requestedAmount;
    if (request.status === 'APPROVED') {
      approved += 1;
      totalApprovedAmount += request.requestedAmount;
    } else {
      rejected += 1;
    }
    if (request.releaseNoticeSent) {
      releaseNoticesSent += 1;
    }
  }
  return { totalRequests: requests.length, approved, rejected, releaseNoticesSent, totalRequestedAmount, totalApprovedAmount };
}

export function createEscrowService(provider: DataProvider): EscrowService {
  return {
    async load(signal) {
      const requests = await provider.listFundRequests(signal);
      return { requests, summary: summarize(requests) };
    },
    get: (id, signal) => provider.getFundRequest(id, signal),
    createRequest: (input, signal) => provider.createFundRequest(input, signal),
    sendReleaseNotice: (id, signal) => provider.sendFundReleaseNotice(id, signal),
    async listWorkOptions(signal) {
      const { projects, risksByWorkId } = await loadProjectsWithRisk(provider, signal);
      return projects.map((project) => ({ project, risk: risksByWorkId[project.sourceWorkId] }));
    },
  };
}
