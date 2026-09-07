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
  signal?: AbortSignal,
): Promise<AuditEvidence> => apiClient.get(`/audit/${sourceWorkId}/photos`, { signal });
