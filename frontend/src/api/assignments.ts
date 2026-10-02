import type {
  AssignmentInput,
  AssignmentPatch,
  FieldOfficer,
  InspectionAssignment,
  SignOffConfirmInput,
  SignOffRequestInput,
} from '../data/types';
import { apiClient } from './client';

/**
 * Backend calls for the inspection-assignment API
 * (`docs/inspections-audit-feature.md`). Response JSON matches the domain types
 * (`id` is a string on both sides); `ApiDataProvider` owns error mapping.
 *
 * RBAC is server-enforced: `GET` needs any government role; `POST` / `PATCH`
 * need MoSPI / State / District.
 */
export const getFieldOfficers = (signal?: AbortSignal): Promise<FieldOfficer[]> =>
  apiClient.get('/officers', { signal });

export const getAssignments = (signal?: AbortSignal): Promise<InspectionAssignment[]> =>
  apiClient.get('/assignments', { signal });

export const postAssignment = (
  input: AssignmentInput,
  signal?: AbortSignal,
): Promise<InspectionAssignment> => apiClient.post('/assignments', input, { signal });

export const patchAssignment = (
  id: string,
  patch: AssignmentPatch,
  signal?: AbortSignal,
): Promise<InspectionAssignment> => apiClient.patch(`/assignments/${id}`, patch, { signal });

/** Dual-authority sign-off, step 1 — see `AssignmentResponse.pending*` on the backend. */
export const requestSignOff = (
  id: string,
  input: SignOffRequestInput,
  signal?: AbortSignal,
): Promise<InspectionAssignment> =>
  apiClient.post(`/assignments/${id}/sign-off/request`, input, { signal });

/** Dual-authority sign-off, step 2 — a different authority than the requester. */
export const confirmSignOff = (
  id: string,
  input: SignOffConfirmInput,
  signal?: AbortSignal,
): Promise<InspectionAssignment> =>
  apiClient.post(`/assignments/${id}/sign-off/confirm`, input, { signal });
