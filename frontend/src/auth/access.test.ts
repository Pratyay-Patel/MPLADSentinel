import { describe, expect, it } from 'vitest';

import {
  actionsGrievances,
  AREA_ROLES,
  assignsInspections,
  canAccess,
  reviewsGrievances,
} from './access';
import { ROLES } from './roles';

describe('canAccess', () => {
  it('lets every role into the public areas', () => {
    for (const role of ROLES) {
      expect(canAccess(role, 'citizen')).toBe(true);
      expect(canAccess(role, 'grievances')).toBe(true);
    }
  });

  it('keeps the Citizen role out of the authority areas', () => {
    expect(canAccess('CITIZEN', 'overview')).toBe(false);
    expect(canAccess('CITIZEN', 'projects')).toBe(false);
    expect(canAccess('CITIZEN', 'risk')).toBe(false);
    expect(canAccess('CITIZEN', 'inspections')).toBe(false);
    expect(canAccess('CITIZEN', 'audit')).toBe(false);
  });

  it('lets every authority role into the monitoring areas', () => {
    for (const role of ['MOSPI', 'STATE', 'DISTRICT', 'AUDITOR', 'MP'] as const) {
      expect(canAccess(role, 'overview')).toBe(true);
      expect(canAccess(role, 'projects')).toBe(true);
      expect(canAccess(role, 'risk')).toBe(true);
      expect(canAccess(role, 'inspections')).toBe(true);
      expect(canAccess(role, 'audit')).toBe(true);
    }
  });

  it('references only known roles in the access map', () => {
    for (const roles of Object.values(AREA_ROLES)) {
      for (const role of roles) {
        expect(ROLES).toContain(role);
      }
    }
  });
});

describe('grievance role split', () => {
  it('sends only the Citizen role to the submission form', () => {
    expect(reviewsGrievances('CITIZEN')).toBe(false);
    for (const role of ['MOSPI', 'STATE', 'DISTRICT', 'AUDITOR', 'MP'] as const) {
      expect(reviewsGrievances(role)).toBe(true);
    }
  });

  it('lets only MoSPI / State / District change a grievance status', () => {
    for (const role of ['MOSPI', 'STATE', 'DISTRICT'] as const) {
      expect(actionsGrievances(role)).toBe(true);
    }
    for (const role of ['AUDITOR', 'MP', 'CITIZEN'] as const) {
      expect(actionsGrievances(role)).toBe(false);
    }
  });
});

describe('assignsInspections', () => {
  it('lets only MoSPI / State / District assign and advance inspections', () => {
    for (const role of ['MOSPI', 'STATE', 'DISTRICT'] as const) {
      expect(assignsInspections(role)).toBe(true);
    }
    for (const role of ['AUDITOR', 'MP', 'CITIZEN'] as const) {
      expect(assignsInspections(role)).toBe(false);
    }
  });
});
