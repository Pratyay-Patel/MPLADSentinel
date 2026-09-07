import type { AuditEvidence } from '../data/types';
import { apiClient } from './client';

/**
 * Backend call for the Audit Trail "Field Evidence" section
 * (`docs/inspections-audit-feature.md`). The Pinata JWT lives only on the
 * backend; this endpoint returns already-built IPFS gateway URLs. Any
 * government role may read it.
 */
export const getAuditPhotos = (
  sourceWorkId: number,
  limit?: number,
  signal?: AbortSignal,
): Promise<AuditEvidence> => {
  const query = limit != null ? `?limit=${limit}` : '';
  return apiClient.get(`/audit/${sourceWorkId}/photos${query}`, { signal });
};
